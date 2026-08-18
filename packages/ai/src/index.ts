import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

const MODELS = {
  // Reasoning-heavy calls: portfolio construction, underwriting, rebalance decisions.
  reasoning: process.env.GEMINI_MODEL_REASONING ?? "gemini-3.1-pro-preview",
  // Latency-sensitive calls in the live demo path: mandate parsing.
  fast: process.env.GEMINI_MODEL_FAST ?? "gemini-3.6-flash",
} as const;

export type GenerateStructuredInput = {
  model?: keyof typeof MODELS;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
};

export async function generateStructured<T>({ model = "reasoning", system, prompt, schema, temperature = 0.3 }: GenerateStructuredInput): Promise<T> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODELS[model],
    contents: prompt,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return JSON.parse(text) as T;
}
