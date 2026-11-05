import { assetUrl } from '../utils/assetUrl';

export interface FabricMaterial {
  id: string; name: string; description: string; thumbnailUrl: string;
  baseColorUrl: string; normalUrl?: string; roughnessUrl?: string;
  physicalWidthMm: number; physicalHeightMm: number; repeatMode: 'tile' | 'clamp';
  roughness: number; normalStrength: number;
  source?: 'photo-reference'; materialNote?: string;
}

export function validateFabricCatalog(catalog: FabricMaterial[]): void {
  const ids = new Set<string>();
  if (!Array.isArray(catalog) || !catalog.length) throw new Error('布料目录不能为空');
  for (const fabric of catalog) {
    if (!fabric || ['id','name','thumbnailUrl','baseColorUrl'].some(key => typeof fabric[key as keyof FabricMaterial] !== 'string' || !(fabric[key as keyof FabricMaterial] as string).trim())) throw new Error('布料目录缺少必填字段');
    if (ids.has(fabric.id)) throw new Error(`重复布料 ID：${fabric.id}`);
    if (![fabric.physicalWidthMm, fabric.physicalHeightMm].every(value => Number.isFinite(value) && value > 0)) throw new Error(`布料物理尺寸无效：${fabric.id}`);
    if (!['tile','clamp'].includes(fabric.repeatMode) || !Number.isFinite(fabric.roughness) || fabric.roughness < 0 || fabric.roughness > 1 || !Number.isFinite(fabric.normalStrength) || fabric.normalStrength < 0) throw new Error(`布料参数无效：${fabric.id}`);
    for (const value of [fabric.normalUrl, fabric.roughnessUrl]) if (value !== undefined && (typeof value !== 'string' || !value.trim())) throw new Error(`布料贴图路径无效：${fabric.id}`);
    ids.add(fabric.id);
  }
}

const definitions = [
  ['fabric_canvas_natural','米白帆布','粗织经纬 · 自然米白',0.94,0.35,200],
  ['fabric_denim_blue','蓝色牛仔','斜纹肌理 · 靛蓝',0.9,0.3,200],
  ['fabric_cotton_floral','花卉棉布','花卉印花 · 柔和浅底',0.87,0.18,300],
  ['fabric_linen_beige','米色棉麻','不规则织纹 · 亚麻色',0.96,0.45,200],
  ['fabric_velvet_dark','深色绒布','细密方向纹 · 深墨绿',0.98,0.12,200],
] as const;

export const FABRIC_CATALOG: FabricMaterial[] = definitions.map(([id,name,description,roughness,normalStrength,size]) => {
  const folder = `assets/materials/fabrics/${id}/`;
  return { id, name, description, thumbnailUrl: assetUrl(folder+'thumbnail.png'), baseColorUrl: assetUrl(folder+'basecolor.png'), normalUrl: assetUrl(folder+'normal.png'), roughnessUrl: assetUrl(folder+'roughness.png'), physicalWidthMm: size, physicalHeightMm: size, repeatMode: 'tile', roughness, normalStrength };
});
const referenceFabrics = [
  ['fabric_user_bw_boucle','黑白粗织花呢','圈纱外观 · 粗织起伏',0.98,0.65],
  ['fabric_user_blue_patchwork','蓝白拼布印花','细平纹 · 哑光印花',0.94,0.16],
  ['fabric_user_pink_dots','粉底深棕波点','细平纹 · 平整印花',0.94,0.14],
  ['fabric_user_brown_dots','棕底浅粉波点','细平纹 · 平整印花',0.95,0.14],
] as const;
for (const [id,name,description,roughness,normalStrength] of referenceFabrics) {
  const folder = 'assets/materials/fabrics/'+id+'/';
  FABRIC_CATALOG.push({id,name,description,source:'photo-reference',materialNote:'按照片重建外观，纤维成分与真实花纹尺度未标定',thumbnailUrl:assetUrl(folder+'thumbnail.png'),baseColorUrl:assetUrl(folder+'basecolor.png'),normalUrl:assetUrl(folder+'normal.png'),roughnessUrl:assetUrl(folder+'roughness.png'),physicalWidthMm:200,physicalHeightMm:200,repeatMode:'tile',roughness,normalStrength});
}
validateFabricCatalog(FABRIC_CATALOG);
