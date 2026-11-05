import type { PartRegistry, RegisteredPart } from './partRegistry';

export interface SelectionState { selectedPartId: string | null; }

/** Both canvas and list use this one state transition. */
export function createPartSelection(registry: PartRegistry, state: SelectionState, onChange: (part: RegisteredPart | null) => void) {
  state.selectedPartId = null;
  function selectPart(id: string | null): void {
    const part = id === null ? null : registry.byId.get(id);
    if (id !== null && !part) throw new Error(`不能选择未注册部件：${id}`);
    if (state.selectedPartId === id) return;
    state.selectedPartId = id;
    onChange(part ?? null);
  }
  return { selectPart };
}
