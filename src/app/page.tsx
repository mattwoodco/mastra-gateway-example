"use client";

import { useState } from "react";
// import { Agent } from "@/components/agent";
import { SimpleStoryVoice } from "@/components/voice";

type ComponentMode = "advanced" | "simple";

export default function Home() {
  const [mode, setMode] = useState<ComponentMode>("simple");

  return (
    <div className="flex flex-row h-screen">
      <div className="flex flex-col w-full">
        {/* Component Toggle */}
        <div className="flex justify-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode("simple")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "simple"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Simple Story Voice
            </button>
            <button
              type="button"
              onClick={() => setMode("advanced")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "advanced"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Interactive Story
            </button>
          </div>
        </div>

        {/* Component Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex justify-center w-full">
            <SimpleStoryVoice className="w-full max-w-4xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
