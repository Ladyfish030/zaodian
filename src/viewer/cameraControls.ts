import { Box3, MathUtils, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type ViewName = '默认' | '正面' | '背面' | '左侧' | '右侧' | '重置';
const directions: Record<ViewName, Vector3> = {
  默认: new Vector3(0.9, 0.55, 1.3), 重置: new Vector3(0.9, 0.55, 1.3),
  正面: new Vector3(0, 0, 1), 背面: new Vector3(0, 0, -1), 左侧: new Vector3(-1, 0, 0), 右侧: new Vector3(1, 0, 0),
};

/** Fit all eight corners in both vertical and horizontal frusta, with a 20% margin. */
export function fitCamera(camera: PerspectiveCamera, controls: OrbitControls, bounds: Box3, view: ViewName): void {
  const center = bounds.getCenter(new Vector3());
  const direction = directions[view].clone().normalize();
  const right = new Vector3().crossVectors(camera.up, direction).normalize();
  const up = new Vector3().crossVectors(direction, right).normalize();
  const tanV = Math.tan(MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
  let distance = 0;
  for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
    const point = new Vector3(x, y, z).sub(center), depth = point.dot(direction);
    distance = Math.max(distance, depth + Math.abs(point.dot(right)) * 1.2 / tanH, depth + Math.abs(point.dot(up)) * 1.2 / tanV);
  }
  const diagonal = bounds.getSize(new Vector3()).length();
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(diagonal / 1000, 0.0001); camera.far = Math.max(distance * 20, diagonal * 50);
  camera.updateProjectionMatrix(); controls.target.copy(center);
  controls.minDistance = diagonal * 0.55; controls.maxDistance = diagonal * 8;
  controls.update(); controls.saveState();
}
