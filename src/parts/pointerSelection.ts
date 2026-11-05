import { Raycaster, Vector2 } from 'three';
import type { Camera, Object3D } from 'three';
import type { PartRegistry } from './partRegistry';

export function pickPart(registry: PartRegistry, camera: Camera, element: HTMLElement, clientX: number, clientY: number): string | null {
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  const ray = new Raycaster();
  ray.setFromCamera(new Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), camera);
  const visible = (object: Object3D): boolean => { let current: Object3D | null = object; while (current) { if (!current.visible) return false; current = current.parent; } return true; };
  // Non-configurable surfaces occlude the fruit body, but never become selectable.
  const hit = ray.intersectObjects(registry.surfaceMeshes.filter(visible), true).find(item => visible(item.object));
  return hit ? registry.resolve(hit.object)?.definition.id ?? null : null;
}

/** Track maximum travel, cancellation and multi-touch, not just down/up distance. */
export function bindPointerSelection(element: HTMLElement, pick: (x: number, y: number) => void, clear: () => void): () => void {
  const pointers = new Set<number>();
  let gesture: { id: number; x: number; y: number; moved: boolean } | null = null;
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    pointers.add(event.pointerId);
    if (pointers.size === 1) gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    else if (gesture) gesture.moved = true;
  };
  const move = (event: PointerEvent) => {
    if (gesture && gesture.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) gesture.moved = true;
  };
  const up = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (gesture?.id !== event.pointerId) return;
    const click = !gesture.moved && event.button === 0 && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 6;
    gesture = null;
    const rect = element.getBoundingClientRect();
    if (click && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) pick(event.clientX, event.clientY);
  };
  const cancel = (event: PointerEvent) => { pointers.delete(event.pointerId); if (gesture?.id === event.pointerId) gesture = null; };
  const cancelGesture = () => { gesture = null; pointers.clear(); };
  const wheel = () => { if (gesture) gesture.moved = true; };
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') clear(); };
  element.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true);
  window.addEventListener('blur', cancelGesture); element.addEventListener('wheel', wheel, { passive: true }); element.addEventListener('keydown', key);
  return () => {
    element.removeEventListener('pointerdown', down, true);
    window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true);
    window.removeEventListener('blur', cancelGesture); element.removeEventListener('wheel', wheel); element.removeEventListener('keydown', key); cancelGesture();
  };
}
