"use client";

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "@/components/ai-elements/prompt-input";
import AudioPlayer from "@/components/voice/audio-player";
import { useState } from "react";

interface SimpleStoryVoiceProps {
  className?: string;
  placeholder?: string;
  maxInputLength?: number;
}

interface StoryState {
  input: string;
  isLoading: boolean;
  audioBlob: Blob | null;
  error: string | null;
  hasGenerated: boolean;
}

const readStream = async (stream: ReadableStream): Promise<Blob> => {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new Blob(chunks as BlobPart[], { type: "audio/mp3" });
};

export default function SimpleStoryVoice({
  className = "",
  placeholder = "Enter your story idea or text to convert to speech...",
  maxInputLength = 500,
}: SimpleStoryVoiceProps) {
  const [state, setState] = useState<StoryState>({
    input: "",
    isLoading: false,
    audioBlob: null,
    error: null,
    hasGenerated: false,
  });

  const updateState = (updates: Partial<StoryState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.input.trim()) return;

    updateState({
      isLoading: true,
      error: null,
      audioBlob: null,
    });

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: state.input.trim(),
          threadId: crypto.randomUUID(),
          resourceId: "simple-story-voice",
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate audio";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("No audio stream received from server");
      }

      const audioBlob = await readStream(response.body);

      if (audioBlob.size === 0) {
        throw new Error("Received empty audio response");
      }

      updateState({
        audioBlob,
        hasGenerated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error generating audio:", error);
      updateState({
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        isLoading: false,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxInputLength) {
      updateState({ input: value, error: null });
    }
  };

  const handleReset = () => {
    updateState({
      input: "",
      audioBlob: null,
      error: null,
      hasGenerated: false,
    });
  };

  return (
    <div
      className={`relative flex h-full w-full max-w-2xl flex-col ${className}`}
    >
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Simple Story Voice
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enter a story idea to generate and hear a voice narration
          </p>
        </div>

        {/* Input Form */}
        <div className="p-4">
          <PromptInput className="bg-transparent" onSubmit={handleSubmit}>
            <PromptInputTextarea
              placeholder={placeholder}
              value={state.input}
              onChange={handleInputChange}
              disabled={state.isLoading}
              className="min-h-[120px] resize-none"
            />
            <PromptInputToolbar>
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-gray-500">
                  {state.input.length}/{maxInputLength}
                </span>
                <div className="flex gap-2">
                  {state.hasGenerated && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      disabled={state.isLoading}
                    >
                      Reset
                    </button>
                  )}
                  <PromptInputSubmit
                    disabled={!state.input.trim() || state.isLoading}
                    status={state.isLoading ? "submitted" : undefined}
                  />
                </div>
              </div>
            </PromptInputToolbar>
          </PromptInput>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>Error:</strong> {state.error}
            </p>
            <button
              type="button"
              onClick={() => updateState({ error: null })}
              className="mt-2 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {state.isLoading && (
          <div className="flex justify-center items-center py-8 mx-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
              Generating voice story...
            </span>
          </div>
        )}

        {/* Audio Player */}
        {state.audioBlob && (
          <div className="p-4">
            <div className="mb-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Generated Audio
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your story has been converted to speech
              </p>
            </div>
            <AudioPlayer audioData={state.audioBlob} />
          </div>
        )}

        {/* Success Message */}
        {state.hasGenerated && state.audioBlob && !state.isLoading && (
          <div className="mx-4 mb-4 p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              Audio generated successfully! Use the player above to listen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
