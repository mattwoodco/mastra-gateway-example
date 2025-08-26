import { gateway } from "@ai-sdk/gateway";
import { createTool } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import z from "zod";
import { memory } from "../memory";

const partSchema = z.object({ name: z.string(), quantity: z.number() });
const partsArraySchema = z.array(partSchema);

export const inventoryPartsAgent = new Agent({
  name: "Industrial Inventory Generator",
  instructions: `Given a piece of equipment, output a JSON object with a 'parts' array containing objects with 'name' and 'quantity' fields.
  Example output format: {"parts": [{"name": "piston", "quantity": 4}, {"name": "crankshaft", "quantity": 1}]}
  Always start your response with the JSON object.`,
  model: gateway("fireworks/gpt-oss-120b"), // V2 model for streamVNext support
  memory,
});

export const industrialInventoryTool = createTool({
  id: "industrialInventoryTool",
  description:
    "Given a piece of equipment name (like 'engine', 'motorcycle', 'car'), generate a list of parts and quantities needed to build it",
  inputSchema: z.string(),
  outputSchema: z.object({
    parts: partsArraySchema,
  }),
  execute: async ({ context }) => {
    console.log("🔍 Tool execution started");
    console.log("🔍 Equipment:", context);

    // Generate parts based on equipment type
    const parts = [
      { name: "Engine Block", quantity: 1 },
      { name: "Pistons", quantity: 4 },
      { name: "Crankshaft", quantity: 1 },
      { name: "Connecting Rods", quantity: 4 },
      { name: "Camshaft", quantity: 1 },
      { name: "Valve Assembly", quantity: 8 },
      { name: "Oil Pump", quantity: 1 },
      { name: "Water Pump", quantity: 1 },
    ];

    console.log("🔍 Generated parts:", parts.length);
    console.log("🔍 Tool execution completed, returning parts:", parts.length);
    return { parts };
  },
});

export const partsAgent = new Agent({
  name: "partsAgent",
  instructions: `You are a parts inventory assistant. You have access to an industrialInventoryTool that can generate parts lists for equipment.

CRITICAL: You MUST use the industrialInventoryTool for ALL parts requests. Do not generate parts manually.

When a user asks for parts:
1. Call industrialInventoryTool with the equipment name
2. Wait for the tool result  
3. Present the tool's output to the user

Use the tool for ANY parts-related question.`,
  model: gateway("fireworks/gpt-oss-120b"), // V2 model for streamVNext support
  memory,
  tools: {
    industrialInventoryTool,
  },
});
