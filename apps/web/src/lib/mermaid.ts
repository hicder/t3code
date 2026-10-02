import { fnv1a32 } from "./diffRendering";
import { LRUCache } from "./lruCache";

export type MermaidRenderTheme = "light" | "dark";

type MermaidModule = typeof import("mermaid").default;

const MAX_MERMAID_CACHE_ENTRIES = 200;
const MAX_MERMAID_CACHE_MEMORY_BYTES = 25 * 1024 * 1024;

const mermaidSvgCache = new LRUCache<string>(
  MAX_MERMAID_CACHE_ENTRIES,
  MAX_MERMAID_CACHE_MEMORY_BYTES,
);

let mermaidModulePromise: Promise<MermaidModule> | null = null;
let renderQueue: Promise<unknown> = Promise.resolve();
let renderIdCounter = 0;

function getMermaidModule(): Promise<MermaidModule> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid").then((mod) => mod.default);
  }
  return mermaidModulePromise;
}

function createMermaidCacheKey(code: string, theme: MermaidRenderTheme): string {
  return `${theme}:${fnv1a32(code)}`;
}

function enqueueMermaidRender<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task);
  renderQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function mermaidThemeName(theme: MermaidRenderTheme): "dark" | "default" {
  return theme === "dark" ? "dark" : "default";
}

async function renderMermaidUncached(code: string, theme: MermaidRenderTheme): Promise<string> {
  return enqueueMermaidRender(async () => {
    const mermaid = await getMermaidModule();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: mermaidThemeName(theme),
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    });
    const id = `mermaid-${++renderIdCounter}`;
    const { svg } = await mermaid.render(id, code);
    return svg;
  });
}

export function renderMermaid(code: string, theme: MermaidRenderTheme): Promise<string> {
  const cacheKey = createMermaidCacheKey(code, theme);
  const cached = mermaidSvgCache.get(cacheKey);
  if (cached != null) {
    return Promise.resolve(cached);
  }

  return renderMermaidUncached(code, theme).then((svg) => {
    mermaidSvgCache.set(cacheKey, svg, svg.length * 2);
    return svg;
  });
}

/** @internal */
export function resetMermaidRenderStateForTests(): void {
  renderQueue = Promise.resolve();
  renderIdCounter = 0;
  mermaidModulePromise = null;
  mermaidSvgCache.clear();
}
