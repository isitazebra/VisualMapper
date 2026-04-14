import { useEffect } from "react";

/**
 * Runs `effect` whenever any value in `deps` changes, but waits `delay`
 * milliseconds of no further changes before firing. Used by the mapping
 * studio to batch autosave requests.
 *
 * The effect's return value is treated the same as `useEffect`'s cleanup.
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  deps: ReadonlyArray<unknown>,
  delay: number,
): void {
  useEffect(() => {
    let cleanup: void | (() => void);
    const handle = setTimeout(() => {
      cleanup = effect();
    }, delay);
    return () => {
      clearTimeout(handle);
      if (typeof cleanup === "function") cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}
