import { inspectImage, MediaType } from "./image";
import { fail, ok } from "./result";
import { PreviousReading, Result } from "./types";

type ImageInput = { data: Buffer; mediaType: MediaType };

export type ParsedRequest = { image: ImageInput; previous?: PreviousReading };

const ALLOWED: readonly string[] = ["image/jpeg", "image/png"];
const DATA_URI_PREFIX = /^data:([\w.+-]+\/[\w.+-]+);base64,/i;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function parsePrevious(value: unknown): Result<PreviousReading | undefined> {
  if (value === undefined || value === null) return ok(undefined);
  if (!isObject(value)) return fail("INVALID_INPUT", "'previous' must be an object");

  const { reading, unit, recordedAt } = value;
  if (typeof reading !== "number" || !Number.isFinite(reading) || reading < 0) {
    return fail("INVALID_INPUT", "previous.reading must be a non-negative number");
  }
  if (unit !== "miles" && unit !== "kilometers") {
    return fail("INVALID_INPUT", "previous.unit must be 'miles' or 'kilometers'");
  }
  const date = typeof recordedAt === "string" ? new Date(recordedAt) : null;
  if (date === null || Number.isNaN(date.getTime())) {
    return fail("INVALID_INPUT", "previous.recordedAt must be an ISO 8601 date string");
  }
  return ok({ reading, unit, recordedAt: date });
}

export async function parseRequest(
  body: unknown,
  maxImageBytes: number
): Promise<Result<ParsedRequest>> {
  if (!isObject(body) || body.image === undefined || body.image === null || body.image === "") {
    return fail("MISSING_IMAGE", "Send a JSON body with a base64-encoded 'image' field");
  }
  if (typeof body.image !== "string") {
    return fail("INVALID_INPUT", "'image' must be a base64-encoded string");
  }
  if (body.mediaType !== undefined && typeof body.mediaType !== "string") {
    return fail("INVALID_INPUT", "'mediaType' must be a string");
  }

  // A data URI's type counts as the declared type if none was sent explicitly
  let b64 = body.image;
  let declared: string | undefined = body.mediaType;
  const dataUri = DATA_URI_PREFIX.exec(b64);
  if (dataUri) {
    declared ??= dataUri[1];
    b64 = b64.slice(dataUri[0].length);
  }
  b64 = b64.replace(/\s/g, "");

  if (declared !== undefined && !ALLOWED.includes(declared)) {
    return fail("UNSUPPORTED_FILE_TYPE", `${declared} is not supported. Use JPEG or PNG`);
  }
  if (b64 === "") return fail("MISSING_IMAGE", "Image data is empty");
  if (b64.length % 4 !== 0 || !BASE64.test(b64)) {
    return fail("INVALID_INPUT", "'image' is not valid base64");
  }

  // Size check before decoding, so we never allocate a buffer we'd reject
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  if ((b64.length / 4) * 3 - padding > maxImageBytes) {
    return fail("IMAGE_TOO_LARGE", `Image exceeds the ${maxImageBytes} byte limit`);
  }

  const data = Buffer.from(b64, "base64");
  const inspected = await inspectImage(data);
  if (!inspected.success) return inspected;

  const mediaType: MediaType = inspected.data;
  if (declared !== undefined && declared !== mediaType) {
    return fail(
      "UNSUPPORTED_FILE_TYPE",
      `Declared type ${declared} does not match the image contents (${mediaType})`
    );
  }

  const previous = parsePrevious(body.previous);
  if (!previous.success) return previous;

  const image: ImageInput = { data, mediaType };
  return ok(previous.data ? { image, previous: previous.data } : { image });
}