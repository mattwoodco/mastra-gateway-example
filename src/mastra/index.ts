import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
// import { storyWriterAgent, storyWriterWorkflow } from "./agents/story-writer";
import { storyTellerAgent } from "./agents/story-teller-voice";
import { storage } from "./stores";

export const mastra = new Mastra({
  agents: { storyTellerAgent },
  // agents: { storyWriterAgent },
  // workflows: { storyWriterWorkflow },
  storage,
  telemetry: { enabled: false },
  logger: new PinoLogger({ name: "Mastra", level: "debug" }),
});
