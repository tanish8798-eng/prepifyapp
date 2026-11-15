"use client";

import { memo, useEffect, useState } from "react";

type Katex = {
  renderToString: (
    value: string,
    options: { displayMode: boolean; throwOnError: boolean; trust: boolean },
  ) => string;
};
let katexPromise: Promise<boolean> | null = null;
const getKatex = () => (window as Window & { katex?: Katex }).katex;

function loadKatex() {
  if (getKatex()) return Promise.resolve(true);
  if (katexPromise) return katexPromise;
  katexPromise = new Promise<boolean>((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  return katexPromise;
}

function useMathReady(text: string) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!text.includes("$")) return;
    let active = true;
    loadKatex().then((loaded) => {
      if (active) setReady(loaded);
    });
    return () => {
      active = false;
    };
  }, [text]);
  return ready;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(value: string, ready: boolean): string {
  const tokens: string[] = [];
  const marked = value.replace(
    /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g,
    (match, display, single) => {
      let output = `<code class="math-fallback">${escapeHtml(match)}</code>`;
      if (ready && getKatex()) {
        try {
          // AI output sometimes double-escapes commands (\\vec), which KaTeX reads as a line break.
          const source = (display || single)
            .trim()
            .replace(/(?<!\\)\\\\(?=[a-zA-Z])/g, "\\");
          output = getKatex()!.renderToString(source, {
            displayMode: Boolean(display),
            throwOnError: false,
            trust: false,
          });
          if (display) output = `<div class="math-display">${output}</div>`;
        } catch {
          /* Invalid formulas remain readable as text. */
        }
      }
      tokens.push(output);
      return `\u0000${tokens.length - 1}\u0000`;
    },
  );
  return escapeHtml(marked)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
}

function safeSvg(source: string): string {
  if (typeof document === "undefined")
    return `<pre><code>${escapeHtml(source)}</code></pre>`;
  const template = document.createElement("template");
  template.innerHTML = source;
  const tags = new Set([
    "svg",
    "g",
    "path",
    "circle",
    "ellipse",
    "rect",
    "line",
    "polyline",
    "polygon",
    "text",
    "tspan",
    "defs",
    "marker",
    "lineargradient",
    "radialgradient",
    "stop",
    "title",
    "desc",
  ]);
  const attrs = new Set([
    "viewbox",
    "width",
    "height",
    "x",
    "y",
    "x1",
    "x2",
    "y1",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "d",
    "points",
    "fill",
    "stroke",
    "stroke-width",
    "stroke-linecap",
    "stroke-linejoin",
    "opacity",
    "fill-opacity",
    "stroke-opacity",
    "transform",
    "text-anchor",
    "font-size",
    "font-weight",
    "id",
    "offset",
    "stop-color",
    "stop-opacity",
    "marker-end",
    "marker-start",
    "markerwidth",
    "markerheight",
    "refx",
    "refy",
    "orient",
    "xmlns",
  ]);
  template.content.querySelectorAll("*").forEach((element) => {
    if (!tags.has(element.tagName.toLowerCase())) {
      element.remove();
      return;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (
        !attrs.has(attribute.name.toLowerCase()) ||
        (/url\s*\(/i.test(attribute.value) &&
          !/^url\(#[\w-]+\)$/.test(attribute.value))
      )
        element.removeAttribute(attribute.name);
    }
  });
  const svg = template.content.querySelector("svg");
  return svg
    ? `<div class="summary-diagram">${svg.outerHTML}</div>`
    : `<pre><code>${escapeHtml(source)}</code></pre>`;
}

export function summarySections(text: string) {
  const sections: { id: string; title: string }[] = [];
  let fenced = false;
  let math = false;
  for (const source of text.split("\n")) {
    const line = source.trim();
    if (line.startsWith("```")) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    if (line.startsWith("$$") || math) {
      if (math && line.includes("$$")) math = false;
      else if (!math && !line.slice(2).includes("$$")) math = true;
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading)
      sections.push({
        id: `summary-section-${sections.length}`,
        title: heading[1].replace(/\*\*/g, ""),
      });
  }
  return sections;
}

function renderMarkdown(text: string, ready: boolean, headingIds = true) {
  const lines = text.split("\n");
  const output: string[] = [];
  let index = 0;
  let section = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index++;
      continue;
    }
    if (line.startsWith("```")) {
      const svg = line.startsWith("```svg");
      const code: string[] = [];
      index++;
      while (index < lines.length && !lines[index].trim().startsWith("```"))
        code.push(lines[index++]);
      index++;
      output.push(
        svg
          ? safeSvg(code.join("\n"))
          : `<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`,
      );
      continue;
    }
    if (line.startsWith("$$")) {
      let math = line;
      index++;
      if (!line.slice(2).includes("$$")) {
        while (index < lines.length) {
          const next = lines[index++];
          math += `\n${next}`;
          if (next.includes("$$")) break;
        }
      }
      output.push(inline(math, ready));
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      output.push(
        `<h${level}${headingIds ? ` id="summary-section-${section++}"` : ""}>${inline(heading[2], ready)}</h${level}>`,
      );
      index++;
      continue;
    }
    if (/^[-*_]{3,}$/.test(line)) {
      output.push("<hr />");
      index++;
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const row = lines[index++]
          .trim()
          .replace(/^\||\|$/g, "")
          .split("|")
          .map((cell) => cell.trim());
        if (!row.every((cell) => /^:?-+:?$/.test(cell))) rows.push(row);
      }
      if (rows.length)
        output.push(
          `<div class="summary-table"><table><thead><tr>${rows[0].map((cell) => `<th>${inline(cell, ready)}</th>`).join("")}</tr></thead><tbody>${rows
            .slice(1)
            .map(
              (row) =>
                `<tr>${row.map((cell) => `<td>${inline(cell, ready)}</td>`).join("")}</tr>`,
            )
            .join("")}</tbody></table></div>`,
        );
      continue;
    }
    if (/^[-*]\s|^\d+\.\s/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const pattern = ordered ? /^\d+\.\s/ : /^[-*]\s/;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index].trim()))
        items.push(
          `<li>${inline(lines[index++].trim().replace(pattern, ""), ready)}</li>`,
        );
      const tag = ordered ? "ol" : "ul";
      output.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }
    if (line.startsWith("> "))
      output.push(`<blockquote>${inline(line.slice(2), ready)}</blockquote>`);
    else output.push(`<p>${inline(line, ready)}</p>`);
    index++;
  }
  return output.join("\n");
}

export const MathText = memo(function MathText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ready = useMathReady(text);
  return (
    <div
      className={`math-text ${className}`}
      dangerouslySetInnerHTML={{ __html: inline(text, ready) }}
    />
  );
});

export const SummaryRenderer = memo(function SummaryRenderer({
  text,
  headingIds = true,
}: {
  text: string;
  headingIds?: boolean;
}) {
  const ready = useMathReady(text);
  return (
    <div
      className="summary-prose"
      dangerouslySetInnerHTML={{
        __html: renderMarkdown(text, ready, headingIds),
      }}
    />
  );
});

function timestampSeconds(value: string) {
  return value
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

const TIME = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}`;
const SPAN = String.raw`${TIME}(?:\s*[-–]\s*${TIME})?`;
const TIMESTAMPS = new RegExp(String.raw`\[(${SPAN}(?:\s*[,;]\s*${SPAN})*)\]`, "g");

function timestampButtons(list: string) {
  return list
    .split(/\s*[,;]\s*/)
    .map((item) => {
      const [start, end] = item.split(/\s*[-–]\s*/);
      return `<button type="button" class="ts-link" data-seek="${timestampSeconds(start)}" aria-label="Play the lecture from ${start}">${start}${end ? `–${end}` : ""}</button>`;
    })
    .join(" ");
}

export const MarkdownMessage = memo(function MarkdownMessage({
  text,
}: {
  text: string;
}) {
  const ready = useMathReady(text);
  const html = renderMarkdown(text, ready, false).replace(
    TIMESTAMPS,
    (_, list: string) => timestampButtons(list),
  );
  return (
    <div
      className="summary-prose chat-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
