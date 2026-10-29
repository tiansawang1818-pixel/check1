const reloadKey = "wasmbot:stale-asset-reload";
const reloadWindowMs = 60_000;

type ReloadStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isStaleAssetError(error: unknown) {
  const text = error instanceof Error
    ? `${error.name} ${error.message}`
    : String(error);
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed/i
    .test(text);
}

export function claimStaleAssetReload(
  error: unknown,
  storage: ReloadStorage,
  now = Date.now(),
) {
  if (!isStaleAssetError(error)) return false;
  const previous = Number(storage.getItem(reloadKey));
  if (previous > 0 && now - previous < reloadWindowMs) return false;
  storage.setItem(reloadKey, String(now));
  return true;
}

export function clearStaleAssetReload(storage: ReloadStorage) {
  storage.removeItem(reloadKey);
}
