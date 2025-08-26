import { mastra } from "@/mastra";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const agent = mastra.getAgent("partsAgent");

    if (!agent) {
      return new Response("Agent not found", { status: 500 });
    }

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-status",
          data: {
            phase: "Starting",
            message: "Initializing parts analysis...",
          },
        });

        try {
          const userMessage =
            messages[messages.length - 1]?.content || "engine";

          const agentStream = await agent.streamVNext(userMessage, {
            format: "aisdk",
          });

          let toolResultsProcessed = false;
          const seenChunkTypes = new Set();
          let collectedParts: Array<{ name: string; quantity: number }> = [];
          let toolEquipment = "";

          for await (const chunk of agentStream.fullStream) {
            try {
              if (!chunk || typeof chunk.type !== "string") {
                continue;
              }

              if (chunk.type === "text-start") {
                await writer.write({
                  type: "text-start",
                  id: chunk.id || "text-0",
                });
              } else if (chunk.type === "text-delta") {
                const textChunk = chunk as {
                  type: string;
                  id?: string;
                  text?: string;
                };
                const chunkText = textChunk.text;
                if (chunkText !== undefined && chunkText !== null) {
                  await writer.write({
                    type: "text-delta",
                    id: chunk.id || "text-0",
                    delta: String(chunkText),
                  });
                }
              } else if (chunk.type === "text-end") {
                await writer.write({
                  type: "text-end",
                  id: chunk.id || "text-0",
                });
              }

              if (chunk.type === "tool-result") {
                if (!toolResultsProcessed) {
                  toolResultsProcessed = true;

                  if (chunk.output?.parts) {
                    collectedParts = chunk.output.parts;
                    toolEquipment = chunk.input || userMessage;

                    await writer.write({
                      type: "data-status",
                      data: {
                        phase: "Processing",
                        message: "Generating parts inventory...",
                      },
                    });

                    await writer.write({
                      type: "data-layout",
                      id: "layout-1",
                      data: { layout: { type: "grid", columns: 2, rows: 2 } },
                    });

                    await writer.write({
                      type: "data-status",
                      data: {
                        phase: "Parsing",
                        message: "Formatting parts list...",
                      },
                    });

                    await writer.write({
                      type: "data-parts",
                      data: {
                        equipment: toolEquipment,
                        parts: collectedParts,
                        total: collectedParts.length,
                      },
                    });

                    await writer.write({
                      type: "data-status",
                      data: {
                        phase: "Complete",
                        message: `Found ${collectedParts.length} parts for ${toolEquipment}`,
                      },
                    });
                  }
                }
              }
            } catch {
              // continue processing other chunks
            }
          }

          if (!toolResultsProcessed) {
            writer.write({
              type: "data-status",
              data: {
                phase: "Complete",
                message: "Analysis completed successfully!",
              },
            });
          }
        } catch (error) {
          writer.write({
            type: "data-status",
            data: {
              phase: "Error",
              message: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          });
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
