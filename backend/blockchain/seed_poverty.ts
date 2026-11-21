import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './models/db.js';
import { upsertPovertyRows } from './controllers/mappingController.js';
import { PovertyImportSchema } from './utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data', 'poverty_provinces_38.json');

async function seedPovertyData() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const parsed = PovertyImportSchema.safeParse({ data: raw });
  if (!parsed.success) {
    console.error('Validation failed for poverty dataset:', parsed.error.issues);
    process.exit(1);
  }

  const db = await initDb();
  try {
    const count = await upsertPovertyRows(db, parsed.data.data);
    console.log(`Seeded ${count} province poverty records into poverty_stats.`);
  } finally {
    await db.close();
  }
}

seedPovertyData().catch((err) => {
  console.error('Poverty seed error:', err);
  process.exit(1);
});
