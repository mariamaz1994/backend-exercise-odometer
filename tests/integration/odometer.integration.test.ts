import { readFileSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../../src/app";
import { MockReader } from "../../src/odometer/MockReader";

const fixture = (filename: string): Buffer =>
  readFileSync(join(__dirname, "../../images", filename));

const app = createApp(new MockReader());

describe("odometer reading integration", () => {
  it.each([
    ["33c24909-e9dd-46d3-8e7f-c44fd9896537.jpeg", 154510, "low"],
    ["3ae9d173-8895-409e-844c-77b5841138d7.jpeg", 62691, "high"],
    ["d621e37e-7c0f-49a4-8a19-d628b1e82a33.jpeg", 205265, "high"],
    ["dbab9932-823e-49ed-80db-1e898d836d5e.jpeg", 161957, "high"],
  ] as const)("accepts and reads the sample image %s", async (filename, reading, confidence) => {
    const res = await request(app)
      .post("/odometer/reading")
      .send({
        image: fixture(filename).toString("base64"),
        mediaType: "image/jpeg",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ reading, unit: "miles", confidence });
  });

  it("returns API_ERROR when a valid but unknown image is submitted in mock mode", async () => {
    const unknownImage = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#888" },
    })
      .png()
      .toBuffer();

    const res = await request(app)
      .post("/odometer/reading")
      .send({ image: unknownImage.toString("base64"), mediaType: "image/png" });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      error: "API_ERROR",
      message: "The image reader failed. Please try again",
    });
  });
});
