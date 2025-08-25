import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent";
import { storage } from "./stores";

export const mastra = new Mastra({
  agents: { weatherAgent },
  storage,
  telemetry: { enabled: false },
  logger: new PinoLogger({ name: "Mastra", level: "info" }),
});
