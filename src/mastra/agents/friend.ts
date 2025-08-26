import { gateway } from "@ai-sdk/gateway";
import { createTool } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import z from "zod";
import { memory } from "../memory";

export const storyArcAgent = new Agent({
  name: "storyArc",
  instructions:
    "You are a story arc generator. You generate a story arc using a single input theme.",
  model: gateway("fireworks/gpt-oss-120b"),
  memory,
});

export const songStoryArcTool = createTool({
  id: "songStoryArc",
  description: "Generate a country song story arc using a single input theme",
  // Accept both { theme } (preferred) and { input } (fallback) since some callers send "input"
  inputSchema: z
    .object({ theme: z.string().describe("Song theme or title") })
    .or(z.object({ input: z.string().describe("Song theme or title") })),
  outputSchema: z.object({ output: z.string() }),
  execute: async ({ context }) => {
    const c = context as { theme?: string; input?: string } | undefined;
    const theme = c?.theme ?? c?.input;
    // Minimal guard to avoid undefined .map errors downstream
    if (!theme || typeof theme !== "string") {
      return { output: "" };
    }
    const result = await storyArcAgent.generateVNext(theme);
    return { output: result.text };
  },
});

export const sloganAgent = new Agent({
  name: "slogan",
  instructions:
    "You are a slogan generator. You generate a slogan using a single input story arc.",
  model: gateway("fireworks/gpt-oss-120b"),
  memory,
});

export const cartoonSloganTool = createTool({
  id: "cartoonSlogan",
  description: "Generate a cartoon slogan using a single input story arc",
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ output: z.string() }),
  execute: async ({ context }) => {
    const result = await sloganAgent.generateVNext(context.input);
    return { output: result.text };
  },
});

export const friendAgent = new Agent({
  name: "friend",
  instructions:
    "You are a friend who is always there to write a song. You start with the song story arc and then use the songStoryArcTool to generate the song. First you ensure the user has provided a name for the song, and then you generate the story arc using the songStoryArcTool. And then you reflect on the story arc and create a three verse outline of the song. And then you use the cartoonSloganTool to generate a slogan for the song.",

  model: gateway("fireworks/gpt-oss-120b"),
  memory,
  tools: {
    songStoryArcTool,
    cartoonSloganTool,
  },
});
