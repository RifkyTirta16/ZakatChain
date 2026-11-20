// Creates or refreshes one local test account per role. Development only.
// Usage: npm run seed:test-users            create/update accounts
//        npm run seed:test-users -- --remove delete ONLY the four test accounts
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb, type Database } from './models/db.js';

// Must match BCRYPT_ROUNDS in controllers/authController.ts.
const BCRYPT_ROUNDS = 10;
// 18 random bytes -> 24 base64url chars; satisfies RegisterSchema (10-128 chars).
const PASSWORD_BYTES = 18;

// Role values mirror middleware/auth.ts; donors are 'USER' (what register creates).
const TEST_ACCOUNTS = [
  { username: 'test_donor', role: 'USER' },
  { username: 'test_amil', role: 'AMIL' },
  { username: 'test_auditor', role: 'AUDITOR' },
  { username: 'test_admin', role: 'ADMIN' },
] as const;

const credentialsFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.test-accounts.local',
);

const generatePassword = (): string => crypto.randomBytes(PASSWORD_BYTES).toString('base64url');

async function upsertAccount(db: Database, username: string, role: string, password: string) {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) {
    await db.run('UPDATE users SET password = ?, role = ? WHERE username = ?', [hash, role, username]);
    return;
  }
  await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role]);
}

async function createAccounts(db: Database) {
  const lines: string[] = ['# Local test credentials. Never commit or share.'];
  for (const account of TEST_ACCOUNTS) {
    const password = generatePassword();
    await upsertAccount(db, account.username, account.role, password);
    lines.push(`${account.username} ${account.role} ${password}`);
  }
  fs.writeFileSync(credentialsFile, `${lines.join('\n')}\n`, { mode: 0o600 });
  fs.chmodSync(credentialsFile, 0o600);
  console.log(`${TEST_ACCOUNTS.length} akun dibuat, kredensial di backend/.test-accounts.local`);
}

async function removeAccounts(db: Database) {
  const usernames = TEST_ACCOUNTS.map((account) => account.username);
  const placeholders = usernames.map(() => '?').join(', ');
  const result = await db.run(`DELETE FROM users WHERE username IN (${placeholders})`, usernames);
  if (fs.existsSync(credentialsFile)) fs.unlinkSync(credentialsFile);
  console.log(`${result.changes ?? 0} akun uji dihapus.`);
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('seed_test_users ditolak: NODE_ENV=production.');
    process.exit(1);
  }
  const db = await initDb();
  try {
    if (process.argv.includes('--remove')) {
      await removeAccounts(db);
    } else {
      await createAccounts(db);
    }
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error('seed_test_users gagal:', error instanceof Error ? error.message : 'unknown error');
  process.exit(1);
});
