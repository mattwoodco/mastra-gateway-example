# Mastra AI Gateway

1. Oneliner
      
      ```bash
        echo "Name of your app: " && read app \
        && bunx create-next-app@latest $app --ts --tailwind --biome --app --src-dir --use-bun --no-turbopack --no-import-alias \
        && cd $app \
        && bunx shadcn@latest init -y --base-color=neutral \
        && bunx ai-elements@latest \
        && echo "AI_GATEWAY_API_KEY=XXX\nTURSO_AUTH_TOKEN=XXX\nTURSO_DATABASE_URL=XXX" > .env.local \
        && bun add mastra@latest @mastra/core@latest @mastra/libsql@latest \
        && bunx mastra@latest init --dir src --components agents,tools --example --llm openai \
        && rm .env \
        && echo ".mastra" >> .gitignore \
        && jq '.assist.actions.source.organizeImports="off"' biome.json > tmp.biome.json && mv tmp.biome.json biome.json \
        && jq '.scripts["dev:mastra"]="mastra dev --dir src/mastra"' package.json > tmp.json && mv tmp.json package.json \
        && cursor .
      ```
      
  1. Add agent client component `src/components/agent.tsx`
      
      ```bash
      "use client";
      
      import {
        Conversation,
        ConversationContent,
        ConversationScrollButton,
      } from "@/components/ai-elements/conversation";
      import { Loader } from "@/components/ai-elements/loader";
      import { Message, MessageContent } from "@/components/ai-elements/message";
      import {
        PromptInput,
        PromptInputSubmit,
        PromptInputTextarea,
        PromptInputToolbar,
      } from "@/components/ai-elements/prompt-input";
      import {
        Reasoning,
        ReasoningContent,
        ReasoningTrigger,
      } from "@/components/ai-elements/reasoning";
      import { Response } from "@/components/ai-elements/response";
      import { useChat } from "@ai-sdk/react";
      import { useState } from "react";
      
      export function Agent() {
        const [input, setInput] = useState("");
        const { messages, sendMessage, status } = useChat();
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const finalInput = input;
          if (finalInput.trim()) {
            sendMessage({ text: finalInput });
            setInput("");
          }
        };
      
        return (
          <div className="relative mt-auto flex h-[calc(100vh/1.5)] w-full max-w-xl flex-col justify-self-end overflow-hidden">
            <div className="flex h-full flex-col">
              <div className="relative mb-2 flex-1 overflow-hidden">
                <Conversation className="h-full pb-2">
                  <ConversationContent className="pb-28">
                    {messages.map((message) => (
                      <div key={message.id}>
                        <Message from={message.role} key={message.id}>
                          <MessageContent>
                            {message.parts.map((part, i) => {
                              switch (part.type) {
                                case "text":
                                  return (
                                    <Response key={`${message.id}-${i}`}>
                                      {part.text}
                                    </Response>
                                  );
                                case "reasoning":
                                  return (
                                    <Reasoning
                                      className="w-full"
                                      isStreaming={status === "streaming"}
                                      key={`${message.id}-${i}`}
                                    >
                                      <ReasoningTrigger />
                                      <ReasoningContent>{part.text}</ReasoningContent>
                                    </Reasoning>
                                  );
                                default:
                                  return null;
                              }
                            })}
                          </MessageContent>
                        </Message>
                      </div>
                    ))}
                    {status === "submitted" && <Loader />}
                  </ConversationContent>
                  <ConversationScrollButton />
                </Conversation>
                <div className="sticky bottom-0 mx-2 overflow-auto rounded-2xl border-2 border-gray-200/20 backdrop-blur-xl">
                  <PromptInput className="bg-transparent" onSubmit={handleSubmit}>
                    <PromptInputTextarea
                      onChange={(e) => setInput(e.target.value)}
                      value={input}
                    />
                    <PromptInputToolbar>
                      <PromptInputSubmit
                        className="ml-auto"
                        disabled={!input.trim() || status === "streaming"}
                        status={status}
                      />
                    </PromptInputToolbar>
                  </PromptInput>
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      ```
      
  2. Add to `src/app/page.tsx`
      
      ```bash
      import { Agent } from "@/components/agent";
      
      export default function Home() {
        return (
          <div className="flex flex-row h-screen">
            <Agent />
          </div>
        );
      }
      ```
      
  3. Update agent model `src/mastra/agents/weather-agent.ts`
      
      ```tsx
      import { gateway } from "@ai-sdk/gateway";
      // ...
      model: gateway("fireworks/gpt-oss-120b"),
      ```
      
  4. Add memory  `src/mastra/index.ts`
      
      ```tsx
      import { Mastra } from "@mastra/core/mastra";
      import { PinoLogger } from "@mastra/loggers";
      import { weatherAgent } from "./agents/weather-agent";
      import { storage } from "./stores";
      
      export const mastra = new Mastra({
        agents: { weatherAgent },
        storage,
        telemetry: { enabled: false },
        logger: new PinoLogger({ name: "Mastra", level: "info" }),
      });
      ```
      
  5. Add to Mastra instance`src/mastra/stores.ts`
      
      ```tsx
      import { LibSQLStore } from "@mastra/libsql";
      import "dotenv/config";
      
      export const storage = new LibSQLStore({
        url: process.env.TURSO_DATABASE_URL as string,
        authToken: process.env.TURSO_AUTH_TOKEN as string,
      });
      ```
      
  6. Add to Mastra instance`src/mastra/memory.ts`
      
      ```tsx
      import { Memory } from "@mastra/memory";
      import { storage } from "./stores";
      
      export const memory = new Memory({
        options: {
          workingMemory: {
            enabled: true,
            scope: "resource",
            template: `# User Profile 
        - **Name**:`,
          },
        },
        storage,
      });
      ```
      
  
  Configure lefthook
  
  ```bash
  pre-commit:
    parallel: true
    jobs:
      - name: biome-check
        glob: "*.{js,ts,jsx,tsx,json}"
        run: bunx biome check --write {staged_files}
        stage_fixed: true
  
  pre-push:
    jobs:
      - name: type-check
        run: bun run check-types
      - name: biome-ci
        run: bunx biome ci .
  ```
