import { validateReading, ValidateOptions } from "../src/policy";
import { Confidence, ReaderResponse, Unit } from "../src/types";

const MS_PER_DAY = 86_400_000;
const UNREADABLE = "Could not extract a mileage reading from the provided image";

const raw = (
  reading: number | null,
  confidence: Confidence = "high",
  unit: Unit = "miles"
): ReaderResponse => ({ reading, unit, confidence });

const must = (r: ReaderResponse, options?: ValidateOptions) => {
  const result = validateReading(r, options);
  if (!result.success) throw new Error(`expected success, got ${result.error.error}`);
  return result.data;
};

const flagCodes = (r: ReaderResponse, options?: ValidateOptions) =>
  must(r, options).audit.flags.map((f) => f.code);

const now = new Date("2026-10-05T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * MS_PER_DAY);

describe("validateReading: basics", () => {
  it("fails with the brief's exact error when reading is null", () => {
    const r = validateReading(raw(null));
    expect(r).toEqual({
      success: false,
      error: { error: "UNREADABLE_IMAGE", message: UNREADABLE },
    });
  });

  it.each([-5, NaN, 10_000_000])("rejects %p", (reading) => {
    expect(validateReading(raw(reading)).success).toBe(false);
  });

  it("returns a clean reading unchanged with no flags", () => {
    expect(must(raw(161967, "high", "kilometers"))).toEqual({
      reading: 161967,
      unit: "kilometers",
      confidence: "high",
      audit: { originalReading: 161967, originalConfidence: "high", flags: [] },
    });
  });

  it("does not penalise low mileage (new car)", () => {
    const d = must(raw(523));
    expect(d.confidence).toBe("high");
    expect(d.audit.flags).toEqual([]);
  });

  it("rounds a decimal, keeps confidence, and records it (image 2)", () => {
    const d = must(raw(62690.5));
    expect(d.reading).toBe(62691);
    expect(d.confidence).toBe("high");
    expect(d.audit.originalReading).toBe(62690.5);
    expect(d.audit.flags.map((f) => f.code)).toEqual(["DECIMAL_ROUNDED"]);
  });

  it("passes reader low confidence through and flags it (image 3)", () => {
    const d = must(raw(154510, "low"));
    expect(d.reading).toBe(154510);
    expect(d.confidence).toBe("low");
    expect(d.audit.flags.map((f) => f.code)).toEqual(["READER_LOW_CONFIDENCE"]);
  });
});

describe("validateReading: plausibility caps", () => {
  it("flags zero and caps confidence at low, keeping the original in the audit", () => {
    const d = must(raw(0, "high"));
    expect(d.confidence).toBe("low");
    expect(d.audit.originalConfidence).toBe("high");
    expect(d.audit.flags.map((f) => f.code)).toEqual(["ZERO_READING"]);
  });

  it("flags 7-digit readings but not 6-digit ones", () => {
    expect(flagCodes(raw(999_999))).toEqual([]);
    const d = must(raw(1_000_000));
    expect(d.confidence).toBe("low");
    expect(d.audit.flags.map((f) => f.code)).toEqual(["EXCEEDS_MAX_DIGITS"]);
  });
});

describe("validateReading: minConfidence", () => {
  it("accepts low confidence by default, rejects it when the minimum is medium", () => {
    expect(validateReading(raw(154510, "low")).success).toBe(true);
    expect(validateReading(raw(154510, "low"), { minConfidence: "medium" })).toEqual({
      success: false,
      error: { error: "UNREADABLE_IMAGE", message: UNREADABLE },
    });
  });

  it("applies after caps (a high-confidence zero is capped, then rejected)", () => {
    expect(validateReading(raw(0, "high"), { minConfidence: "medium" }).success).toBe(false);
  });
});

describe("validateReading: previous reading", () => {
  const previous = { reading: 100000, unit: "miles", recordedAt: daysAgo(10) } as const;

  it("adds no flags for a plausible increase", () => {
    const d = must(raw(100500), { previous, now });
    expect(d.audit.flags).toEqual([]);
    expect(d.confidence).toBe("high");
  });

  it("flags and caps a reading lower than the previous one", () => {
    const d = must(raw(99000), { previous, now });
    expect(d.confidence).toBe("low");
    expect(d.audit.flags.map((f) => f.code)).toEqual(["LOWER_THAN_PREVIOUS"]);
  });

  it("flags a jump above 1,000 km/day but not exactly 1,000", () => {
    const prevKm = { reading: 100000, unit: "kilometers", recordedAt: daysAgo(1) } as const;
    expect(flagCodes(raw(101000, "high", "kilometers"), { previous: prevKm, now })).toEqual([]);
    const d = must(raw(101001, "high", "kilometers"), { previous: prevKm, now });
    expect(d.confidence).toBe("low");
    expect(d.audit.flags.map((f) => f.code)).toEqual(["IMPLAUSIBLE_JUMP"]);
  });

  it("floors elapsed time at one day for photos minutes apart", () => {
    const justNow = { reading: 100000, unit: "miles", recordedAt: new Date(now.getTime() - 60_000) } as const;
    expect(flagCodes(raw(100500), { previous: justNow, now })).toEqual([]); // ~805 km
    expect(flagCodes(raw(100700), { previous: justNow, now })).toEqual(["IMPLAUSIBLE_JUMP"]); // ~1127 km
  });

  it("compares across units without false flags", () => {
    const prevKm = { reading: 100000, unit: "kilometers", recordedAt: daysAgo(30) } as const;
    expect(flagCodes(raw(62500), { previous: prevKm, now })).toEqual([]); // ~100,584 km
  });

  it("applies minConfidence after previous-reading caps", () => {
    const r = validateReading(raw(99000), { previous, now, minConfidence: "medium" });
    expect(r.success).toBe(false);
  });
});