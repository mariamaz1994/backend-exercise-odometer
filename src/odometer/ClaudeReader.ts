import Anthropic from "@anthropic-ai/sdk";
import type { ReaderResponse } from "../types";
import { parseReaderResponse } from "./parse";
import { ODOMETER_SYSTEM_PROMPT, ODOMETER_USER_PROMPT } from "./prompt";
import type { ImageInput, OdometerReader } from "./reader";

const DEFAULT_MODEL = "claude-sonnet-5-5";

export class ClaudeReader implements OdometerReader {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY, model = process.env.ANTHROPIC_MODEL) {
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required to use ClaudeReader");

    this.client = new Anthropic({ apiKey, timeout: 30_000 });
    this.model = model || DEFAULT_MODEL;
  }

  async read(image: ImageInput): Promise<ReaderResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 128,
      temperature: 0,
      system: ODOMETER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data.toString("base64"),
              },
            },
            { type: "text", text: ODOMETER_USER_PROMPT },
          ],
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return parseReaderResponse(text);
  }
}
