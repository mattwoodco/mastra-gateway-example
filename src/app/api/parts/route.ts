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

          // Stream the agent's response and forward to writer
          for await (const chunk of agentStream.fullStream) {
            console.log("🔍 Processing chunk:", chunk.type, chunk);

            // Forward text chunks
            if (chunk.type === "text-delta") {
              writer.write({
                type: "text-delta",
                id: chunk.id || "text-0",
                delta: chunk.text || "",
              });
            }

            // Handle tool results and create custom UI data
            if (chunk.type === "tool-result" && !toolResultsProcessed) {
              toolResultsProcessed = true;
              console.log("🔍 Processing tool result:", chunk);

              // Send processing status
              writer.write({
                type: "data-status",
                data: {
                  phase: "Processing",
                  message: "Generating parts inventory...",
                },
              });

              // Send layout update
              writer.write({
                type: "data-layout",
                id: "layout-1",
                data: {
                  layout: {
                    type: "grid",
                    columns: 2,
                    rows: 2,
                  },
                },
              });

              // Extract parts from tool result
              if (chunk.output?.parts) {
                const parts = chunk.output.parts;
                const equipment = chunk.input || userMessage;

                // Send parsing status
                writer.write({
                  type: "data-status",
                  data: {
                    phase: "Parsing",
                    message: "Formatting parts list...",
                  },
                });

                // Send parts data for custom UI
                writer.write({
                  type: "data-parts",
                  data: {
                    equipment: equipment,
                    parts: parts,
                    total: parts.length,
                  },
                });

                // Send completion status
                writer.write({
                  type: "data-status",
                  data: {
                    phase: "Complete",
                    message: `Found ${parts.length} parts for ${equipment}`,
                  },
                });
              }
            }
          }

          // Final completion status if no tool results were processed
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
