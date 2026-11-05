import { Mesh } from 'three';
import type { Object3D } from 'three';
import type { AssetManifest, PartDefinition } from './assetManifest';

export interface RegisteredPart { definition: PartDefinition; object: Mesh; }
export interface PartRegistry {
  byId: ReadonlyMap<string, RegisteredPart>;
  objects: Mesh[];
  surfaceMeshes: Mesh[];
  resolve: (object: Object3D) => RegisteredPart | null;
}

/** Build atomically: any missing or ambiguous configurable node rejects the registry. */
export function createPartRegistry(root: Object3D, manifest: AssetManifest): PartRegistry {
  const names = new Map<string, Object3D[]>();
  const surfaceMeshes: Mesh[] = [];
  root.traverse(object => { if (object instanceof Mesh) surfaceMeshes.push(object); if (object.name) names.set(object.name, [...(names.get(object.name) ?? []), object]); });
  const byId = new Map<string, RegisteredPart>(), byUuid = new Map<string, RegisteredPart>();
  const issues: string[] = [];
  for (const definition of manifest.parts.filter(part => part.configurable)) {
    const matches = names.get(definition.nodeName) ?? [];
    const problem = (reason: string) => issues.push(`partId=${definition.id} nodeName=${definition.nodeName} ${reason}`);
    if (matches.length !== 1) { problem(matches.length ? `节点名歧义，匹配 ${matches.length} 个节点` : '节点缺失'); continue; }
    const object = matches[0]!;
    if (!(object instanceof Mesh)) { problem('必须映射到独立 Mesh'); continue; }
    if (Array.isArray(object.material)) { problem('多材质 Mesh 需要明确映射，当前契约仅支持单材质'); continue; }
    const part = { definition, object };
    if (byId.has(definition.id) || byUuid.has(object.uuid)) { problem('重复 ID 或对象映射'); continue; }
    byId.set(definition.id, part); byUuid.set(object.uuid, part);
  }
  if (issues.length) throw new Error(`[assetId=${manifest.assetId} assetVersion=${manifest.assetVersion}] 部件注册失败：\n${issues.join('\n')}`);
  return {
    byId, surfaceMeshes, objects: [...byId.values()].map(part => part.object),
    resolve(object) {
      let current: Object3D | null = object;
      while (current) { const part = byUuid.get(current.uuid); if (part) return part; if (current === root) break; current = current.parent; }
      return null;
    },
  };
}
