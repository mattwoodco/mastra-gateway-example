import { createStep, createWorkflow } from "@mastra/core/workflows";
import z from "zod";
import { createAgent, createAgentTool } from "../utils";

export const characterCreator = createAgent(
  "characterCreator",
  "Forge unforgettable heroes, rogues, and wildcards from any prompt—every single name must cheekily start with “F”. return no more than 120 characters",
);

export const settingCreator = createAgent(
  "settingCreator",
  "Conjure vivid outdoor worlds—mountaintops, midnight piers, blizzards, bazaars—always under open sky. return no more than 120 characters",
);

export const plotCreator = createAgent(
  "plotCreator",
  "Spin tight, twisty detective cases only—red herrings welcome, loose ends forbidden. return no more than 120 characters",
);

export const dialogueCreator = createAgent(
  "dialogueCreator",
  "Drop rap-style bars that snap and rhyme—dialogue with cadence, swagger, and flow. return no more than 120 characters",
);

// Look how clean! Just agent + description, everything else is automatic 🎯
const characterCreatorTool = createAgentTool(
  characterCreator,
  'Forge a fresh character from the prompt—every name starts with "F", no exceptions. return no more than 120 characters',
);

const settingCreatorTool = createAgentTool(
  settingCreator,
  "Build a cinematic outdoor setting from the prompt—fields, forests, skylines, always outside. return no more than 120 characters",
);

const plotCreatorTool = createAgentTool(
  plotCreator,
  "Craft an airtight detective plot from the prompt—mystery forward, clues crisp, twists earned. return no more than 120 characters",
);

const dialogueCreatorTool = createAgentTool(
  dialogueCreator,
  "Generate rap-style dialogue that rhymes—snappy exchanges with rhythm and punch. return no more than 120 characters",
);

export const characterCreatorStep = createStep(characterCreatorTool);
export const settingCreatorStep = createStep(settingCreatorTool);
export const plotCreatorStep = createStep(plotCreatorTool);
export const dialogueCreatorStep = createStep(dialogueCreatorTool);

export const storyWriterWorkflow = createWorkflow({
  id: "storyWriterWorkflow",
  description:
    "Lightning-fast story assembly: characters, outdoor settings, detective plots, and rhymed dialogue—generated in parallel for maximum punch.",
  inputSchema: z.object({
    input: z.string(),
  }),
  outputSchema: z.object({
    output: z.string(),
  }),
})
  .parallel([
    characterCreatorStep,
    settingCreatorStep,
    plotCreatorStep,
    dialogueCreatorStep,
  ])
  .commit();

export const storyWriterAgent = createAgent(
  "storyWriter",
  ` 
You are an imaginative, award-winning story writer AI. Your mission: craft captivating, original stories tailored to the user's input and preferences. 

Best practices:
- Always address the user by their name.
- Use the storyWriterWorkflow to create comprehensive stories. This workflow creates characters, settings, plots, and dialogue in parallel.
- Blend humor, suspense, and vivid sensory details. Show, don't tell.
- Keep stories concise, engaging, and surprising. Use natural dialogue and dynamic pacing.
- If the user gives a genre, style, or theme, adapt accordingly.
- Ask clarifying questions if input is vague.
- Never repeat yourself or the user's input verbatim.
- End with a memorable line or twist.

You are creative, collaborative, and always eager to delight. Let your storytelling shine.

always format in markdown
`,
  {
    workflows: {
      storyWriterWorkflow,
    },
  },
);
