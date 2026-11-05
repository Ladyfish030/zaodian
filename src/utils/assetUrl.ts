/** Paths are relative to Vite's deployment base, including subdirectory hosting. */
export function assetUrl(relativePath: string): string {
  return new URL(import.meta.env.BASE_URL + relativePath.replace(/^\/+/, ''), window.location.origin).href;
}
