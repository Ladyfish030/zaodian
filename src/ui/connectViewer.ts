import { createViewer } from '../viewer/createViewer';
import type { ViewerUpdate } from '../viewer/createViewer';
import type { ViewName } from '../viewer/cameraControls';
import type { DesignState } from '../design/designTypes';
import type { PartDefinition } from '../parts/assetManifest';
import { getViewerConfig } from '../viewer/viewerConfig';
import { connectFabrics } from './connectFabrics';
import { getAssetCatalog } from '../viewer/assetCatalog';

export function connectViewer(root: HTMLElement, state: DesignState): () => void {
  const viewport = root.querySelector<HTMLElement>('#viewport')!;
  const modelSelect = root.querySelector<HTMLSelectElement>('.model-picker select')!;
  const status = root.querySelector<HTMLElement>('.viewer-status')!;
  const overlay = root.querySelector<HTMLElement>('.viewport-placeholder')!;
  const heading = overlay.querySelector('h3')!;
  const message = overlay.querySelector('p')!;
  const note = overlay.querySelector<HTMLElement>('.model-note')!;
  const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'retry-button'; retry.textContent = '重新加载'; retry.hidden = true; overlay.append(retry);
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('.view-buttons button')];
  const metadata = root.querySelector<HTMLElement>('.empty-panel')!;
  metadata.classList.add('part-content');
  const foot = root.querySelector<HTMLElement>('.panel-foot')!; foot.setAttribute('role', 'status');
  const selectionCard = root.querySelector<HTMLElement>('.selection-card')!;
  const selectedLabel = selectionCard.querySelector<HTMLElement>('.selected-label')!;
  const selectedId = selectionCard.querySelector<HTMLElement>('.selected-id')!;
  const deselect = selectionCard.querySelector<HTMLButtonElement>('button')!;
  let partButtons: HTMLButtonElement[] = [];
  const debug = document.createElement('pre'); debug.className = 'registration-debug'; debug.hidden = !getViewerConfig().debug;
  root.querySelector('.parts-panel')!.append(debug);

  let viewer: ReturnType<typeof createViewer> | undefined;
  const fabrics = connectFabrics(root,state,() => viewer);
  const selected = (part: PartDefinition | null) => {
    viewport.dataset.selectedPart = part?.id ?? '';
    partButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.partId === part?.id)));
    foot.replaceChildren(document.createElement('span'), document.createTextNode(part ? `已选中 · ${part.label}` : '当前无选中部件'));
    foot.firstElementChild!.className = 'small-dot';
    selectedLabel.textContent = part?.label ?? '请选择一个部件';
    selectedId.textContent = part?.id ?? '点击左侧列表或模型上的裁片';
    deselect.disabled = !part;
    selectionCard.classList.toggle('has-selection', !!part);
    debug.dataset.selectedPart = part?.id ?? '';
    fabrics.refresh();
  };
  const update = (event: ViewerUpdate) => {
    state.viewerStatus = event.status; viewport.dataset.status = event.status;
    if (event.status !== 'ready') delete root.dataset.assetId;
    status.replaceChildren(document.createElement('span'), document.createTextNode(event.status === 'ready' ? '模型与部件已就绪' : event.status === 'loading' ? '正在加载模型' : '模型加载失败'));
    overlay.hidden = event.status === 'ready'; retry.hidden = event.status !== 'error';
    heading.textContent = event.status === 'error' ? '模型暂时无法载入' : '正在准备你的模型'; message.textContent = event.message;
    note.textContent = event.status === 'error' ? '请检查资产文件与部件契约后重试' : '正在校验模型与部件映射';
    buttons.forEach(button => { button.disabled = event.status !== 'ready'; button.title = event.status === 'ready' ? '切换模型视角' : '模型加载成功后可用'; });
    if (!event.details) {
      partButtons = []; metadata.replaceChildren();
      const text = document.createElement('p'); text.textContent = event.status === 'loading' ? '正在核对部件…' : '部件暂不可用，请检查模型加载信息。'; metadata.append(text);
      debug.textContent = event.message; selected(null); return;
    }
    const details = event.details;
    root.dataset.assetId = details.assetId;
    metadata.replaceChildren();
    const summary = document.createElement('div'); summary.className = 'part-summary';
    summary.textContent = `${details.parts.length} 个可选部件 · ${details.triangles} 个三角形`;
    const dimensions = document.createElement('small'); dimensions.textContent = details.dimensions.map(n => Math.round(n * 1000)).join(' × ') + ' mm（整体尺寸）';
    summary.append(dimensions);
    const list = document.createElement('ul'); list.className = 'part-list'; list.setAttribute('aria-label', '可配置部件');
    partButtons = details.parts.map((part, index) => {
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button'; button.dataset.partId = part.id; button.className = 'part-button'; button.setAttribute('aria-pressed', 'false');
      const number = document.createElement('span'); number.className = 'part-number'; number.textContent = String(index + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span'); label.className = 'part-label'; label.textContent = part.label;
      const id = document.createElement('small'); id.textContent = part.id;
      label.append(id); button.append(number, label); li.append(button); list.append(li); return button;
    });
    const version = document.createElement('span'); version.className = 'part-version'; version.textContent = `测试资产 v${details.assetVersion}`;
    metadata.append(summary, list, version);
    debug.textContent = JSON.stringify({ assetVersion: details.assetVersion, meshCount: details.meshNames.length, registeredParts: details.parts.length, mapping: details.parts.map(part => ({ id: part.id, nodeName: part.nodeName })) }, null, 2);
    selected(null);
  };
  try { viewer = createViewer(viewport, update, { state, onSelection: selected, onFabricChange: () => fabrics.refresh() }); }
  catch (error) { update({ status: 'error', message: '无法初始化 WebGL：' + (error instanceof Error ? error.message : String(error)) }); retry.hidden = true; return () => { debug.remove(); fabrics.dispose(); }; }
  const debugHost = window as Window & { __ZAODIAN_DEBUG__?: { diagnostics: typeof viewer.diagnostics } };
  if (getViewerConfig().debug) debugHost.__ZAODIAN_DEBUG__ = { diagnostics: viewer.diagnostics };
  const handleView = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    viewer?.setView(button.textContent as ViewName);
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  };
  const handlePart = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-part-id]');
    if (button && metadata.contains(button)) viewer?.selectPart(button.dataset.partId!);
  };
  const clearSelection = () => viewer?.selectPart(null);
  const reload = () => { void viewer?.load(); };
  const changeModel = () => {
    const asset = getAssetCatalog().find(item => item.id === modelSelect.value);
    if (!asset) return;
    const url = new URL(location.href); url.searchParams.set('asset',asset.id); history.replaceState(history.state,'',url);
    root.querySelector('#viewer-title')!.textContent = asset.label+'工作台';
    buttons.forEach(button => button.setAttribute('aria-pressed','false'));
    void viewer?.load(asset.manifestUrl);
  };
  modelSelect.addEventListener('change',changeModel);
  root.querySelector('.view-buttons')!.addEventListener('click', handleView);
  metadata.addEventListener('click', handlePart); deselect.addEventListener('click', clearSelection);
  retry.addEventListener('click', reload);
  const unload = (event: PageTransitionEvent) => { if (!event.persisted) viewer?.dispose(); }; window.addEventListener('pagehide', unload);
  void viewer.load();
  return () => { modelSelect.removeEventListener('change',changeModel); window.removeEventListener('pagehide', unload); root.querySelector('.view-buttons')?.removeEventListener('click', handleView); metadata.removeEventListener('click', handlePart); deselect.removeEventListener('click', clearSelection); retry.removeEventListener('click', reload); viewer?.dispose(); fabrics.dispose(); debug.remove(); if (debugHost.__ZAODIAN_DEBUG__?.diagnostics === viewer?.diagnostics) delete debugHost.__ZAODIAN_DEBUG__; };
}

