// tests/global-setup.ts
// Runs once before Playwright spawns workers.
// Writes loaded env vars to a JSON file so workers can read them.
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const globalSetup = async () => {
  const rootDir = path.resolve(__dirname, '..');
  const envTestPath = path.join(rootDir, 'tests', '.env.test');
  dotenv.config({ path: envTestPath, override: true });

  const envFile = path.join(__dirname, '.env.json');
  fs.writeFileSync(envFile, JSON.stringify(process.env, null, 2), 'utf-8');
  console.log('[globalSetup] API_BASE_URL:', process.env.API_BASE_URL);
};

export default globalSetup;
