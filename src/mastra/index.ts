import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { storyTellerAgent } from "./agents/story-teller-voice";
import { storyWriterAgent, storyWriterWorkflow } from "./agents/story-writer";
import { storage } from "./stores";

export const mastra = new Mastra({
  agents: { storyWriterAgent, storyTellerAgent },
  workflows: { storyWriterWorkflow },
  storage,
  telemetry: { enabled: false },
  logger: new PinoLogger({ name: "Mastra", level: "debug" }),
});
