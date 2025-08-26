import { mastra } from "@/mastra";
import { stepCountIs } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = mastra.getAgent("storyTellerAgent");

  const stream = await agent.streamVNext(messages, {
    format: "aisdk",
    toolChoice: "required",
    stopWhen: stepCountIs(12),
  });

  return new Response(
    stream.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      sendSources: true,
    }).body,
  );
}
