import { EdgesGeometry, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial } from 'three';

/** Overlay borrows source geometry, owns only its new materials and edge geometry. */
export function createHighlighter() {
  let overlay: Mesh | null = null, outline: LineSegments | null = null;
  function clear() {
    if (overlay) { overlay.removeFromParent(); (overlay.material as MeshBasicMaterial).dispose(); overlay = null; }
    if (outline) { outline.removeFromParent(); outline.geometry.dispose(); (outline.material as LineBasicMaterial).dispose(); outline = null; }
  }
  function show(mesh: Mesh | null) {
    clear();
    if (!mesh) return;
    overlay = new Mesh(mesh.geometry, new MeshBasicMaterial({ color: 0x76985b, transparent: true, opacity: 0.24, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    overlay.name = '__ZAODIAN_SELECTION_FILL'; overlay.renderOrder = 1; overlay.raycast = () => {};
    outline = new LineSegments(new EdgesGeometry(mesh.geometry, 25), new LineBasicMaterial({ color: 0x496b35, transparent: true, opacity: 0.95, depthWrite: false }));
    outline.name = '__ZAODIAN_SELECTION_EDGE'; outline.renderOrder = 2; outline.raycast = () => {};
    mesh.add(overlay, outline);
  }
  return { show, clear };
}
