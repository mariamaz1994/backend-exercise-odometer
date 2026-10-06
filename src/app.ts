import express, { ErrorRequestHandler, Response } from "express";
import { OdometerReader } from "./odometer/reader";
import { validateReading } from "./policy";
import { parseRequest } from "./request";
import { Confidence, ErrorCode, ErrorPayload, ReaderResponse } from "./types";

export type AppOptions = {
  minConfidence?: Confidence;
  maxImageBytes?: number; // decoded image size
  log?: (entry: Record<string, unknown>) => void;
};

const STATUS: Record<ErrorCode, number> = {
  MISSING_IMAGE: 400,
  INVALID_INPUT: 400,
  UNSUPPORTED_FILE_TYPE: 415,
  IMAGE_TOO_LARGE: 413,
  CORRUPT_IMAGE: 422,
  UNREADABLE_IMAGE: 422,
  API_ERROR: 502,
  INTERNAL_ERROR: 500,
};

const sendError = (res: Response, payload: ErrorPayload): void => {
  res.status(STATUS[payload.error]).json(payload);
};

export function createApp(reader: OdometerReader, options: AppOptions = {}) {
  const { minConfidence = "low", maxImageBytes = 10 * 1024 * 1024, log = () => {} } = options;

  const app = express();

  // base64 is ~4/3 the size of the bytes it encodes; leave room for the other fields
  app.use(express.json({ limit: Math.ceil((maxImageBytes * 4) / 3) + 4096 }));

  app.post("/odometer/reading", async (req, res) => {
    const parsed = await parseRequest(req.body, maxImageBytes);
    if (!parsed.success) {
      sendError(res, parsed.error);
      return;
    }
    const { image, previous } = parsed.data;

    let output: ReaderResponse;
    try {
      output = await reader.read(image);
    } catch (err) {
      log({ event: "reader_failed", error: String(err) });
      sendError(res, { error: "API_ERROR", message: "The image reader failed. Please try again" });
      return;
    }

    const result = validateReading(output, {
      minConfidence,
      ...(previous ? { previous } : {}),
    });

    if (!result.success) {
      log({ event: "rejected", readerOutput: output });
      sendError(res, result.error);
      return;
    }

    // The audit trail is internal: log it, but keep the response to the brief's three fields
    const { reading, unit, confidence, audit } = result.data;
    log({ event: "read", reading, unit, confidence, audit });
    res.status(200).json({ reading, unit, confidence });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err?.type === "entity.parse.failed") {
      sendError(res, { error: "INVALID_INPUT", message: "Request body is not valid JSON" });
    } else if (err?.type === "entity.too.large") {
      sendError(res, { error: "IMAGE_TOO_LARGE", message: "Request body is too large" });
    } else {
      log({ event: "unexpected_error", error: String(err) });
      sendError(res, { error: "INTERNAL_ERROR", message: "Something went wrong" });
    }
  };
  app.use(onError);

  return app;
}