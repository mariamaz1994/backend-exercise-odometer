export type Confidence = "high" | "medium" | "low";
export type Unit = "miles" | "kilometers";

export type ErrorCode =
  | "MISSING_IMAGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "CORRUPT_IMAGE"
  | "IMAGE_TOO_LARGE"
  | "INVALID_INPUT"
  | "UNREADABLE_IMAGE"
  | "API_ERROR"
  | "INTERNAL_ERROR";

export type AuditFlagCode =
  | "DECIMAL_ROUNDED"
  | "EXCEEDS_MAX_DIGITS"
  | "ZERO_READING"
  | "READER_LOW_CONFIDENCE"
  | "IMPLAUSIBLE_JUMP"
  | "LOWER_THAN_PREVIOUS";

export type AuditFlag = { code: AuditFlagCode; detail: string };

export type Audit = {
  originalReading: number;
  originalConfidence: Confidence;
  flags: AuditFlag[];
};

export type Success<T> = { success: true; data: T };
export type ErrorPayload = { error: ErrorCode; message: string };
export type Failure = { success: false; error: ErrorPayload };
export type Result<T> = Success<T> | Failure;

export type OdometerReading = {
  reading: number;
  unit: Unit;
  confidence: Confidence;
};

export type ValidatedReading = OdometerReading & { audit: Audit };

export type ReaderResponse = {
  reading: number | null;
  unit: Unit;
  confidence: Confidence;
};

export type PreviousReading = {
  reading: number;
  unit: Unit;
  recordedAt: Date;
};