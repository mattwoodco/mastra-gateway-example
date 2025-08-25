import { mastra } from "@/mastra";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = mastra.getAgent("weatherAgent");

  const stream = await agent.streamVNext(messages, {
    format: "aisdk",
  });

  return new Response(
    stream.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      sendSources: true,
    }).body,
  );
}
