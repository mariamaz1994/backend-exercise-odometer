import sharp from "sharp";
import { fail, ok } from "./result";
import { Result } from "./types";

export type MediaType = "image/png" | "image/jpeg";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

/** Identifies JPEG/PNG from the first bytes, ignoring any declared type. */
export function detectImageType(buffer: Buffer): MediaType | null {
  if (buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return "image/png";
  if (buffer.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return "image/jpeg";
  return null;
}

/** Checks the type by magic bytes, then proves the image actually decodes. */
export async function inspectImage(buffer: Buffer): Promise<Result<MediaType>> {
  const mediaType = detectImageType(buffer);
  if (mediaType === null) {
    return fail("UNSUPPORTED_FILE_TYPE", "Only JPEG and PNG images are supported");
  }
  try {
    // stats() decodes every pixel; metadata() only reads the header
    await sharp(buffer).stats();
  } catch {
    return fail("CORRUPT_IMAGE", "The image data could not be decoded");
  }
  return ok(mediaType);
}