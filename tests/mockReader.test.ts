import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { MockReader } from "../src/odometer/MockReader";

const sample = (name: string) => ({
  data: readFileSync(join(process.cwd(), "images", name)),
  mediaType: "image/jpeg" as const,
});

describe("MockReader", () => {
  it.each([
    [
      "33c24909-e9dd-46d3-8e7f-c44fd9896537.jpeg",
      { reading: 154510, unit: "miles", confidence: "low" },
    ],
    [
      "3ae9d173-8895-409e-844c-77b5841138d7.jpeg",
      { reading: 62690.5, unit: "miles", confidence: "high" },
    ],
    [
      "d621e37e-7c0f-49a4-8a19-d628b1e82a33.jpeg",
      { reading: 205265, unit: "miles", confidence: "high" },
    ],
    [
      "dbab9932-823e-49ed-80db-1e898d836d5e.jpeg",
      { reading: 161957, unit: "miles", confidence: "high" },
    ],
  ])("returns the known response for %s", async (filename, expected) => {
    await expect(new MockReader().read(sample(filename))).resolves.toEqual(expected);
  });

  it("matches configured SHA-256 keys case-insensitively", async () => {
    const image = Buffer.from("fixture image");
    const upperCaseHash = createHash("sha256").update(image).digest("hex").toUpperCase();
    const reader = new MockReader({
      [upperCaseHash]: { reading: 42, unit: "kilometers", confidence: "medium" },
    });

    await expect(reader.read({ data: image, mediaType: "image/png" })).resolves.toEqual({
      reading: 42,
      unit: "kilometers",
      confidence: "medium",
    });
  });

  it("fails explicitly when there is no fixture response", async () => {
    await expect(new MockReader().read({ data: Buffer.from("unknown"), mediaType: "image/jpeg" }))
      .rejects.toThrow("No mock reading is configured");
  });
});
