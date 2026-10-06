import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app";
import { OdometerReader } from "../src/odometer/reader";
import { ReaderResponse } from "../src/types";

const readerReturning = (out: ReaderResponse): OdometerReader => ({ read: async () => out });
const good: ReaderResponse = { reading: 161967, unit: "miles", confidence: "high" };

const post = (app: ReturnType<typeof createApp>, body: object) =>
  request(app).post("/odometer/reading").send(body);

let jpeg: string;
let png: string;
let truncatedPng: string;

beforeAll(async () => {
  const blank = { create: { width: 40, height: 40, channels: 3, background: "#888" } } as const;
  const jpegBuf = await sharp(blank).jpeg().toBuffer();
  const pngBuf = await sharp(blank).png().toBuffer();
  jpeg = jpegBuf.toString("base64");
  png = pngBuf.toString("base64");
  // valid signature and header, but the pixel data is cut off
  truncatedPng = pngBuf.subarray(0, 40).toString("base64");
});

describe("POST /odometer/reading", () => {
  it("returns exactly the brief's three fields on success (no audit)", async () => {
    const res = await post(createApp(readerReturning(good)), { image: jpeg });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reading: 161967, unit: "miles", confidence: "high" });
  });

  it("accepts a PNG inside a data URI", async () => {
    const res = await post(createApp(readerReturning(good)), {
      image: `data:image/png;base64,${png}`,
    });
    expect(res.status).toBe(200);
  });

  it("rounds decimals (image 2)", async () => {
    const app = createApp(readerReturning({ ...good, reading: 62690.5 }));
    expect((await post(app, { image: jpeg })).body.reading).toBe(62691);
  });

  it("returns low confidence rather than rejecting it (image 3)", async () => {
    const app = createApp(readerReturning({ ...good, reading: 154510, confidence: "low" }));
    const res = await post(app, { image: jpeg });
    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe("low");
  });

  it("rejects low confidence when MIN_CONFIDENCE is medium", async () => {
    const app = createApp(readerReturning({ ...good, confidence: "low" }), {
      minConfidence: "medium",
    });
    expect((await post(app, { image: jpeg })).status).toBe(422);
  });

  it("returns the brief's UNREADABLE_IMAGE body when nothing is found", async () => {
    const app = createApp(readerReturning({ ...good, reading: null }));
    const res = await post(app, { image: jpeg });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: "UNREADABLE_IMAGE",
      message: "Could not extract a mileage reading from the provided image",
    });
  });

  it("maps a throwing reader to 502 API_ERROR", async () => {
    const broken: OdometerReader = {
      read: async () => {
        throw new Error("upstream down");
      },
    };
    const res = await post(createApp(broken), { image: jpeg });
    expect(res.status).toBe(502);
    expect(res.body.error).toBe("API_ERROR");
  });
});