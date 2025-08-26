import { mastra } from "@/mastra";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const {
      text,
      // threadId, resourceId
    } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "Text is required and must be a non-empty string",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const agent = mastra.getAgent("storyTellerAgent");

    // For now, skip story generation to test basic TTS functionality
    // TODO: Fix updateWorkingMemory schema issue in agent configuration
    const finalText = text;

    // Convert to speech
    const audioStream = await agent.voice.speak(finalText);

    if (!audioStream) {
      return new Response(
        JSON.stringify({ error: "Failed to generate audio stream" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Return the audio stream with proper headers
    return new Response(audioStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "X-Generated-Text-Length": finalText.length.toString(),
      },
    });
  } catch (error) {
    console.error("TTS API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error during text-to-speech conversion",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
