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
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { useState } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./ai-elements/reasoning";

export function Agent({
  api = "/api/chat",
  hideReasoning = false,
  hideTools = false,
}: {
  api?: string;
  hideReasoning?: boolean;
  hideTools?: boolean;
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: api,
    }),
    onData: ({ data, type }) => {
      console.log("🚀 ~ Agent ~ onData triggered:");
      console.log("🚀 ~ Data type:", type);
      console.log("🚀 ~ Data content:", JSON.stringify(data, null, 2));
      console.log("🚀 ~ Full data object:", data);

      // Check if this is our custom data
      if (type.startsWith("data-")) {
        console.log("🔧 ~ CUSTOM DATA RECEIVED:", type, data);
      }
    },
    onFinish: (data) => {
      console.log("🔧 ~ STREAM FINISHED:", {
        data,
        timestamp: Date.now(),
      });
    },
    onError: (error) => {
      console.log("🔧 ~ STREAM ERROR:", error, { timestamp: Date.now() });
    },
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
            console.log(
              "🚀 ~ Rendering message:",
              message.id,
              "parts count:",
              message.parts?.length,
            );
            console.log(
              "🚀 ~ Message parts types:",
              message.parts?.map((p) => p.type),
            );
            return (
              <div key={message.id}>
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts?.map?.((part, i) => {
                      // tool-* parts
                      if (
                        typeof part.type === "string" &&
                        part.type.startsWith("tool-") &&
                        !hideTools
                      ) {
                        const p = part as ToolUIPart;
                        return (
                          <Tool key={`${message.id}-${i}`} defaultOpen>
                            <ToolHeader type={p.type} state={p.state} />
                            <ToolContent>
                              <ToolInput input={p.input} />
                              <ToolOutput
                                output={
                                  p.output ? (
                                    <div>{JSON.stringify(p.output)}</div>
                                  ) : undefined
                                }
                                errorText={p.errorText}
                              />
                            </ToolContent>
                          </Tool>
                        );
                      }
                      if (part.type === "data-layout") {
                        const p = part as {
                          type: "data-layout";
                          id?: string;
                          data?: {
                            layout?: {
                              type?: string;
                              columns?: number;
                              rows?: number;
                            };
                          };
                        };

                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs"
                          >
                            <div className="font-medium text-slate-700 mb-2">
                              🎛️ Layout Update: {p.id}
                            </div>
                            <div className="text-slate-600">
                              Type: {p.data?.layout?.type || "unknown"} | Grid:{" "}
                              {p.data?.layout?.columns || 0}×
                              {p.data?.layout?.rows || 0}
                            </div>
                          </div>
                        );
                      }

                      // data-status parts (from writer.write({ type: "status", data: { phase, message } }))
                      if (part.type === "data-status") {
                        console.log("🚀 ~ Rendering data-status part:", part);
                        const p = part as {
                          type: "data-status";
                          data?: {
                            phase?: string;
                            message?: string;
                          };
                        };

                        const getPhaseColor = (phase?: string) => {
                          switch (phase?.toLowerCase()) {
                            case "starting":
                              return "bg-blue-100/80 text-blue-800 border-blue-200";
                            case "processing":
                              return "bg-yellow-100/80 text-yellow-800 border-yellow-200";
                            case "parsing":
                              return "bg-orange-100/80 text-orange-800 border-orange-200";
                            case "complete":
                              return "bg-green-100/80 text-green-800 border-green-200";
                            case "error":
                              return "bg-red-100/80 text-red-800 border-red-200";
                            default:
                              return "bg-muted/50 text-muted-foreground border-muted";
                          }
                        };

                        const getPhaseIcon = (phase?: string) => {
                          switch (phase?.toLowerCase()) {
                            case "starting":
                              return "🔄";
                            case "processing":
                              return "⚙️";
                            case "parsing":
                              return "📝";
                            case "complete":
                              return "✅";
                            case "error":
                              return "❌";
                            default:
                              return "ℹ️";
                          }
                        };

                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className={`rounded-md border px-3 py-2 text-xs font-medium transition-all duration-200 ${getPhaseColor(p.data?.phase)}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {getPhaseIcon(p.data?.phase)}
                              </span>
                              <span className="font-semibold">
                                {p.data?.phase}
                              </span>
                              {p.data?.message && (
                                <span className="font-normal opacity-90">
                                  — {p.data.message}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // data-parts parts (custom parts display)
                      if (part.type === "data-parts") {
                        const p = part as {
                          type: "data-parts";
                          data?: {
                            equipment?: string;
                            parts?: Array<{ name: string; quantity: number }>;
                            total?: number;
                          };
                        };

                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className="rounded-md bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-200 p-4"
                          >
                            <div className="font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                              🔧 Parts Inventory for {p.data?.equipment}
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs">
                                {p.data?.total} items
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {p.data?.parts?.map((part, idx) => (
                                <div
                                  key={`${part.name}-${idx}`}
                                  className="bg-white rounded border border-gray-200 p-2 flex justify-between items-center"
                                >
                                  <span className="font-medium text-gray-800">
                                    {part.name}
                                  </span>
                                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                                    ×{part.quantity}
                                  </span>
                                </div>
                              )) || (
                                <div className="text-gray-500 italic">
                                  No parts found
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

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
                          if (hideReasoning) return null;
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
