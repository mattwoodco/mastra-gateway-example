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
import { Response } from "@/components/ai-elements/response";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./ai-elements/reasoning";

export function Agent({ api = "/api/chat" }: { api?: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api,
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalInput = input;
    if (finalInput.trim()) {
      sendMessage({ text: finalInput });
      setInput("");
    }
  };

  return (
    <>
      <Conversation>
        <ConversationContent className="pb-28">
          {messages.map((message) => {
            return (
              <div key={message.id}>
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts?.map?.((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <Response
                              key={`${message.id}-${i}`}
                              parseIncompleteMarkdown={true}
                            >
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
                          return (
                            <pre key={`${message.id}-${i}`}>
                              {JSON.stringify(part, null, 2)}
                            </pre>
                          );
                      }
                    })}
                  </MessageContent>
                </Message>
              </div>
            );
          })}
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
    </>
  );
}
