import { parseReaderResponse } from "../src/odometer/parse";

describe("parseReaderResponse", () => {
  it("parses JSON surrounded by explanatory text and markdown fences", () => {
    expect(
      parseReaderResponse(
        'Result:\n```json\n{ "reading": 62690.5, "unit": "miles", "confidence": "medium" }\n```\nDone.'
      )
    ).toEqual({ reading: 62690.5, unit: "miles", confidence: "medium" });
  });

  it("accepts null readings", () => {
    expect(
      parseReaderResponse('{"reading":null,"unit":"miles","confidence":"low"}')
    ).toEqual({ reading: null, unit: "miles", confidence: "low" });
  });

  it.each([
    "not JSON",
    '{"reading": "123", "unit": "miles", "confidence": "high"}',
    '{"reading": 1e999, "unit": "miles", "confidence": "high"}',
    '{"reading": 123, "unit": "km", "confidence": "high"}',
    '{"reading": 123, "unit": "miles", "confidence": "certain"}',
    '{"reading": 123, "unit": "miles"}',
  ])("rejects malformed or invalid reader output: %s", (text) => {
    expect(() => parseReaderResponse(text)).toThrow();
  });
});
