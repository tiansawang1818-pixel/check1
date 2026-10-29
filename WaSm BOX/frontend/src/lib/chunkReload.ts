const reloadKey = "wasmbot:stale-asset-reload";

type ReloadStorage = Pick<Storage, "getItem" | "setItem">;

export function isStaleAssetError(error: unknown) {
  const text = error instanceof Error
    ? `${error.name} ${error.message}`
    : String(error);
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|\bLoad failed\b/i
    .test(text);
}

export function claimStaleAssetReload(
  error: unknown,
  storage: ReloadStorage,
  buildId: string,
) {
  if (!isStaleAssetError(error)) return false;
  if (storage.getItem(reloadKey) === buildId) return false;
  storage.setItem(reloadKey, buildId);
  return true;
}

export function currentBuildId(document: Document) {
  const script = document.querySelector<HTMLScriptElement>(
    'script[type="module"][src]',
  );
  return script?.src || "unknown-build";
}
