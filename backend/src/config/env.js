import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from backend/.env (if exists)
dotenv.config({ path: join(__dirname, '../../.env') });
// If production, load backend/.env.production to override
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: join(__dirname, '../../.env.production') });
}
// Also load repo root .env (for monorepo/local dev)
dotenv.config({ path: join(__dirname, '../../../.env') });

export {};
