import { expect, it } from "vitest";
import {
  claimStaleAssetReload,
  clearStaleAssetReload,
  isStaleAssetError,
} from "../frontend/src/lib/chunkReload";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

it("recognizes stale lazy-loaded assets without matching ordinary errors", () => {
  expect(
    isStaleAssetError(
      new TypeError("Failed to fetch dynamically imported module"),
    ),
  ).toBe(true);
  expect(isStaleAssetError(new Error("Request failed"))).toBe(false);
});

it("claims one automatic reload and prevents a reload loop", () => {
  const storage = memoryStorage();
  const error = new Error("Importing a module script failed");
  expect(claimStaleAssetReload(error, storage, 100_000)).toBe(true);
  expect(claimStaleAssetReload(error, storage, 100_001)).toBe(false);
  clearStaleAssetReload(storage);
  expect(claimStaleAssetReload(error, storage, 100_002)).toBe(true);
});
