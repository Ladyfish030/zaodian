import { ClampToEdgeWrapping, NoColorSpace, RepeatWrapping, SRGBColorSpace, Texture } from 'three';

interface Entry { key: string; refs: number; controller: AbortController; texture: Texture | null; promise: Promise<Texture>; }
export interface TextureLease { promise: Promise<Texture>; release: () => void; }

/** Entries are shared only while leased. No unbounded idle cache. */
export function createTextureCache(anisotropy = 1) {
  const entries = new Map<string, Entry>(); let disposed = false;
  const destroy = (entry: Entry) => { if (entry.texture) { entry.texture.dispose(); (entry.texture.image as ImageBitmap).close(); entry.texture = null; } };
  function acquire(url: string, color: boolean, repeat: 'tile' | 'clamp'): TextureLease {
    if (disposed) throw new Error('纹理缓存已释放');
    const absolute = new URL(url, location.href).href, key = JSON.stringify([absolute,color,repeat]);
    let entry = entries.get(key);
    if (!entry) {
      const item: Entry = { key, refs: 0, controller: new AbortController(), texture: null, promise: null! };
      entries.set(key,item);
      item.promise = (async () => {
        const response = await fetch(absolute, { signal: item.controller.signal });
        if (!response.ok) throw new Error(`贴图 HTTP ${response.status}：${absolute}`);
        if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error(`响应不是图片：${absolute}`);
        const image = await createImageBitmap(await response.blob(), { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        if (disposed || item.refs === 0 || item.controller.signal.aborted) { image.close(); throw new DOMException('纹理请求已取消','AbortError'); }
        const texture = new Texture(image);
        texture.name = absolute; texture.flipY = false;
        texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
        texture.wrapS = texture.wrapT = repeat === 'tile' ? RepeatWrapping : ClampToEdgeWrapping;
        texture.anisotropy = Math.max(1,Math.min(4,anisotropy)); texture.needsUpdate = true;
        item.texture = texture; return texture;
      })();
      entry = item;
    }
    const current = entry; current.refs++; let released = false;
    return { promise: current.promise, release() {
      if (released) return; released = true; current.refs--;
      if (current.refs === 0) { current.controller.abort(); destroy(current); if (entries.get(key) === current) entries.delete(key); }
    } };
  }
  function dispose() { if (disposed) return; disposed = true; for (const entry of entries.values()) { entry.controller.abort(); destroy(entry); } entries.clear(); }
  function diagnostics() { return { entries: entries.size, loaded: [...entries.values()].filter(item => item.texture).length, references: [...entries.values()].reduce((sum,item) => sum+item.refs,0) }; }
  return { acquire, dispose, diagnostics };
}
