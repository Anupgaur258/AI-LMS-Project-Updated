import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit does not read .env.local on its own
config({ path: ".env.local" });
config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./config/schema.js",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
