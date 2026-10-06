import { fail, ok } from "./result";
import {
  AuditFlag,
  Confidence,
  PreviousReading,
  ReaderResponse,
  Result,
  Unit,
  ValidatedReading,
} from "./types";

const MAX_PLAUSIBLE_READING = 999_999; // above this: flag and cap at low
const MAX_POSSIBLE_READING = 9_999_999; // above this: reject
const KM_PER_MILE = 1.609344;
const MAX_KM_PER_DAY = 1_000; // a very long single-day road trip
const MS_PER_DAY = 86_400_000;
const UNREADABLE = "Could not extract a mileage reading from the provided image";

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

// Confidence can only go down, never up
const capConfidence = (current: Confidence, cap: Confidence): Confidence =>
  CONFIDENCE_RANK[current] <= CONFIDENCE_RANK[cap] ? current : cap;

const toKm = (value: number, unit: Unit): number =>
  unit === "miles" ? value * KM_PER_MILE : value;

export type ValidateOptions = {
  minConfidence?: Confidence;
  previous?: PreviousReading;
  now?: Date;
};

export function validateReading(
  raw: ReaderResponse,
  options: ValidateOptions = {}
): Result<ValidatedReading> {
  const { minConfidence = "low", previous, now = new Date() } = options;

  // No usable reading → failure
  if (
    raw.reading === null ||
    !Number.isFinite(raw.reading) ||
    raw.reading < 0 ||
    raw.reading > MAX_POSSIBLE_READING
  ) {
    return fail("UNREADABLE_IMAGE", UNREADABLE);
  }

  const flags: AuditFlag[] = [];
  let reading = raw.reading;
  let confidence = raw.confidence;

  if (raw.confidence === "low") {
    flags.push({ code: "READER_LOW_CONFIDENCE", detail: "Reader reported low confidence" });
  }

  // Odometers can show tenths (e.g. 62690.5); the API returns whole numbers.
  // Recorded in the audit only: a decimal is not a reason to lose confidence.
  if (!Number.isInteger(reading)) {
    reading = Math.round(reading);
    flags.push({ code: "DECIMAL_ROUNDED", detail: `Rounded ${raw.reading} to ${reading}` });
  }

  // More than 6 digits → implausible
  if (reading > MAX_PLAUSIBLE_READING) {
    confidence = capConfidence(confidence, "low");
    flags.push({ code: "EXCEEDS_MAX_DIGITS", detail: `${reading} has more than 6 digits` });
  }

  // Zero → low confidence
  if (reading === 0) {
    confidence = capConfidence(confidence, "low");
    flags.push({ code: "ZERO_READING", detail: "Reading is 0" });
  }

  // Previous-reading checks (run after rounding, so they use the final value)
  if (previous) {
    // Compare in km so a miles/km mix-up doesn't cause false flags
    const deltaKm = toKm(reading, raw.unit) - toKm(previous.reading, previous.unit);

    if (deltaKm < 0) {
      confidence = capConfidence(confidence, "low");
      flags.push({
        code: "LOWER_THAN_PREVIOUS",
        detail: `${reading} ${raw.unit} is lower than previous ${previous.reading} ${previous.unit}`,
      });
    } else {
      // Floor at 1 day so two photos minutes apart aren't held to an absurd hourly rate.
      // A future recordedAt gives a negative elapsed time, which the floor also absorbs.
      const elapsedDays = Math.max(
        (now.getTime() - previous.recordedAt.getTime()) / MS_PER_DAY,
        1
      );
      const kmPerDay = deltaKm / elapsedDays;

      if (kmPerDay > MAX_KM_PER_DAY) {
        confidence = capConfidence(confidence, "low");
        flags.push({
          code: "IMPLAUSIBLE_JUMP",
          detail: `${Math.round(deltaKm)} km in ${elapsedDays.toFixed(1)} days (~${Math.round(kmPerDay)} km/day)`,
        });
      }
    }
  }

  // Checked last, so it applies to the capped confidence
  if (CONFIDENCE_RANK[confidence] < CONFIDENCE_RANK[minConfidence]) {
    return fail("UNREADABLE_IMAGE", UNREADABLE);
  }

  return ok({
    reading,
    unit: raw.unit,
    confidence,
    audit: {
      originalReading: raw.reading,
      originalConfidence: raw.confidence,
      flags,
    },
  });
}