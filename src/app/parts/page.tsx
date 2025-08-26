"use client";

import { Agent } from "@/components/agent";

export default function Home() {
  return (
    <div className="flex w-full h-full flex-1">
      <div className="flex-1">
        <div className="max-w-lg mx-auto">
          <Agent api="/api/parts" hideReasoning={true} hideTools={true} />
        </div>
      </div>
    </div>
  );
}
