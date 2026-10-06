import { createHash } from "node:crypto";
import type { ReaderResponse } from "../types";
import type { ImageInput, OdometerReader } from "./reader";

const SAMPLE_READINGS: Readonly<Record<string, ReaderResponse>> = {
  "3a352570450ccea9592eab81bb1fae1b9dc87e7b2f26115aa8a301c8aba69e20": {
    reading: 154510,
    unit: "miles",
    confidence: "low",
  },
  "4a793bddd8291b5cf832406f2c48888ca1fcd020f86a6f9e65e9ef2668ba9638": {
    reading: 62690.5,
    unit: "miles",
    confidence: "high",
  },
  "6d5c805d1e71cefe0ef3bc2251a53ad2feecc56bed2f4f4bc64cc3f276b02565": {
    reading: 205265,
    unit: "miles",
    confidence: "high",
  },
  "4e3b869663ab2b0cdf4448d64ce8412cfcc9dc2be5c6665f8c60b745c9dc7a0e": {
    reading: 161957,
    unit: "miles",
    confidence: "high",
  },
};

export class MockReader implements OdometerReader {
  private readonly readings: Readonly<Record<string, ReaderResponse>>;

  constructor(readings: Readonly<Record<string, ReaderResponse>> = SAMPLE_READINGS) {
    this.readings = Object.fromEntries(
      Object.entries(readings).map(([hash, response]) => [hash.toLowerCase(), response])
    );
  }

  async read(image: ImageInput): Promise<ReaderResponse> {
    const hash = createHash("sha256").update(image.data).digest("hex").toLowerCase();
    const response = this.readings[hash];
    if (!response) throw new Error("No mock reading is configured for this image");
    return { ...response };
  }
}
