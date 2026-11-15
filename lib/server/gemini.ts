const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

type GeminiContent = { role: "user" | "model"; parts: { text: string }[] };

export async function generateText({
  system,
  contents,
  temperature = 0.3,
  maxOutputTokens = 1200,
}: {
  system: string;
  contents: GeminiContent[];
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The AI service isn’t configured.");

  let lastError: Error = new Error("The AI service is unavailable.");
  for (let attempt = 0; attempt < MODELS.length; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS[attempt]}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: {
            temperature,
            maxOutputTokens,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(45000),
      },
    ).catch((error: Error) => error);

    if (response instanceof Error) {
      lastError = response;
      continue;
    }
    if (response.status === 404 || response.status === 429 || response.status >= 500) {
      lastError = new Error(
        response.status === 429
          ? "The AI service is busy. Please try again in a moment."
          : `AI error (${response.status}).`,
      );
      continue;
    }
    if (!response.ok) throw new Error(`AI error (${response.status}).`);

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (text) return text;
    lastError = new Error("The AI returned an empty answer.");
  }
  throw lastError;
}
