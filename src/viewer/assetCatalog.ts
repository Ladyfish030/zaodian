import { assetUrl } from '../utils/assetUrl';

export function getAssetCatalog() {
  return [
    { id: 'apple', label: '布艺苹果（皮革带）', manifestUrl: assetUrl('assets/manifests/fabric_apple_6panels_leather_v1.2.0.json') },
    { id: 'tote', label: '标准托特包', manifestUrl: assetUrl('assets/manifests/zaodian_tote_test_v1.0.0.json') },
  ] as const;
}
export function getRequestedAsset() {
  const id = new URLSearchParams(location.search).get('asset');
  return getAssetCatalog().find(asset => asset.id === id) ?? getAssetCatalog()[0];
}
