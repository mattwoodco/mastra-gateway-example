// biome-ignore-all lint/suspicious/noExplicitAny: not needed
import { mastra } from "../../../mastra";
import type { NextRequest } from "next/server";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  const agent = await mastra.getAgent("insiteAgent");
  const insiteAgentStream = await agent.streamVNext(messages, {
    format: "aisdk",
  });

  const uiMessageStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for await (const chunk of insiteAgentStream.fullStream) {
        // @ts-expect-error - TODO: fix this
        if (chunk?.type === "tool-output") {
          // @ts-expect-error - TODO: fix this
          const { type = "data-tool-output", ...data } = chunk.output;
          writer.write({ type, data });
        }
      }
      writer.merge(insiteAgentStream.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream: uiMessageStream });
}
