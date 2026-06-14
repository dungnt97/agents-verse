// Gemini vision scoring → the 5 visual audit dims (visual/cta/trust/content/conversion) +
// problems + summary, from desktop+mobile screenshots. Uses the @google/genai 2.x SDK with a
// responseSchema so the model returns typed JSON (no fragile parsing). Worker-only; no
// `server-only` (runs under tsx). Screenshots are passed in-memory (Buffer), never via a step
// boundary or disk.
import { GoogleGenAI, Type } from '@google/genai';
import { buildVisionPrompt } from './scoring-rubric';
import type { Screenshots } from './screenshot';

export interface VisionScore {
  visual: number;
  cta: number;
  trust: number;
  content: number;
  conversion: number;
  problems: string[];
  summary: string;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    visual: { type: Type.NUMBER },
    cta: { type: Type.NUMBER },
    trust: { type: Type.NUMBER },
    content: { type: Type.NUMBER },
    conversion: { type: Type.NUMBER },
    problems: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
  },
  required: ['visual', 'cta', 'trust', 'content', 'conversion', 'problems', 'summary'],
};

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 50)));

export async function scoreScreenshots(opts: {
  shots: Screenshots;
  company: string;
  industry: string;
}): Promise<VisionScore> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required for vision scoring');

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildVisionPrompt({ company: opts.company, industry: opts.industry }) },
          { text: 'DESKTOP screenshot:' },
          { inlineData: { mimeType: 'image/png', data: opts.shots.desktop.toString('base64') } },
          { text: 'MOBILE screenshot:' },
          { inlineData: { mimeType: 'image/png', data: opts.shots.mobile.toString('base64') } },
        ],
      },
    ],
    config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned no content for vision scoring');
  const raw = JSON.parse(text) as Partial<Record<keyof VisionScore, unknown>>;

  return {
    visual: clamp(Number(raw.visual)),
    cta: clamp(Number(raw.cta)),
    trust: clamp(Number(raw.trust)),
    content: clamp(Number(raw.content)),
    conversion: clamp(Number(raw.conversion)),
    problems: Array.isArray(raw.problems) ? raw.problems.slice(0, 6).map(String) : [],
    summary: typeof raw.summary === 'string' ? raw.summary : '',
  };
}
