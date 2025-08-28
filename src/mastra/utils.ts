import { gateway } from "@ai-sdk/gateway";
import { Agent, type AgentConfig } from "@mastra/core/agent";
import { createTool, type ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import { memory } from "./memory";

export const createAgent = (
  name: string,
  instructions: string,
  opts?: Partial<AgentConfig>,
) => {
  return new Agent({
    name,
    instructions,
    model: gateway("fireworks/gpt-oss-120b"),
    memory,
    ...opts,
  });
};

/**
 * Creates a tool from an agent with sensible defaults
 * Perfect for beginners - just pass an agent and description!
 *
 * @example
 * // Simple usage - auto-generates input/output schemas
 * const tool = createAgentTool(myAgent, "Analyzes text sentiment");
 *
 * @example
 * // Custom schemas
 * const tool = createAgentTool(myAgent, "Processes data", {
 *   input: z.object({ data: z.array(z.number()) }),
 *   output: z.object({ result: z.number() })
 * });
 *
 * @example
 * // Custom execution
 * const tool = createAgentTool(myAgent, "Custom logic", {
 *   execute: async (ctx) => ({ output: "custom" })
 * });
 */
export const createAgentTool = (
  agent: Agent,
  description: string,
  opts?: {
    input?: z.ZodObject<{ input: z.ZodString }>;
    output?: z.ZodObject<{ output: z.ZodString }>;
    execute?: (
      context: ToolExecutionContext<z.ZodObject<{ input: z.ZodString }>>,
    ) => Promise<{ output: string }>;
  },
) => {
  // Smart defaults: string input/output for text-based agents
  const inputSchema = opts?.input ?? z.object({ input: z.string() });
  const outputSchema = opts?.output ?? z.object({ output: z.string() });

  // Default execution: use agent's generateVNext for text generation
  const defaultExecute = async (
    context: ToolExecutionContext<z.ZodObject<{ input: z.ZodString }>>,
  ) => {
    const result = await agent.generateVNext(context.context.input);
    return { output: result.text };
  };

  return createTool({
    id: agent.name,
    description,
    inputSchema,
    outputSchema,
    execute: opts?.execute ?? defaultExecute,
  });
};
