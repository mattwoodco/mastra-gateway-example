"use client";

import { Agent } from "@/components/agent";
import { TextToSpeech } from "@/components/voice";

export default function Home() {
  return (
    <div className="flex w-full h-full flex-1 p-8">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto">
          <Agent />
        </div>
      </div>

      {/* Component Content */}
      <div className="flex flex-1 overflow-hidden flex-col">
        <TextToSpeech className="w-full max-w-4xl" />
      </div>
    </div>
  );
}
