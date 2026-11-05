export type AppPhase = 'B1' | 'B2' | 'B3' | 'B4';
export type ViewerStatus = 'not-configured' | 'loading' | 'ready' | 'error';
export interface DesignState {
  phase: AppPhase;
  viewerStatus: ViewerStatus;
  selectedPartId: string | null;
  fabricByPart: Record<string, string>;
}
