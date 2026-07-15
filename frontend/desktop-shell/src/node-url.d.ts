// Minimal `node:url` declarations. The project intentionally doesn't
// depend on `@types/node` (it's a frontend-only Vite build), but
// `vite.config.ts` uses `fileURLToPath` + `URL` from `node:url`. These
// shims satisfy the TypeScript type-checker without pulling in the
// rest of Node's standard library types.
//
// Keep this file as small as possible — anything missing here that
// `vite.config.ts` actually needs should be added (one symbol, one
// line) rather than swapping in `@types/node`.

declare module 'node:url' {
  export const URL: { new (input: string, base?: string | URL): URL };
  export function fileURLToPath(url: URL | string): string;
  export type URL = globalThis.URL;
}
