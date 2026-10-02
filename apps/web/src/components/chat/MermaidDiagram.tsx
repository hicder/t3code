import type { MermaidRenderTheme } from "~/lib/mermaid";
import { renderMermaid } from "~/lib/mermaid";
import { use, useMemo } from "react";

export function MermaidDiagramSvg({ code, theme }: { code: string; theme: MermaidRenderTheme }) {
  const svgPromise = useMemo(() => renderMermaid(code, theme), [code, theme]);
  const svg = use(svgPromise);
  return (
    <div
      className="chat-markdown-mermaid overflow-x-auto px-3 pb-3"
      // Mermaid runs SVG through DOMPurify with securityLevel: "strict".
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
