import { AmbientLight, Box3, Color, DirectionalLight, Group, Mesh, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer, ACESFilmicToneMapping } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel } from './loadModel';
import { disposeObject } from './dispose';
import { fitCamera } from './cameraControls';
import type { ViewName } from './cameraControls';
import { getViewerConfig } from './viewerConfig';
import { createPartRegistry } from '../parts/partRegistry';
import type { PartRegistry } from '../parts/partRegistry';
import type { PartDefinition } from '../parts/assetManifest';
import { createHighlighter } from '../parts/highlight';
import { createPartSelection } from '../parts/selectPart';
import type { SelectionState } from '../parts/selectPart';
import { bindPointerSelection, pickPart } from '../parts/pointerSelection';
import { createFabricController } from '../materials/applyFabric';

export interface ViewerUpdate { status: 'loading' | 'ready' | 'error'; message: string; details?: { assetVersion: string; dimensions: number[]; meshNames: string[]; triangles: number; parts: PartDefinition[]; assetId: string }; }

export function createViewer(container: HTMLElement, onUpdate: (event: ViewerUpdate) => void, options: { state?: SelectionState & { fabricByPart?: Record<string,string> }; onSelection?: (part: PartDefinition | null) => void; onFabricChange?: () => void } = {}) {
  const config = getViewerConfig(), scene = new Scene();
  scene.background = new Color('#efefe7');
  const camera = new PerspectiveCamera(config.camera.fov, 1, config.camera.near, config.camera.far);
  camera.position.copy(config.camera.position);
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, config.maxPixelRatio));
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.domElement.className = 'model-canvas'; renderer.domElement.setAttribute('aria-label', '三维模型，可拖动旋转或滚轮缩放');
  renderer.domElement.tabIndex = 0;
  container.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false; controls.enablePan = false;
  controls.target.copy(config.camera.target); controls.update();
  scene.add(new AmbientLight(config.lighting.color, config.lighting.ambientIntensity));
  const key = new DirectionalLight(config.lighting.color, config.lighting.directionalIntensity); key.position.set(1.5, 2, 3); scene.add(key);
  const fill = new DirectionalLight(0xffffff, 1); fill.position.set(-2, 1, -2); scene.add(fill);
  let modelRoot: Group | null = null, bounds: Box3 | null = null, disposed = false, sequence = 0, controller: AbortController | null = null;
  let view: ViewName = '默认';
  let currentManifestUrl = config.manifestUrl;
  let currentAssetId: string | null = null;
  let registry: PartRegistry | null = null;
  let selection: ReturnType<typeof createPartSelection> | null = null;
  const selectionState = options.state ?? { selectedPartId: null };
  const highlighter = createHighlighter();
  let fabricController: ReturnType<typeof createFabricController> | null = null;
  const fabricState = { fabricByPart: options.state?.fabricByPart ?? {} };
  const render = () => { if (!disposed && container.clientWidth && container.clientHeight) renderer.render(scene, camera); };
  controls.addEventListener('change', render);
  const selectPart = (id: string | null) => {
    if (disposed) return;
    if (!selection) { if (id !== null) throw new Error('部件尚未注册'); return; }
    selection.selectPart(id);
  };
  const unbindSelection = bindPointerSelection(renderer.domElement, (x, y) => { if (registry) selectPart(pickPart(registry, camera, renderer.domElement, x, y)); }, () => selectPart(null));
  const setView = (name: ViewName) => { if (!bounds || disposed) return; view = name; fitCamera(camera, controls, bounds, name); render(); };
  const resize = () => {
    const width = container.clientWidth, height = container.clientHeight;
    if (disposed || !width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, config.maxPixelRatio)); renderer.setSize(width, height, false);
    if (bounds) fitCamera(camera, controls, bounds, view);
    render();
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  const contextLost = (event: Event) => { event.preventDefault(); if (!disposed) onUpdate({ status: 'error', message: '图形上下文已丢失，请刷新页面恢复。' }); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const clearModel = () => { selection?.selectPart(null); highlighter.clear(); fabricController?.dispose(); fabricController = null; selection = null; registry = null; currentAssetId = null; selectionState.selectedPartId = null; options.onSelection?.(null); if (modelRoot) { disposeObject(modelRoot); modelRoot = null; } bounds = null; renderer.renderLists.dispose(); };

  async function load(url = currentManifestUrl): Promise<void> {
    if (disposed) return;
    currentManifestUrl = url;
    const token = ++sequence;
    controller?.abort(); controller = new AbortController();
    clearModel(); render(); onUpdate({ status: 'loading', message: '正在加载测试模型…' });
    let candidate: Group | null = null;
    try {
      const result = await loadModel(url, controller.signal);
      candidate = result.model;
      if (disposed || token !== sequence) { disposeObject(candidate); return; }
      const rawBounds = new Box3().setFromObject(candidate), size = rawBounds.getSize(new Vector3());
      if (rawBounds.isEmpty() || !size.toArray().every(n => Number.isFinite(n) && n > 0)) throw new Error('GLB 包围盒无效或为空');
      const expected = result.manifest.dimensionsMm;
      if (size.toArray().some((value, i) => Math.abs(value * 1000 - [expected.width, expected.height, expected.depth][i]!) > 1)) throw new Error('GLB 实际尺寸与 manifest 不一致，请检查单位与导出');
      const nextRegistry = createPartRegistry(candidate, result.manifest);
      const wrapper = new Group(); wrapper.name = 'ZAODIAN_DISPLAY_ROOT';
      wrapper.add(candidate); wrapper.position.copy(rawBounds.getCenter(new Vector3())).negate();
      const names: string[] = []; let triangles = 0;
      candidate.traverse(object => { if (object instanceof Mesh) { names.push(object.name); triangles += (object.geometry.index?.count ?? object.geometry.attributes.position!.count) / 3; } });
      scene.add(wrapper); modelRoot = wrapper; candidate = null;
      registry = nextRegistry;
      currentAssetId = result.manifest.assetId;
      fabricController = createFabricController(registry,fabricState,{ anisotropy: renderer.capabilities.getMaxAnisotropy(), onChange: () => { render(); options.onFabricChange?.(); } });
      selection = createPartSelection(registry, selectionState, part => { highlighter.show(part?.object ?? null); render(); options.onSelection?.(part?.definition ?? null); });
      bounds = new Box3().setFromObject(wrapper); view = '默认'; resize();
      onUpdate({ status: 'ready', message: '测试模型已载入', details: { assetVersion: result.manifest.assetVersion, dimensions: size.toArray(), meshNames: names, triangles, parts: [...registry.byId.values()].map(part => part.definition), assetId: result.manifest.assetId } });
    } catch (error) {
      if (candidate) disposeObject(candidate);
      if (disposed || token !== sequence) return;
      clearModel(); render();
      onUpdate({ status: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true; sequence++; controller?.abort(); observer.disconnect();
    unbindSelection(); controls.removeEventListener('change', render); controls.dispose();
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    clearModel(); renderer.setAnimationLoop(null); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); scene.clear();
  }
  function fabricDiagnostics(): ReturnType<ReturnType<typeof createFabricController>['diagnostics']> {
    return fabricController?.diagnostics() ?? { applied: {}, pendingByPart: {}, errors: {}, cache: { entries: 0, loaded: 0, references: 0 } };
  }
  async function applyFabric(partId: string, fabricId: string) {
    if (!fabricController || disposed) throw new Error('模型与部件尚未就绪');
    return fabricController.applyFabric(partId,fabricId);
  }
  function restoreDefault(partId: string) { fabricController?.restoreDefault(partId); }
  function diagnostics() {
    const corners: number[][] = [];
    if (bounds) for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) corners.push(new Vector3(x, y, z).project(camera).toArray());
    return { disposed, assetId: currentAssetId, manifestUrl: currentManifestUrl, hasModel: !!modelRoot, fabric: fabricDiagnostics(), registeredPartCount: registry?.byId.size ?? 0, registeredPartIds: registry ? [...registry.byId.keys()] : [], selectedPartId: selectionState.selectedPartId, view, camera: camera.position.toArray(), cameraTarget: controls.target.toArray(), aspect: camera.aspect, fov: camera.fov, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, calls: renderer.info.render.calls, corners };
  }
  return { load, setView, selectPart, applyFabric, restoreDefault, fabricDiagnostics, dispose, diagnostics };
}

