// Script to set up the database schema
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function setupDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.error('Make sure you have a .env.local file with DATABASE_URL set');
    process.exit(1);
  }

  console.log('🔌 Connecting to Neon database...');
  const sql = neon(databaseUrl);

  try {
    console.log('📝 Creating scores table...');

    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create index on score
    await sql`
      CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC)
    `;

    // Create index on created_at
    await sql`
      CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC)
    `;

    console.log('✅ Database setup complete!');
    console.log('📊 Scores table created with indexes');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
