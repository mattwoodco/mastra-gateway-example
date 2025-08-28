import z from "zod";
import { createAgent } from "../utils";
import { createTool } from "@mastra/core/tools";

const readLayoutTool = createTool({
  id: "Read Layout",
  description: "Reads the layout of the user interface",
  inputSchema: z.object({
    business_category: z
      .string()
      .describe("The business of the layout to read"),
  }),
  execute: async ({ context, writer }) => {
    await writer?.write({
      type: "data-status",
      status: "DISK_STATUS_READ",
      message: `Collecting data for ${context.business_category}`,
    });
    return {
      output: `BLUE Layout for ${context.business_category}`,
    };
  },
});

export const insiteAgent = createAgent(
  "insiteAgent",
  `You must use the readLayoutTool to get the layout of the user interface.
  You pass a business_category to the readLayoutTool.
  And get a single color description of the layout.
  `,
  { tools: { readLayoutTool } },
);
