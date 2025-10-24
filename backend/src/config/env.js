import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load order:
// 1) Repo root .env (baseline for dev tooling)
dotenv.config({ path: join(__dirname, '../../../.env') });

// 2) backend/.env (service-specific defaults)
dotenv.config({ path: join(__dirname, '../../.env') });

// 3) backend/.env.production (override for production deploys)
dotenv.config({ path: join(__dirname, '../../.env.production'), override: true });

export {};
