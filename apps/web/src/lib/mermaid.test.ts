import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const initialize = vi.fn();
const render = vi.fn();

vi.mock("mermaid", () => ({
  default: {
    initialize,
    render,
  },
}));

import { renderMermaid, resetMermaidRenderStateForTests } from "./mermaid";

describe("renderMermaid", () => {
  beforeEach(() => {
    resetMermaidRenderStateForTests();
    initialize.mockReset();
    render.mockReset();
    render.mockImplementation(async (id: string, code: string) => ({
      svg: `<svg data-id="${id}">${code}</svg>`,
    }));
  });

  it("serializes concurrent renders and applies the theme for each render", async () => {
    const themes: string[] = [];
    initialize.mockImplementation((config: { theme?: string }) => {
      themes.push(config.theme ?? "");
    });

    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    render
      .mockImplementationOnce(async (id: string) => {
        await firstGate;
        return { svg: `<svg data-id="${id}">first</svg>` };
      })
      .mockImplementationOnce(async (id: string) => ({
        svg: `<svg data-id="${id}">second</svg>`,
      }));

    const first = renderMermaid("graph TD\n  A-->B", "light");
    const second = renderMermaid("sequenceDiagram\n  A->>B: hi", "dark");
    releaseFirst();
    const [firstSvg, secondSvg] = await Promise.all([first, second]);

    expect(firstSvg).toContain("first");
    expect(secondSvg).toContain("second");
    expect(themes).toEqual(["default", "dark"]);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("reuses cached svg for the same source and theme", async () => {
    await renderMermaid("flowchart LR\n  A --> B", "dark");
    await renderMermaid("flowchart LR\n  A --> B", "dark");
    expect(render).toHaveBeenCalledTimes(1);
  });
});
