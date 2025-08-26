# Voice Story Generation Implementation Plan

This document provides a comprehensive plan to create a new voice story generation system using Mastra, replacing the current complex interactive story system with a streamlined API-based approach.

## Overview

The implementation replaces the current client-side Mastra connection with a proper server-side API route that streams audio back to a simplified client component.

## Implementation Sequence

### Phase 1: API Route Implementation
### Phase 2: Component Creation  
### Phase 3: Page Integration
### Phase 4: Testing & Validation

---

## Phase 1: API Route Implementation

### File: `/src/app/api/tts/route.ts`

**Replace existing content with:**

```typescript
import { mastra } from "@/mastra";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { text, threadId, resourceId } = await req.json();
    
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required and must be a non-empty string' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the story teller agent
    const agent = mastra.getAgent("storyTellerAgent");
    
    // Determine if this is a story prompt or direct text
    const isStoryPrompt = text.length < 100 && (
      text.toLowerCase().includes('story') || 
      text.toLowerCase().includes('tale') ||
      text.toLowerCase().includes('about') ||
      text.split(' ').length < 15
    );
    
    let finalText = text;
    
    // Generate story if it's a prompt, otherwise use text directly
    if (isStoryPrompt) {
      const storyResponse = await agent.generate({
        messages: [{ 
          role: "user", 
          content: `Generate a short, engaging story: ${text}` 
        }],
        threadId: threadId || crypto.randomUUID(),
        resourceId: resourceId || "story-user",
      });
      finalText = storyResponse.text;
    }
    
    // Convert to speech
    const audioResponse = await agent.voice.speak(finalText);
    
    if (!audioResponse.body) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate audio stream' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Return the audio stream with proper headers
    return new Response(audioResponse.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
        'X-Generated-Text-Length': finalText.length.toString(),
      }
    });
    
  } catch (error) {
    console.error('TTS API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during text-to-speech conversion',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}
```

---

## Phase 2: Component Creation

### Directory: `/src/components/story-voice/`

#### File: `/src/components/story-voice/index.ts`

```typescript
export { default as SimpleStoryVoice } from './simple-story-voice';
```

#### File: `/src/components/story-voice/simple-story-voice.tsx`

```typescript
"use client";

import { useState } from "react";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
} from "@/components/ai-elements/prompt-input";
import AudioPlayer from "@/components/voice/audio-player";

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

  return new Blob(chunks, { type: "audio/mpeg" });
};

export default function SimpleStoryVoice({ 
  className = "",
  placeholder = "Enter your story idea or text to convert to speech...",
  maxInputLength = 500 
}: SimpleStoryVoiceProps) {
  const [state, setState] = useState<StoryState>({
    input: "",
    isLoading: false,
    audioBlob: null,
    error: null,
    hasGenerated: false,
  });

  const updateState = (updates: Partial<StoryState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.input.trim()) return;

    updateState({ 
      isLoading: true, 
      error: null, 
      audioBlob: null 
    });

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: state.input.trim(),
          threadId: crypto.randomUUID(),
          resourceId: "simple-story-voice"
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate audio';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('No audio stream received from server');
      }

      const audioBlob = await readStream(response.body);
      
      if (audioBlob.size === 0) {
        throw new Error('Received empty audio response');
      }

      updateState({
        audioBlob,
        hasGenerated: true,
        isLoading: false,
      });

    } catch (error) {
      console.error('Error generating audio:', error);
      updateState({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
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
    <div className={`relative flex h-full w-full max-w-2xl flex-col ${className}`}>
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
          <form onSubmit={handleSubmit}>
            <PromptInput className="bg-transparent">
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
                      status={state.isLoading ? "submitted" : "idle"}
                    />
                  </div>
                </div>
              </PromptInputToolbar>
            </PromptInput>
          </form>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>Error:</strong> {state.error}
            </p>
            <button
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
              ✅ Audio generated successfully! Use the player above to listen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 3: Page Integration

### File: `/src/app/page.tsx`

```typescript
"use client";

import { useState } from "react";
// import { Agent } from "@/components/agent";
import StoryManager from "@/components/voice/story-manager";
import { SimpleStoryVoice } from "@/components/story-voice";

type ComponentMode = 'advanced' | 'simple';

export default function Home() {
  const [mode, setMode] = useState<ComponentMode>('simple');

  return (
    <div className="flex flex-row h-screen">
      <div className="flex flex-col w-full">
        {/* Component Toggle */}
        <div className="flex justify-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setMode('simple')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'simple'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Simple Story Voice
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'advanced'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Interactive Story
            </button>
          </div>
        </div>

        {/* Component Content */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex justify-center w-full">
            {mode === 'simple' ? (
              <SimpleStoryVoice className="w-full max-w-4xl" />
            ) : (
              <StoryManager />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 4: Testing & Validation

### Test Suite Files

#### File: `/tts_test_suite.sh`

```bash
#!/bin/bash

API_URL="http://localhost:3000/api/tts"
TEST_DIR="tts_test_results"
RESULTS_FILE="../VOICE_RESULTS.md"
PASSED=0
FAILED=0
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# Setup
mkdir -p $TEST_DIR
cd $TEST_DIR

# Initialize results file
cat > $RESULTS_FILE << EOF
# Voice Story Generation Test Results

**Test Run Date:** $START_TIME  
**API Endpoint:** $API_URL  
**Test Environment:** $(uname -s) $(uname -r)

## Test Summary

EOF

echo "🎯 Starting TTS API Test Suite"
echo "=============================="

# Test 1: Basic TTS functionality
echo "Test 1: Basic TTS functionality"
test_result=""
if curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"text": "This is a basic text-to-speech test to verify the API is working correctly."}' \
  --output basic_test.mp3 \
  --max-time 35 \
  && [ -s basic_test.mp3 ] && file basic_test.mp3 | grep -q "Audio"; then
    echo "✅ PASS: Basic TTS test"
    test_result="✅ PASSED - Generated $(wc -c < basic_test.mp3) byte audio file"
    ((PASSED++))
else
    echo "❌ FAIL: Basic TTS test"
    test_result="❌ FAILED - No audio file generated or invalid format"
    ((FAILED++))
fi

cat >> $RESULTS_FILE << EOF
### Test 1: Basic TTS Functionality
- **Status:** $test_result
- **Test:** Convert simple text to audio
- **Expected:** Valid MP3 audio file generated
- **File Size:** $([ -f basic_test.mp3 ] && echo "$(wc -c < basic_test.mp3) bytes" || echo "No file generated")

EOF

# Test 2: Story Generation + TTS
echo "Test 2: Story generation with TTS"
test_result=""
if curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"text": "Generate a short story about a brave cat"}' \
  --output story_test.mp3 \
  --max-time 35 \
  && [ -s story_test.mp3 ] && file story_test.mp3 | grep -q "Audio"; then
    echo "✅ PASS: Story generation test"
    test_result="✅ PASSED - Generated $(wc -c < story_test.mp3) byte story audio"
    ((PASSED++))
else
    echo "❌ FAIL: Story generation test"
    test_result="❌ FAILED - Story generation or TTS conversion failed"
    ((FAILED++))
fi

cat >> $RESULTS_FILE << EOF
### Test 2: Story Generation + TTS
- **Status:** $test_result
- **Test:** Generate story from prompt and convert to audio
- **Expected:** Longer audio file with story content
- **File Size:** $([ -f story_test.mp3 ] && echo "$(wc -c < story_test.mp3) bytes" || echo "No file generated")

EOF

# Test 3: Error handling (missing text)
echo "Test 3: Error handling - missing text"
response=$(curl -s -w "%{http_code}" -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"threadId": "test"}' -o error_test_response.json)
http_code="${response: -3}"
test_result=""

if [[ "$http_code" == "400" ]]; then
    echo "✅ PASS: Error handling test"
    test_result="✅ PASSED - Returned HTTP 400 for missing text"
    ((PASSED++))
else
    echo "❌ FAIL: Error handling test (got HTTP $http_code)"
    test_result="❌ FAILED - Expected HTTP 400, got HTTP $http_code"
    ((FAILED++))
fi

cat >> $RESULTS_FILE << EOF
### Test 3: Error Handling (Missing Text)
- **Status:** $test_result
- **Test:** Submit request without required 'text' field
- **Expected:** HTTP 400 Bad Request
- **Actual:** HTTP $http_code
- **Response:** $([ -f error_test_response.json ] && cat error_test_response.json || echo "No response captured")

EOF

# Test 4: Thread continuity
echo "Test 4: Thread continuity"
thread_id="test-$(date +%s)"
test_result=""

# First request
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Start a story about a robot\", \"threadId\": \"$thread_id\"}" \
  --output thread_test1.mp3 --max-time 35

# Second request with same thread
curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Continue the robot story\", \"threadId\": \"$thread_id\"}" \
  --output thread_test2.mp3 --max-time 35

if [ -s thread_test1.mp3 ] && [ -s thread_test2.mp3 ] && 
   file thread_test1.mp3 | grep -q "Audio" && 
   file thread_test2.mp3 | grep -q "Audio"; then
    echo "✅ PASS: Thread continuity test"
    test_result="✅ PASSED - Both thread requests generated valid audio"
    ((PASSED++))
else
    echo "❌ FAIL: Thread continuity test"
    test_result="❌ FAILED - One or both thread requests failed"
    ((FAILED++))
fi

cat >> $RESULTS_FILE << EOF
### Test 4: Thread Continuity
- **Status:** $test_result
- **Test:** Multiple requests with same threadId
- **Expected:** Both requests generate valid audio files
- **File 1 Size:** $([ -f thread_test1.mp3 ] && echo "$(wc -c < thread_test1.mp3) bytes" || echo "No file")
- **File 2 Size:** $([ -f thread_test2.mp3 ] && echo "$(wc -c < thread_test2.mp3) bytes" || echo "No file")

EOF

# Test 5: Input validation (empty text)
echo "Test 5: Input validation - empty text"
response=$(curl -s -w "%{http_code}" -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"text": ""}' -o empty_text_response.json)
http_code="${response: -3}"
test_result=""

if [[ "$http_code" == "400" ]]; then
    echo "✅ PASS: Empty text validation"
    test_result="✅ PASSED - Rejected empty text with HTTP 400"
    ((PASSED++))
else
    echo "❌ FAIL: Empty text validation (got HTTP $http_code)"
    test_result="❌ FAILED - Should reject empty text with HTTP 400"
    ((FAILED++))
fi

cat >> $RESULTS_FILE << EOF
### Test 5: Input Validation (Empty Text)
- **Status:** $test_result
- **Test:** Submit request with empty text field
- **Expected:** HTTP 400 Bad Request
- **Actual:** HTTP $http_code

EOF

# Test 6: Long text handling
echo "Test 6: Long text handling"
long_text="This is a test with a longer piece of text that should still be processed correctly by the TTS system. The text contains multiple sentences and should result in a longer audio file. This helps test the system's ability to handle more substantial content without timing out or failing. The audio should be clear and all text should be converted to speech properly."

test_result=""
if curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$long_text\"}" \
  --output long_text_test.mp3 \
  --max-time 35 \
  && [ -s long_text_test.mp3 ] && file long_text_test.mp3 | grep -q "Audio"; then
    echo "✅ PASS: Long text test"
    test_result="✅ PASSED - Generated $(wc -c < long_text_test.mp3) byte audio from long text"
    ((PASSED++))
else
    echo "❌ FAIL: Long text test"
    test_result="❌ FAILED - Could not process longer text content"
    ((FAILED++))
fi

cat >> $RESULTS_FILE << EOF
### Test 6: Long Text Handling
- **Status:** $test_result
- **Test:** Convert longer text (multiple sentences) to audio
- **Expected:** Valid audio file with complete content
- **Text Length:** ${#long_text} characters
- **File Size:** $([ -f long_text_test.mp3 ] && echo "$(wc -c < long_text_test.mp3) bytes" || echo "No file generated")

EOF

# Performance test
echo "Test 7: Performance test"
start_time=$(date +%s.%N)
performance_result=""
if curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d '{"text": "Performance test for response time measurement"}' \
  --output performance_test.mp3 \
  --max-time 35; then
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    echo "✅ PASS: Performance test completed in ${duration}s"
    performance_result="✅ PASSED - Response time: ${duration} seconds"
    ((PASSED++))
else
    echo "❌ FAIL: Performance test"
    performance_result="❌ FAILED - Request timed out or failed"
    ((FAILED++))
fi

cat >> $RESULTS_FILE << EOF
### Test 7: Performance Test
- **Status:** $performance_result
- **Test:** Measure API response time
- **Expected:** Complete within 30 seconds
- **Threshold:** 30 seconds (maxDuration setting)

EOF

# Final summary
total_tests=$((PASSED + FAILED))
pass_rate=$(echo "scale=1; $PASSED * 100 / $total_tests" | bc)

echo ""
echo "🎯 Test Results Summary"
echo "======================"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "📊 Total: $total_tests"
echo "📈 Pass Rate: ${pass_rate}%"

cat >> $RESULTS_FILE << EOF

## Final Summary

- **Total Tests:** $total_tests
- **Passed:** $PASSED
- **Failed:** $FAILED
- **Pass Rate:** ${pass_rate}%
- **Test Completion Time:** $(date '+%Y-%m-%d %H:%M:%S')

## Recommendations

EOF

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed! System is ready for use."
    cat >> $RESULTS_FILE << EOF
✅ **All tests passed!** The voice story generation system is functioning correctly and ready for production use.

### Next Steps:
1. Deploy the updated components to production
2. Monitor system performance and user feedback
3. Consider adding additional error handling for edge cases

EOF
else
    echo "⚠️  Some tests failed. Review the issues before deployment."
    cat >> $RESULTS_FILE << EOF
⚠️ **Some tests failed.** Please review the failed test cases and address any issues before deploying to production.

### Required Actions:
1. Investigate and fix failing test cases
2. Re-run the test suite to verify fixes
3. Consider additional testing for edge cases that failed

### Failed Tests:
$(if [ $FAILED -gt 0 ]; then echo "- Review the individual test results above for specific failure details"; fi)

EOF
fi

cat >> $RESULTS_FILE << EOF

## Test Files Generated

The following test files were created during the test run:
$(ls -la *.mp3 2>/dev/null | awk '{print "- " $9 " (" $5 " bytes)"}' || echo "- No audio files generated")

## System Information

- **Test Directory:** $(pwd)
- **Node.js Version:** $(node --version 2>/dev/null || echo "Not available")
- **NPM Version:** $(npm --version 2>/dev/null || echo "Not available")
- **System:** $(uname -a)

---

*This report was generated automatically by the TTS test suite.*
EOF

echo ""
echo "📝 Detailed results saved to: $RESULTS_FILE"
echo ""

# Cleanup option
read -p "Delete test audio files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f *.mp3 *.json
    echo "Test files cleaned up."
fi

cd ..
rmdir $TEST_DIR 2>/dev/null || echo "Test directory kept (contains files)"

if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
```

#### File: `/test_integration.sh`

```bash
#!/bin/bash

echo "🔗 Starting Integration Tests"
echo "============================="

# Test if the development server is running
echo "Checking if development server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Development server not running. Please run 'npm run dev' first."
    exit 1
fi

echo "✅ Development server is running"

# Test if Mastra backend is accessible (if needed)
echo "Checking Mastra backend..."
# Note: This might need adjustment based on your Mastra setup
if ! curl -s http://localhost:4111 > /dev/null 2>&1; then
    echo "⚠️  Mastra backend might not be running at localhost:4111"
    echo "   Make sure your Mastra agents are properly configured"
fi

# Run the main test suite
echo ""
echo "Running TTS API test suite..."
chmod +x tts_test_suite.sh
./tts_test_suite.sh

echo ""
echo "🏁 Integration tests completed!"
echo "Check VOICE_RESULTS.md for detailed results."
```

---

## Parallel Execution Plan

### Subagent Task Distribution

To implement this plan efficiently using parallel subagents, distribute tasks as follows:

#### **Subagent 1: API Route Development**
```bash
# Task: Implement the TTS API route
# Files: /src/app/api/tts/route.ts
# Dependencies: None (can start immediately)
# Estimated time: 15-20 minutes
```

#### **Subagent 2: Component Development**
```bash
# Task: Create SimpleStoryVoice component
# Files: /src/components/story-voice/index.ts, /src/components/story-voice/simple-story-voice.tsx
# Dependencies: Wait for API route completion for testing
# Estimated time: 20-25 minutes
```

#### **Subagent 3: Page Integration**
```bash
# Task: Update main page with component toggle
# Files: /src/app/page.tsx
# Dependencies: Wait for component completion
# Estimated time: 10-15 minutes
```

#### **Subagent 4: Test Suite Creation**
```bash
# Task: Create comprehensive test suite
# Files: /tts_test_suite.sh, /test_integration.sh
# Dependencies: None (can prepare tests while others work)
# Estimated time: 15-20 minutes
```

### Execution Commands for Subagents

**Start all subagents simultaneously:**

```bash
# Terminal 1 - API Route
echo "Starting API Route implementation..."
# [Subagent implements /src/app/api/tts/route.ts]

# Terminal 2 - Component Development  
echo "Starting Component development..."
# [Subagent creates story-voice components]

# Terminal 3 - Page Integration
echo "Preparing page integration..."
# [Subagent waits for component completion, then updates page.tsx]

# Terminal 4 - Test Suite
echo "Creating test suite..."
# [Subagent creates test files and validation scripts]
```

### Dependency Management

1. **API Route** → Independent, start first
2. **Components** → Can develop in parallel with API, test after API completion
3. **Page Integration** → Depends on component completion
4. **Tests** → Can prepare in parallel, execute after all components ready

---

## Testing Execution Instructions

### Prerequisites

```bash
# Ensure development server is running
npm run dev

# Ensure Mastra backend is configured and running
# (Check your mastra configuration in src/mastra/)
```

### Run Tests

```bash
# Make test scripts executable
chmod +x tts_test_suite.sh
chmod +x test_integration.sh

# Run complete integration test
./test_integration.sh

# Or run just the API tests
./tts_test_suite.sh

# Manual API test
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test"}' \
  --output test.mp3 && afplay test.mp3
```

### Validation Steps

1. **API Validation**: Tests return 200 status with valid MP3 files
2. **Component Validation**: UI loads without errors, form submits successfully
3. **Integration Validation**: Toggle between simple and advanced modes works
4. **Audio Validation**: Generated audio files play correctly
5. **Error Handling**: Invalid requests return appropriate error responses

### Results Documentation

- All test results automatically saved to `VOICE_RESULTS.md`
- Audio test files generated in `tts_test_results/` directory
- Performance metrics and error logs included in results
- Pass/fail summary with recommendations for next steps

---

## Success Criteria

✅ **API Route**: Returns streaming audio for text input  
✅ **Component**: Simple form with audio playback  
✅ **Integration**: Toggle between simple and advanced modes  
✅ **Testing**: All automated tests pass  
✅ **Documentation**: Results captured in VOICE_RESULTS.md  

This plan provides a complete implementation path with parallel execution, comprehensive testing, and automated result documentation.