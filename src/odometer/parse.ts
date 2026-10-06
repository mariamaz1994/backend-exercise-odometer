import type { Confidence, ReaderResponse, Unit } from "../types";

const UNITS: readonly Unit[] = ["miles", "kilometers"];
const CONFIDENCES: readonly Confidence[] = ["high", "medium", "low"];

const isUnit = (value: unknown): value is Unit => UNITS.some((unit) => unit === value);
const isConfidence = (value: unknown): value is Confidence =>
  CONFIDENCES.some((confidence) => confidence === value);

function extractJsonObject(text: string): string {
  const withoutFences = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
  const start = withoutFences.indexOf("{");
  if (start === -1) throw new Error("Reader response did not contain a JSON object");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < withoutFences.length; index += 1) {
    const character = withoutFences[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return withoutFences.slice(start, index + 1);
    }
  }

  throw new Error("Reader response contained an incomplete JSON object");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseReaderResponse(text: string): ReaderResponse {
  if (typeof text !== "string") throw new Error("Reader response must be text");

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Reader response contained malformed JSON", { cause: error });
    }
    throw error;
  }

  if (!isObject(parsed)) throw new Error("Reader response must be a JSON object");

  const { reading, unit, confidence } = parsed;
  if (reading !== null && (typeof reading !== "number" || !Number.isFinite(reading))) {
    throw new Error("Reader response reading must be a finite number or null");
  }
  if (!isUnit(unit)) {
    throw new Error("Reader response unit must be 'miles' or 'kilometers'");
  }
  if (!isConfidence(confidence)) {
    throw new Error("Reader response confidence must be 'high', 'medium', or 'low'");
  }

  return { reading, unit, confidence };
}
