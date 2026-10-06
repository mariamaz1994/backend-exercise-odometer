import { createApp } from "./app";
import { ClaudeReader } from "./odometer/ClaudeReader";
import { MockReader } from "./odometer/MockReader";
import type { OdometerReader } from "./odometer/reader";

const port = process.env.PORT || 3000;
const reader: OdometerReader = process.env.ANTHROPIC_API_KEY
  ? new ClaudeReader()
  : new MockReader();

console.log(`Using ${reader instanceof ClaudeReader ? "ClaudeReader" : "MockReader"}`);

const app = createApp(reader, {
  log: (entry) => console.log(JSON.stringify(entry)),
});

app.listen(port, () => {
  console.log(`Application is running at http://localhost:${port}`);
});
