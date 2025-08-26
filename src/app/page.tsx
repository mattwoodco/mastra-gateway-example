// import { Agent } from "@/components/agent";
// import { TTSButton } from "@/components/tts-button";

import StoryManager from "@/components/voice/story-manager";

export default function Home() {
  // const parts = [
  //   { type: "text", text: "Hello, how are you?" },
  //   { type: "text", text: "I'm doing well, thank you!" },
  // ];

  return (
    <div className="flex flex-row h-screen">
      <div className="flex">
        <StoryManager />
        {/* <Agent /> */}
      </div>
    </div>
  );
}
