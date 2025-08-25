import { LibSQLStore } from "@mastra/libsql";
import "dotenv/config";

export const storage = new LibSQLStore({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});
