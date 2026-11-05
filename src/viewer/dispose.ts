import { Mesh, Texture } from 'three';
import type { Object3D, Material, BufferGeometry } from 'three';

export function disposeObject(root: Object3D): void {
  const geometry = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometry.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    }
  });
  geometry.forEach(item => item.dispose());
  textures.forEach(item => { item.dispose(); if (typeof ImageBitmap !== 'undefined' && item.image instanceof ImageBitmap) item.image.close(); });
  materials.forEach(item => item.dispose());
  root.removeFromParent();
}
