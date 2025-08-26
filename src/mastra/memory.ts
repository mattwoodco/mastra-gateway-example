import { Memory } from "@mastra/memory";
import { storage } from "./stores";

export const memory = new Memory({
  options: {
    workingMemory: {
      enabled: false,
      scope: "resource",
      template: `# User Profile 
 - **Name**:`,
    },
  },
  storage,
});
