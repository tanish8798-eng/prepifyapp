import type { GeneratedResult } from "@/app/api/generate/route";

export function fileSlug(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "prepify-study-set"
  );
}

export function studySetMarkdown(
  title: string,
  result: GeneratedResult,
  notes: string[],
) {
  const lines = [
    `# ${title}`,
    "",
    `Lecture: https://www.youtube.com/watch?v=${result.videoId}`,
    `Made with Prepify on ${new Date().toLocaleDateString()}`,
    "",
    "## Summary",
    "",
    result.summary.trim(),
    "",
    "## Key points",
    "",
    ...result.keyPoints.map((point) => `- ${point}`),
    "",
    "## Flashcards",
    "",
    ...result.flashcards.flatMap((card, index) => [
      `**${index + 1}. ${card.q}**`,
      "",
      card.a,
      "",
    ]),
    "## Quiz",
    "",
    ...result.quizQuestions.flatMap((question, index) => [
      `**${index + 1}. ${question.q}**`,
      "",
      ...question.opts.map(
        (option, optionIndex) =>
          `${String.fromCharCode(65 + optionIndex)}. ${option}${optionIndex === question.ans ? " ✓" : ""}`,
      ),
      "",
      `> ${question.explanation}`,
      "",
    ]),
  ];
  if (notes.length)
    lines.push("## My notes", "", ...notes.map((note) => `- ${note}`), "");
  return lines.join("\n");
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""').replace(/\r?\n/g, "<br>")}"`;
}

export function flashcardsCsv(result: GeneratedResult) {
  return result.flashcards
    .map((card) => `${csvCell(card.q)},${csvCell(card.a)}`)
    .join("\n");
}

export function downloadText(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: `${type};charset=utf-8` }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
