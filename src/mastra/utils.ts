import { gateway } from "@ai-sdk/gateway";
import { Agent } from "@mastra/core/agent";
import { memory } from "./memory";

interface AgentOptions {
  tools?: unknown;
  workflows?: unknown;
}

export const createAgent = (
  name: string,
  instructions: string,
  opts: AgentOptions = {},
) => {
  const config: Record<string, unknown> = {
    name,
    instructions,
    model: gateway("fireworks/gpt-oss-120b"),

    memory,
  };
  if (opts.tools) {
    config.tools = opts.tools;
  }
  if (opts.workflows) {
    config.workflows = opts.workflows;
  }
  return new Agent(config as any);
};
