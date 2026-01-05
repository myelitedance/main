import { neon } from "@neondatabase/serverless";
import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// ✅ Simple query helper (nice for reads)
export const sql = neon(process.env.DATABASE_URL);

// ✅ Transaction-capable pool (required for atomic writes)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
