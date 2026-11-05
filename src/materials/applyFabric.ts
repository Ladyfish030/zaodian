import type { Material } from 'three';
import type { PartRegistry } from '../parts/partRegistry';
import { FABRIC_CATALOG, validateFabricCatalog } from './fabricCatalog';
import type { FabricMaterial } from './fabricCatalog';
import { createTextureCache } from './textureCache';
import { startFabricMaterial } from './materialLoader';
import type { FabricResource } from './materialLoader';

export interface FabricState { fabricByPart: Record<string,string>; }
export type ApplyResult = { status: 'applied' | 'superseded' | 'error'; message?: string };

export function createFabricController(registry: PartRegistry, state: FabricState, options: { catalog?: FabricMaterial[]; anisotropy?: number; onChange?: () => void } = {}) {
  const catalog = options.catalog ?? FABRIC_CATALOG; validateFabricCatalog(catalog);
  const fabrics = new Map(catalog.map(fabric => [fabric.id,fabric]));
  const cache = createTextureCache(options.anisotropy);
  const defaults = new Map([...registry.byId].map(([id,part]) => [id,part.object.material as Material]));
  const applied = new Map<string,FabricResource>(), latest = new Map<string,number>(), errors = new Map<string,string>();
  const pending = new Map<number,{ targets: string[]; fabricId: string; tasks: ReturnType<typeof startFabricMaterial>[] }>();
  let disposed = false, sequence = 0;
  const notify = () => options.onChange?.();
  const targetsFor = (id: string) => {
    const part = registry.byId.get(id); if (!part) throw new Error(`未注册部件：${id}`);
    const group = part.definition.groupKey;
    return group ? [...registry.byId].filter(([,item]) => item.definition.groupKey === group).map(([key]) => key) : [id];
  };
  function supersede(targets: string[]) {
    const token = ++sequence;
    for (const [key,request] of pending) if (request.targets.some(id => targets.includes(id))) { request.tasks.forEach(task => task.cancel()); pending.delete(key); }
    targets.forEach(id => { latest.set(id,token); errors.delete(id); });
    return token;
  }
  async function applyFabric(partId: string, fabricId: string): Promise<ApplyResult> {
    if (disposed) return { status: 'superseded' };
    const fabric = fabrics.get(fabricId); if (!fabric) throw new Error(`未知布料：${fabricId}`);
    const targets = targetsFor(partId), token = supersede(targets);
    const tasks = targets.map(() => startFabricMaterial(fabric,cache));
    pending.set(token,{targets,fabricId,tasks}); notify();
    const results = await Promise.allSettled(tasks.map(task => task.promise));
    const resources = results.filter((item): item is PromiseFulfilledResult<FabricResource> => item.status === 'fulfilled').map(item => item.value);
    if (disposed || !pending.has(token) || targets.some(id => latest.get(id) !== token)) { resources.forEach(item => item.dispose()); return { status: 'superseded' }; }
    pending.delete(token);
    const failure = results.find((item): item is PromiseRejectedResult => item.status === 'rejected');
    if (failure) {
      resources.forEach(item => item.dispose());
      const message = failure.reason instanceof Error ? failure.reason.message : String(failure.reason);
      targets.forEach(id => errors.set(id,message)); notify(); return { status: 'error', message };
    }
    // Commit the whole group only after every required texture/material is ready.
    const previous = targets.map(id => applied.get(id));
    targets.forEach((id,index) => {
      const resource = (results[index] as PromiseFulfilledResult<FabricResource>).value;
      resource.material.side = defaults.get(id)!.side;
      registry.byId.get(id)!.object.material = resource.material; applied.set(id,resource); state.fabricByPart[id] = fabric.id;
    });
    previous.forEach(item => item?.dispose()); notify(); return { status: 'applied' };
  }
  function restoreDefault(partId: string): void {
    if (disposed) return;
    const targets = targetsFor(partId); supersede(targets);
    targets.forEach(id => { registry.byId.get(id)!.object.material = defaults.get(id)!; applied.get(id)?.dispose(); applied.delete(id); delete state.fabricByPart[id]; });
    notify();
  }
  function dispose(): void {
    if (disposed) return; disposed = true;
    pending.forEach(request => request.tasks.forEach(task => task.cancel())); pending.clear();
    for (const [id,resource] of applied) { registry.byId.get(id)!.object.material = defaults.get(id)!; resource.dispose(); delete state.fabricByPart[id]; }
    applied.clear(); latest.clear(); errors.clear(); cache.dispose();
  }
  function diagnostics() {
    const pendingByPart: Record<string,string> = {};
    pending.forEach(request => request.targets.forEach(id => { pendingByPart[id] = request.fabricId; }));
    return { applied: Object.fromEntries([...applied].map(([id,resource]) => [id,{ fabricId: state.fabricByPart[id], materialUuid: resource.material.uuid, mapUuid: resource.material.map?.uuid, colorSpace: resource.material.map?.colorSpace, normalColorSpace: resource.material.normalMap?.colorSpace, roughnessColorSpace: resource.material.roughnessMap?.colorSpace, flipY: resource.material.map?.flipY }])), pendingByPart, errors: Object.fromEntries(errors), cache: cache.diagnostics() };
  }
  return { applyFabric, restoreDefault, dispose, diagnostics, targetsFor };
}
