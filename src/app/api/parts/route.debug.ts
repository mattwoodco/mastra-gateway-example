import { mastra } from "@/mastra";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    console.log("🔍 Parts API route called");
    const { messages } = await req.json();
    console.log("🔍 Messages received:", messages.length);

    const agent = mastra.getAgent("partsAgent");
    console.log("🔍 Agent retrieved:", agent ? "exists" : "null");

    if (!agent) {
      console.error("❌ Agent 'partsAgent' not found!");
      return new Response("Agent not found", { status: 500 });
    }

    // Use the new createUIMessageStream approach integrated with Mastra agent
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        console.log("🔍 UI Message Stream execute called");

        // Send initial status
        writer.write({
          type: "data-status",
          data: {
            phase: "Starting",
            message: "Initializing parts analysis...",
          },
        });

        try {
          // Use streamVNext with aisdk format for compatibility
          const userMessage =
            messages[messages.length - 1]?.content || "engine";
          console.log("🔍 Calling agent streamVNext with:", userMessage);

          const agentStream = await agent.streamVNext(userMessage, {
            format: "aisdk",
          });
          console.log("🔍 Agent stream created successfully");

          let toolResultsProcessed = false;
          const seenChunkTypes = new Set();
          let collectedParts: Array<{ name: string; quantity: number }> = [];
          let toolEquipment = "";

          // Stream the agent's response and forward to writer
          for await (const chunk of agentStream.fullStream) {
            try {
              if (!seenChunkTypes.has(chunk.type)) {
                seenChunkTypes.add(chunk.type);
                console.log("🔍 NEW CHUNK TYPE:", chunk.type);
              }
              console.log("🔍 Processing chunk:", chunk.type, chunk);

              // Add comprehensive chunk validation
              if (!chunk || typeof chunk.type !== "string") {
                console.error("❌ Invalid chunk structure:", chunk);
                continue;
              }

              // Forward text chunks with proper validation
              if (chunk.type === "text-start") {
                try {
                  await writer.write({
                    type: "text-start",
                    id: chunk.id || "text-0",
                  });
                } catch (error) {
                  console.error(
                    "❌ Error processing text-start chunk:",
                    error,
                    chunk,
                  );
                }
              } else if (chunk.type === "text-delta") {
                try {
                  const textChunk = chunk as {
                    type: string;
                    id?: string;
                    text?: string;
                  };
                  const chunkText = textChunk.text;
                  // Only write if text is defined and not null
                  if (chunkText !== undefined && chunkText !== null) {
                    await writer.write({
                      type: "text-delta",
                      id: chunk.id || "text-0",
                      delta: String(chunkText), // Ensure it's a string
                    });
                  } else {
                    console.log(
                      "🔍 Skipping text-delta chunk with undefined/null text:",
                      chunk,
                    );
                  }
                } catch (error) {
                  console.error(
                    "❌ Error processing text-delta chunk:",
                    error,
                    chunk,
                  );
                }
              } else if (chunk.type === "text-end") {
                try {
                  await writer.write({
                    type: "text-end",
                    id: chunk.id || "text-0",
                  });
                } catch (error) {
                  console.error(
                    "❌ Error processing text-end chunk:",
                    error,
                    chunk,
                  );
                }
              }

              // Handle tool results and collect data (don't write during stream)
              if (chunk.type === "tool-result") {
                if (!toolResultsProcessed) {
                  toolResultsProcessed = true;
                  console.log(
                    "🔍 FOUND TOOL RESULT - Processing immediately:",
                    chunk,
                  );
                  console.log(
                    "🔍 Tool result output:",
                    JSON.stringify(chunk.output, null, 2),
                  );

                  // Collect parts from tool result
                  if (chunk.output?.parts) {
                    collectedParts = chunk.output.parts;
                    toolEquipment = chunk.input || userMessage;

                    console.log("🔍 Parts collected:", collectedParts);
                    console.log("🔍 Equipment collected:", toolEquipment);

                    // Write custom UI data IMMEDIATELY during stream processing
                    console.log(
                      "🔧 DURING-STREAM: Writing custom data immediately...",
                    );

                    try {
                      await writer.write({
                        type: "data-status",
                        data: {
                          phase: "Processing",
                          message: "Generating parts inventory...",
                        },
                      });
                      console.log("✅ Wrote processing status");

                      await writer.write({
                        type: "data-layout",
                        id: "layout-1",
                        data: { layout: { type: "grid", columns: 2, rows: 2 } },
                      });
                      console.log("✅ Wrote layout");

                      await writer.write({
                        type: "data-status",
                        data: {
                          phase: "Parsing",
                          message: "Formatting parts list...",
                        },
                      });
                      console.log("✅ Wrote parsing status");

                      await writer.write({
                        type: "data-parts",
                        data: {
                          equipment: toolEquipment,
                          parts: collectedParts,
                          total: collectedParts.length,
                        },
                      });
                      console.log("✅ Wrote parts data");

                      await writer.write({
                        type: "data-status",
                        data: {
                          phase: "Complete",
                          message: `Found ${collectedParts.length} parts for ${toolEquipment}`,
                        },
                      });
                      console.log("✅ Wrote completion status");
                    } catch (error) {
                      console.error("❌ Error writing custom data:", error);
                    }
                  } else {
                    console.log("🔍 No parts found in chunk output");
                  }
                }
              }
            } catch (chunkError) {
              console.error(
                "❌ Error processing individual chunk:",
                chunkError,
                chunk,
              );
              // Continue processing other chunks
            }
          }

          console.log("🔍 Stream processing completed!");
          console.log("🔍 Seen chunk types:", Array.from(seenChunkTypes));
          console.log("🔍 Tool results processed:", toolResultsProcessed);

          // Custom data already written during stream processing
          console.log(
            "🔧 STREAM COMPLETED - Custom data written during processing:",
            {
              toolResultsProcessed,
              collectedPartsLength: collectedParts.length,
            },
          );

          // Send fallback completion only if no tool results were processed
          if (!toolResultsProcessed) {
            // Fallback if no tool results processed
            console.log(
              "🔍 No tool results processed, sending fallback completion",
            );
            writer.write({
              type: "data-status",
              data: {
                phase: "Complete",
                message: "Analysis completed successfully!",
              },
            });
          }
        } catch (error) {
          console.error("❌ Agent execution error:", error);
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

    console.log("🔍 Creating UI message stream response...");
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("❌ API Error:", error);
    console.error(
      "❌ Error stack:",
      error instanceof Error ? error.stack : "No stack",
    );
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
