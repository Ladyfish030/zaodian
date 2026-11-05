export const REQUIRED_PART_IDS = ['front_panel', 'back_panel', 'left_gusset', 'right_gusset', 'bottom_panel', 'handle_left', 'handle_right'] as const;

export const REQUIRED_APPLE_PART_IDS = ['apple_panel_01', 'apple_panel_02', 'apple_panel_03', 'apple_panel_04', 'apple_panel_05', 'apple_panel_06'] as const;

export interface PartDefinition {
  id: string; label: string; nodeName: string; configurable: boolean;
  materialSlot: string; groupKey?: string;
}
export interface AssetManifest {
  schemaVersion: 1; assetType?: 'tote' | 'fabric_apple'; assetId: string; assetVersion: string; format: 'glb';
  modelUrl: string; unit: 'meter'; upAxis: 'Y'; forwardAxis: '+Z';
  dimensionsMm: { width: number; height: number; depth: number };
  parts: PartDefinition[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }

/** Validate external JSON before treating it as a TypeScript contract. */
export function validateManifest(value: unknown): AssetManifest {
  if (!record(value)) throw new Error('manifest 必须为 JSON 对象');
  const context = `assetId=${text(value.assetId) ? value.assetId : '?'} assetVersion=${text(value.assetVersion) ? value.assetVersion : '?'}`;
  const fail = (message: string): never => { throw new Error(`[${context}] ${message}`); };
  if (value.schemaVersion !== 1 || value.format !== 'glb' || value.unit !== 'meter' || value.upAxis !== 'Y' || value.forwardAxis !== '+Z') fail('不支持的资产契约或坐标，要求米制、Y 向上、+Z 向前 GLB');
  for (const key of ['assetId', 'assetVersion', 'modelUrl']) if (!text(value[key])) fail(`缺少必填字段 ${key}`);
  if (value.assetType !== undefined && value.assetType !== 'tote' && value.assetType !== 'fabric_apple') fail('未知 assetType，不能跳过模型部件契约');
  const dimensions = value.dimensionsMm;
  if (!record(dimensions) || ['width', 'height', 'depth'].some(key => typeof dimensions[key] !== 'number' || !Number.isFinite(dimensions[key]) || (dimensions[key] as number) <= 0)) fail('dimensionsMm 宽高厚必须为有限正数');
  if (!Array.isArray(value.parts) || value.parts.length === 0) fail('缺少 parts 部件定义');
  const parts = value.parts as unknown[];
  const ids = new Set<string>(), names = new Set<string>();
  for (const raw of parts) {
    if (!record(raw)) fail('parts 条目必须为对象');
    const part = raw as Record<string, unknown>;
    const location = `partId=${String(part.id ?? '?')} nodeName=${String(part.nodeName ?? '?')}`;
    for (const key of ['id', 'label', 'nodeName', 'materialSlot']) if (!text(part[key])) fail(`${location} 缺少 ${key}`);
    if (typeof part.configurable !== 'boolean') fail(`${location} configurable 必须为布尔值`);
    if (part.groupKey !== undefined && !text(part.groupKey)) fail(`${location} groupKey 必须为非空字符串`);
    const id = part.id as string, name = part.nodeName as string;
    if (ids.has(id)) fail(`${location} 重复部件 ID`);
    if (names.has(name)) fail(`${location} 重复 nodeName`);
    ids.add(id); names.add(name);
  }
  const requiredIds = value.assetType === 'fabric_apple' ? REQUIRED_APPLE_PART_IDS : REQUIRED_PART_IDS;
  for (const id of requiredIds) {
    const part = (parts as PartDefinition[]).find(item => item.id === id);
    if (!part || !part.configurable) fail(`partId=${id} nodeName=${part?.nodeName ?? '?'} 缺少必需可配置部件`);
  }
  return value as unknown as AssetManifest;
}
