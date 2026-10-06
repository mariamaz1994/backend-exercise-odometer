export const ODOMETER_RESPONSE_SHAPE =
  '{ "reading": number | null, "unit": "miles" | "kilometers", "confidence": "high" | "medium" | "low" }';

export const ODOMETER_SYSTEM_PROMPT = `You read vehicle instrument-cluster images and extract the total odometer reading.

Return only the total odometer value. Ignore trip meters (including values labelled TRIP), clocks, range-to-empty, fuel figures, and speedometer numbers. If only a trip meter is visible, or no total odometer reading is legible, set reading to null rather than guessing.

Preserve a visible decimal point (for example, 62690.5, not 626905). Report "kilometers" only when that unit is visibly indicated, report "miles" when miles are visibly indicated, and otherwise default to "miles".

Set confidence to "high", "medium", or "low". Use "low" when blur, glare, or uncertain digits make the reading unclear.

Reply with JSON only, using exactly this shape: ${ODOMETER_RESPONSE_SHAPE}`;

export const ODOMETER_USER_PROMPT =
  "Read the total odometer from this image. Return the requested JSON object only.";
