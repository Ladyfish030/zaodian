import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Group } from 'three';

import { validateManifest } from '../parts/assetManifest';
import type { AssetManifest } from '../parts/assetManifest';
export type { AssetManifest } from '../parts/assetManifest';

export async function loadModel(manifestUrl: string, signal: AbortSignal): Promise<{ model: Group; manifest: AssetManifest; modelUrl: string }> {
  const response = await fetch(manifestUrl, { signal });
  if (!response.ok) throw new Error(`manifest HTTP ${response.status}：${manifestUrl}`);
  if (!response.headers.get('content-type')?.includes('json')) throw new Error(`manifest 响应不是 JSON：${manifestUrl}`);
  const data = validateManifest(await response.json());
  const modelUrl = new URL(data.modelUrl, manifestUrl).href;
  const binary = await fetch(modelUrl, { signal });
  if (!binary.ok) throw new Error(`GLB HTTP ${binary.status}：${modelUrl}`);
  const buffer = await binary.arrayBuffer();
  if (buffer.byteLength < 20 || new DataView(buffer).getUint32(0, true) !== 0x46546c67) throw new Error(`响应不是 GLB 二进制文件：${modelUrl}`);
  signal.throwIfAborted();
  const gltf = await new GLTFLoader().parseAsync(buffer, new URL('.', modelUrl).href);
  return { model: gltf.scene, manifest: data, modelUrl };
}
