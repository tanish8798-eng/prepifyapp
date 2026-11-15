"use client";

import { useEffect, useRef, useState } from "react";
import type { GeneratedResult } from "@/app/api/generate/route";
import Icon, { type IconName } from "@/components/Icon";
import {
  downloadText,
  fileSlug,
  flashcardsCsv,
  studySetMarkdown,
} from "@/lib/studyExport";

export default function ExportMenu({
  title,
  result,
  notes,
  onPrint,
}: {
  title: string;
  result: GeneratedResult;
  notes: string[];
  onPrint: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(""), 2600);
    return () => clearTimeout(timer);
  }, [done]);

  const slug = fileSlug(title);
  const actions: {
    icon: IconName;
    label: string;
    detail: string;
    run: () => void;
  }[] = [
    {
      icon: "download",
      label: "Study set (Markdown)",
      detail: "Summary, key points, cards, quiz and notes",
      run: () => {
        downloadText(
          `${slug}.md`,
          studySetMarkdown(title, result, notes),
          "text/markdown",
        );
        setDone("Study set downloaded");
      },
    },
    {
      icon: "cards",
      label: "Flashcards for Anki",
      detail: `${result.flashcards.length} cards as CSV (front, back)`,
      run: () => {
        downloadText(`${slug}-flashcards.csv`, flashcardsCsv(result), "text/csv");
        setDone("Flashcards downloaded");
      },
    },
    {
      icon: "print",
      label: "Print or save as PDF",
      detail: "A clean, printable study sheet",
      run: onPrint,
    },
  ];

  return (
    <div className="export-menu" ref={root}>
      <button
        type="button"
        className="button button-outline button-small"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="download" size={16} />
        Export
      </button>
      {open && (
        <div className="export-popover" role="menu" aria-label="Export study set">
          {actions.map((action) => (
            <button
              type="button"
              role="menuitem"
              key={action.label}
              disabled={action.icon === "cards" && !result.flashcards.length}
              onClick={() => {
                setOpen(false);
                action.run();
              }}
            >
              <span>
                <Icon name={action.icon} size={17} />
              </span>
              <span>
                <strong>{action.label}</strong>
                <small>{action.detail}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <span className="export-status" role="status">
        {done}
      </span>
    </div>
  );
}
