import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// Lazy connection: the app can build without DATABASE_URL, and the error is
// clear at request time if the variable is missing. Server-side only (never NEXT_PUBLIC_).
let _db;
function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local");
    }
    _db = drizzle(neon(process.env.DATABASE_URL));
  }
  return _db;
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getDb();
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  }
);
