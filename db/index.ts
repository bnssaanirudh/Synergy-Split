import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export type RuntimeBindings = {
  DB?: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_FALLBACK_MODEL?: string;
};

export function getRuntimeEnv(): RuntimeBindings {
  return (globalThis as typeof globalThis & { __SYNERGYSPLIT_ENV?: RuntimeBindings })
    .__SYNERGYSPLIT_ENV ?? {};
}

export function getD1(): D1Database {
  const database = getRuntimeEnv().DB;
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set d1 to DB in .openai/hosting.json.",
    );
  }
  return database;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}
