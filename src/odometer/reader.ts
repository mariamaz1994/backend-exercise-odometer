import { ReaderResponse } from "../types";

export interface ImageInput {
  data: Buffer;
  mediaType: "image/jpeg" | "image/png";
}

export interface OdometerReader {
  read(image: ImageInput): Promise<ReaderResponse>;
}