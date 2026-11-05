import type { DesignState } from './designTypes';
/** Plain in-memory data; no persistence in B1–B4. */
export function createDesignState(): DesignState {
  return { phase: 'B4', viewerStatus: 'not-configured', selectedPartId: null, fabricByPart: {} };
}
