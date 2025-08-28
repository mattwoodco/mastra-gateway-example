import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { storage } from "./stores";
import { insiteAgent } from "./agents/insite-agent";

export const mastra = new Mastra({
  agents: {
    insiteAgent,
  },
  storage,
  telemetry: { enabled: false },
  logger: new PinoLogger({ name: "Mastra", level: "debug" }),
});
