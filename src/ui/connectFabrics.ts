import { FABRIC_CATALOG } from '../materials/fabricCatalog';
import type { DesignState } from '../design/designTypes';
import type { createViewer } from '../viewer/createViewer';

export function connectFabrics(root: HTMLElement, state: DesignState, getViewer: () => ReturnType<typeof createViewer> | undefined) {
  const grid = root.querySelector<HTMLElement>('.fabric-grid')!;
  const status = root.querySelector<HTMLElement>('.fabric-status')!;
  const current = root.querySelector<HTMLElement>('.selected-fabric')!;
  const restore = root.querySelector<HTMLButtonElement>('.material-action button')!;
  const names = new Map(FABRIC_CATALOG.map(fabric => [fabric.id,fabric.name]));
  const displayCatalog = [...FABRIC_CATALOG].sort((a,b) => Number(!!b.source)-Number(!!a.source));
  root.querySelector('.fabric-heading span')!.textContent = FABRIC_CATALOG.length+' 种布料';
  const origin = document.createElement('small'); origin.className = 'fabric-origin'; current.after(origin);
  const buttons = displayCatalog.map(fabric => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'fabric-button'; button.dataset.fabricId = fabric.id; button.disabled = true;
    button.setAttribute('aria-label',`应用${fabric.name}`); button.setAttribute('aria-pressed','false');
    const image = document.createElement('img'); image.src = fabric.thumbnailUrl; image.alt = ''; image.width = 128; image.height = 128;
    const name = document.createElement('strong'); name.textContent = fabric.name;
    const description = document.createElement('small'); description.textContent = fabric.description;
    button.append(image,name,description); grid.append(button); return button;
  });
  function refresh() {
    const viewer = getViewer(), id = state.selectedPartId;
    const details = viewer?.fabricDiagnostics();
    const enabled = !!id && state.viewerStatus === 'ready';
    const fabricId = id ? state.fabricByPart[id] : undefined;
    const pending = id ? details?.pendingByPart[id] : undefined;
    const error = id ? details?.errors[id] : undefined;
    buttons.forEach(button => { button.disabled = !enabled; button.setAttribute('aria-pressed',String(!!fabricId && button.dataset.fabricId === fabricId)); button.dataset.loading = String(!!pending && button.dataset.fabricId === pending); });
    restore.disabled = !enabled || (!fabricId && !pending);
    restore.title = !enabled ? '先选择一个部件' : '恢复本部件或明确联动组的初始材质';
    current.textContent = fabricId ? `当前布料 · ${names.get(fabricId) ?? fabricId}` : '当前材质 · 模型默认';
    const fabric = FABRIC_CATALOG.find(item => item.id === fabricId);
    origin.textContent = fabric?.materialNote ?? (fabricId ? '程序生成测试纹理' : '');
    status.dataset.status = error ? 'error' : pending ? 'loading' : 'idle';
    status.textContent = !enabled ? '先选择一个部件，再选择布料。' : error ? `换布失败，保留当前材质。${error}` : pending ? `正在加载${names.get(pending) ?? pending}…可继续选择其他布料。` : fabricId ? `已应用${names.get(fabricId) ?? fabricId}，可随时恢复默认。` : '选择一种布料，预览在当前部件上的效果。';
  }
  const apply = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-fabric-id]');
    const id = state.selectedPartId, viewer = getViewer();
    if (!button || button.disabled || !id || !viewer) return;
    // Capture the target now; later selection changes must not redirect this request.
    void viewer.applyFabric(id,button.dataset.fabricId!).catch(error => { status.dataset.status = 'error'; status.textContent = error instanceof Error ? error.message : String(error); });
  };
  const reset = () => { const id = state.selectedPartId; if (id) getViewer()?.restoreDefault(id); };
  grid.addEventListener('click',apply); restore.addEventListener('click',reset); refresh();
  return { refresh, dispose() { grid.removeEventListener('click',apply); restore.removeEventListener('click',reset); grid.replaceChildren(); origin.remove(); } };
}
