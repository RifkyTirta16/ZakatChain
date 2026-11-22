import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './models/db.js';
import { upsertPovertyRows } from './controllers/mappingController.js';
import { PovertyImportSchema } from './utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROVINCES_FILE = path.join(__dirname, 'data', 'poverty_provinces_38.json');
const CITIES_FILE = path.join(__dirname, 'data', 'poverty_cities.json');

function loadAndValidate(filePath: string) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const parsed = PovertyImportSchema.safeParse({ data: raw });
  if (!parsed.success) {
    console.error(`Validation failed for ${path.basename(filePath)}:`, parsed.error.issues);
    process.exit(1);
  }
  return parsed.data.data;
}

async function seedPovertyData() {
  const provinceRows = loadAndValidate(PROVINCES_FILE);
  const cityRows = fs.existsSync(CITIES_FILE) ? loadAndValidate(CITIES_FILE) : [];

  const db = await initDb();
  try {
    const provCount = await upsertPovertyRows(db, provinceRows);
    const cityCount = cityRows.length > 0 ? await upsertPovertyRows(db, cityRows) : 0;
    console.log(
      `Seeded ${provCount} province and ${cityCount} city/kabupaten poverty records into poverty_stats.`
    );
  } finally {
    await db.close();
  }
}

seedPovertyData().catch((err) => {
  console.error('Poverty seed error:', err);
  process.exit(1);
});
