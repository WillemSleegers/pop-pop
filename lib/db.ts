// Shared Neon database client (server-side only)

import { neon } from '@neondatabase/serverless';

export const sql = neon(process.env.DATABASE_URL!);
