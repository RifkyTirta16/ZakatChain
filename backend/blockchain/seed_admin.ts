// Creates or updates an initial ADMIN account using ADMIN_USERNAME and ADMIN_PASSWORD
// environment variables. Safe for production use; never logs plaintext passwords.
// Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=... npm run create:admin
//        ADMIN_USERNAME=admin ADMIN_PASSWORD=... npm run create:admin -- --update
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from './models/db.js';
import { RegisterSchema, formatIssues } from './utils/validation.js';

const BCRYPT_ROUNDS = 10;

async function main() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
  dotenv.config({ path: envPath });

  const username = process.env.ADMIN_USERNAME?.trim() ?? '';
  const password = process.env.ADMIN_PASSWORD ?? '';
  const allowUpdate = process.argv.includes('--update');

  const parsed = RegisterSchema.safeParse({ username, password });
  if (!parsed.success) {
    console.error('ADMIN_USERNAME / ADMIN_PASSWORD tidak memenuhi aturan validasi:', formatIssues(parsed.error));
    process.exit(1);
  }

  const db = await initDb();
  try {
    const hash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
    const existing = await db.get<{ id: number; role: string }>(
      'SELECT id, role FROM users WHERE username = ?',
      [parsed.data.username]
    );

    if (existing && !allowUpdate) {
      console.error(`Akun '${parsed.data.username}' sudah ada. Jalankan dengan --update bila ingin memperbarui kata sandi dan perannya ke ADMIN.`);
      process.exit(1);
    }

    if (existing) {
      await db.run('UPDATE users SET password = ?, role = ? WHERE id = ?', [hash, 'ADMIN', existing.id]);
      console.log(`Akun ADMIN '${parsed.data.username}' diperbarui.`);
    } else {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
        parsed.data.username,
        hash,
        'ADMIN',
      ]);
      console.log(`Akun ADMIN '${parsed.data.username}' dibuat.`);
    }
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error('create:admin gagal:', error instanceof Error ? error.message : 'unknown error');
  process.exit(1);
});
