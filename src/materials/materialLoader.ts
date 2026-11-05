import { MeshStandardMaterial, Vector2 } from 'three';
import type { FabricMaterial } from './fabricCatalog';
import type { createTextureCache } from './textureCache';

export interface FabricResource { material: MeshStandardMaterial; dispose: () => void; }

export function startFabricMaterial(fabric: FabricMaterial, cache: ReturnType<typeof createTextureCache>) {
  const slots = [
    { slot: 'map', url: fabric.baseColorUrl, color: true },
    ...(fabric.normalUrl ? [{ slot: 'normalMap', url: fabric.normalUrl, color: false }] : []),
    ...(fabric.roughnessUrl ? [{ slot: 'roughnessMap', url: fabric.roughnessUrl, color: false }] : []),
  ] as const;
  const leases = slots.map(slot => cache.acquire(slot.url,slot.color,fabric.repeatMode));
  let canceled = false, resource: FabricResource | null = null;
  const release = () => leases.forEach(lease => lease.release());
  const promise = (async () => {
    try {
      const textures = await Promise.all(leases.map(lease => lease.promise));
      if (canceled) throw new DOMException('材质请求已取消','AbortError');
      const material = new MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: fabric.roughness, normalScale: new Vector2(fabric.normalStrength,fabric.normalStrength) });
      textures.forEach((texture,index) => { material[slots[index]!.slot as 'map' | 'normalMap' | 'roughnessMap'] = texture; });
      material.name = fabric.id;
      let released = false;
      resource = { material, dispose() { if (released) return; released = true; material.dispose(); release(); } };
      return resource;
    } catch (error) { release(); throw error; }
  })();
  return { promise, cancel() { canceled = true; if (resource) resource.dispose(); else release(); } };
}
