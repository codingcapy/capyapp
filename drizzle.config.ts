import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./schemas",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CONNECTIONSTRING!,
  },
});
