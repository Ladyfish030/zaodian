import { Vector3 } from 'three';
import { getRequestedAsset } from './assetCatalog';

/** Runtime defaults for the B2 model viewer. */
export function getViewerConfig() {
  return {
    manifestUrl: getRequestedAsset().manifestUrl,
    camera: { position: new Vector3(0.65, 0.45, 0.75), target: new Vector3(0, 0.23, 0), fov: 40, near: 0.01, far: 100 },
    lighting: { ambientIntensity: 1.5, directionalIntensity: 2.5, color: 0xffffff },
    maxPixelRatio: 2,
    debug: import.meta.env.DEV && new URLSearchParams(location.search).has('debug'),
  };
}
