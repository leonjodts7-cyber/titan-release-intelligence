import { nl } from "./nl";

type NestedRecord = { [key: string]: string | NestedRecord };

function resolve(obj: NestedRecord, path: string): string | undefined {
  const parts = path.split(".");
  let cur: string | NestedRecord = obj;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null || !(p in cur)) return undefined;
    cur = cur[p] as string | NestedRecord;
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Vertaal UI-key uit nl.ts. Ondersteunt {param} interpolatie. */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = resolve(nl as unknown as NestedRecord, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export { nl };
