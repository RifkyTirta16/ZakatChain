// Populates a clean local development database with non-PII fictional demo data
// (38 provinces + 114 cities poverty reference, sample campaigns, fictional mustahik,
// donations, distribution reports with valid demo PNG proofs, and optional non-admin users).
// Refuses to run when NODE_ENV=production and never overwrites populated domain tables.
// Usage:
//   npm run seed:demo
//   DEMO_PASSWORD=... npm run seed:demo -- --with-users
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { upsertPovertyRows } from './controllers/mappingController.js';
import { uploadDirectory } from './middleware/upload.js';
import { initDb, runInTransaction } from './models/db.js';
import { generateRecordAuditHash } from './utils/crypto.js';
import { PovertyImportSchema, RegisterSchema, formatIssues } from './utils/validation.js';
import { getBlockchainWallet, getContractAddress, getZakatContract } from './utils/web3.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROVINCES_FILE = path.join(__dirname, 'data', 'poverty_provinces_38.json');
const CITIES_FILE = path.join(__dirname, 'data', 'poverty_cities.json');

// Valid 1x1 transparent PNG bytes used only for local demo proof previews.
const DEMO_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64'
);

type Db = Awaited<ReturnType<typeof initDb>>;

function loadPovertyDataset(filePath: string) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const parsed = PovertyImportSchema.safeParse({ data: raw });
  if (!parsed.success) {
    throw new Error(`Invalid poverty dataset ${path.basename(filePath)}: ${formatIssues(parsed.error)}`);
  }
  return parsed.data.data;
}

function writeDemoProofFile(filename: string): { proofUrl: string; sha256: string } {
  fs.mkdirSync(uploadDirectory, { recursive: true });
  const destination = path.join(uploadDirectory, filename);
  if (!fs.existsSync(destination)) {
    fs.writeFileSync(destination, DEMO_PNG_BYTES, { mode: 0o640 });
  }
  const bytes = fs.readFileSync(destination);
  return {
    proofUrl: `/uploads/${filename}`,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

async function seedOptionalUsers(db: Db) {
  const demoPassword = process.env.DEMO_PASSWORD ?? '';
  const parsedPassword = RegisterSchema.safeParse({ username: 'demo_muzakki', password: demoPassword });
  if (!parsedPassword.success) {
    console.error('DEMO_PASSWORD tidak memenuhi syarat kekuatan sandi:', formatIssues(parsedPassword.error));
    process.exit(1);
  }

  const hash = await bcrypt.hash(parsedPassword.data.password, 10);
  const demoAccounts: Array<{ username: string; role: 'USER' | 'AMIL' | 'AUDITOR' }> = [
    { username: 'demo_muzakki', role: 'USER' },
    { username: 'demo_amil', role: 'AMIL' },
    { username: 'demo_auditor', role: 'AUDITOR' },
  ];

  let created = 0;
  for (const account of demoAccounts) {
    const exists = await db.get<{ id: number }>('SELECT id FROM users WHERE username = ?', [account.username]);
    if (!exists) {
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
        account.username,
        hash,
        account.role,
      ]);
      created += 1;
    }
  }
  console.log(`Demo non-admin users checked (${created} created).`);
}

async function tryAnchorLocalChain(db: Db, txIds: number[]) {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL?.trim() || 'http://127.0.0.1:8545';
  const contractAddress = getContractAddress();
  if (!contractAddress) return;

  let host = '';
  try {
    host = new URL(rpcUrl).hostname;
  } catch {
    return;
  }
  if (host !== '127.0.0.1' && host !== 'localhost') return;

  const ping = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
    signal: AbortSignal.timeout(800),
  }).catch(() => null);
  if (!ping?.ok) {
    console.log('Local Hardhat node offline or skipped; demo transactions stored as PENDING_BLOCKCHAIN.');
    return;
  }

  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { cacheTimeout: -1 });
  try {
    const code = await provider.getCode(contractAddress);
    if (!code || code === '0x') {
      console.log('Local ZakatVerify contract not deployed yet; demo transactions stored as PENDING_BLOCKCHAIN.');
      return;
    }

    const wallet = getBlockchainWallet(provider) ?? (await provider.getSigner(0));
    const contract = getZakatContract(provider).connect(wallet) as ReturnType<typeof getZakatContract>;
    const signerAddress = await wallet.getAddress();

    for (const id of txIds) {
      const row = await db.get<{ id: number; audit_hash: string | null; blockchain_status: string | null }>(
        'SELECT id, audit_hash, blockchain_status FROM transactions WHERE id = ?',
        [id]
      );
      if (!row?.audit_hash || row.blockchain_status === 'CONFIRMED') continue;

      const formattedHash = ethers.id(row.audit_hash);
      const [alreadyExists] = await contract.verifyReport(formattedHash);
      if (alreadyExists) continue;

      const nonce = await provider.getTransactionCount(signerAddress, 'pending');
      const tx = await contract.registerReport(formattedHash, row.id, { nonce });
      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        await db.run(
          "UPDATE transactions SET tx_hash = ?, block_number = ?, blockchain_status = 'CONFIRMED', is_reconciled = 1 WHERE id = ?",
          [tx.hash, receipt.blockNumber, row.id]
        );
      }
    }
    console.log('Local Hardhat chain detected: confirmed demo transactions anchored on-chain.');
  } catch {
    console.log('Local Hardhat node offline or skipped; demo transactions stored as PENDING_BLOCKCHAIN.');
  } finally {
    provider.destroy();
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[SEED DEMO] Ditolak di NODE_ENV=production.');
    process.exit(1);
  }

  dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  const withUsers = process.argv.includes('--with-users');

  const db = await initDb();
  try {
    if (withUsers) {
      await seedOptionalUsers(db);
    }

    const povertyCount = await db.get<{ total: number }>('SELECT COUNT(*) AS total FROM poverty_stats');
    if ((povertyCount?.total ?? 0) === 0) {
      const provinces = loadPovertyDataset(PROVINCES_FILE);
      const cities = fs.existsSync(CITIES_FILE) ? loadPovertyDataset(CITIES_FILE) : [];
      const pCount = await upsertPovertyRows(db, provinces);
      const cCount = cities.length > 0 ? await upsertPovertyRows(db, cities) : 0;
      console.log(`Seeded poverty_stats (${pCount} provinces, ${cCount} cities).`);
    }

    const existingCampaigns = await db.get<{ total: number }>('SELECT COUNT(*) AS total FROM campaigns');
    const existingTx = await db.get<{ total: number }>('SELECT COUNT(*) AS total FROM transactions');
    if ((existingCampaigns?.total ?? 0) > 0 || (existingTx?.total ?? 0) > 0) {
      console.log('Demo seed skipped domain tables because campaigns or transactions already contain records.');
      return;
    }

    const demoDonor = await db.get<{ id: number }>("SELECT id FROM users WHERE role = 'USER' ORDER BY id ASC LIMIT 1");
    const proof1 = writeDemoProofFile('demo-proof-konsumsi.png');
    const proof2 = writeDemoProofFile('demo-proof-pendidikan.png');

    const anchoredTxIds: number[] = [];

    await runInTransaction(db, async () => {
      const futureDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

      const c1 = await db.run(
        `INSERT INTO campaigns (title, description, target_amount, current_amount, deadline, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          'Program Bantuan Pangan & Sembako Dhuafa (Demo)',
          'Distribusi paket pangan pokok bagi keluarga prasejahtera pada lingkungan demo.',
          25_000_000,
          8_500_000,
          futureDays(180),
        ]
      );
      const c2 = await db.run(
        `INSERT INTO campaigns (title, description, target_amount, current_amount, deadline, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          'Beasiswa Pendidikan Anak Yatim & Dhuafa (Demo)',
          'Bantuan biaya sekolah dan perlengkapan belajar siswa kurang mampu (data demo).',
          15_000_000,
          4_000_000,
          futureDays(120),
        ]
      );
      const c3 = await db.run(
        `INSERT INTO campaigns (title, description, target_amount, current_amount, deadline, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
        [
          'Layanan Kesehatan & Gizi Ibu Balita (Demo)',
          'Dukungan nutrisi dan layanan kesehatan dasar di wilayah prioritas (data demo).',
          20_000_000,
          2_500_000,
          futureDays(240),
        ]
      );

      const m1 = await db.run(
        `INSERT INTO mustahik (full_name, category_asnaf, region, phone_masked, verification_status, notes)
         VALUES (?, ?, ?, ?, 'VERIFIED', ?)`,
        ['Penerima Demo Wilayah Timur', 'Fakir', 'Nusa Tenggara Timur, Kupang', '0812-****-0101', 'Data dummy demo']
      );
      const m2 = await db.run(
        `INSERT INTO mustahik (full_name, category_asnaf, region, phone_masked, verification_status, notes)
         VALUES (?, ?, ?, ?, 'VERIFIED', ?)`,
        ['Peserta Beasiswa Demo', 'Miskin', 'Jawa Barat, Bandung', '0813-****-0202', 'Data dummy demo']
      );
      const m3 = await db.run(
        `INSERT INTO mustahik (full_name, category_asnaf, region, phone_masked, verification_status, notes)
         VALUES (?, ?, ?, ?, 'VERIFIED', ?)`,
        ['Keluarga Rentan Demo', 'Gharimin', 'Jawa Barat, Bogor', '0815-****-0303', 'Data dummy demo']
      );

      const donorId = demoDonor?.id ?? null;
      await db.run(
        `INSERT INTO donations (campaign_id, donor_id, amount, payment_reference, status)
         VALUES (?, ?, ?, ?, 'CONFIRMED')`,
        [c1.lastID, donorId, 8_500_000, 'DEMO-PAY-001']
      );
      await db.run(
        `INSERT INTO donations (campaign_id, donor_id, amount, payment_reference, status)
         VALUES (?, ?, ?, ?, 'CONFIRMED')`,
        [c2.lastID, donorId, 4_000_000, 'DEMO-PAY-002']
      );
      await db.run(
        `INSERT INTO donations (campaign_id, donor_id, amount, payment_reference, status)
         VALUES (?, ?, ?, ?, 'CONFIRMED')`,
        [c3.lastID, donorId, 2_500_000, 'DEMO-PAY-003']
      );

      const insertDemoTx = async (input: {
        amount: number;
        donor_name: string;
        recipient_name: string;
        category: string;
        region: string;
        proof_url: string | null;
        file_hash: string | null;
        anomaly_flag: number;
        anomaly_reason: string | null;
        proof_status: 'APPROVED' | 'PENDING';
        campaign_id: number;
        mustahik_id: number;
      }) => {
        const res = await db.run(
          `INSERT INTO transactions (
             amount, donor_name, recipient_name, category, region, proof_url, file_hash,
             audit_hash, anomaly_flag, anomaly_reason, blockchain_status, proof_status,
             campaign_id, mustahik_id
           ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'PENDING_BLOCKCHAIN', ?, ?, ?)`,
          [
            input.amount,
            input.donor_name,
            input.recipient_name,
            input.category,
            input.region,
            input.proof_url,
            input.file_hash,
            input.anomaly_flag,
            input.anomaly_reason,
            input.proof_status,
            input.campaign_id,
            input.mustahik_id,
          ]
        );
        const rowId = Number(res.lastID);
        const auditHash = generateRecordAuditHash(
          {
            amount: input.amount,
            donor_name: input.donor_name,
            recipient_name: input.recipient_name,
            category: input.category,
            region: input.region,
            proof_url: input.proof_url,
            file_hash: input.file_hash,
          },
          rowId
        );
        await db.run('UPDATE transactions SET audit_hash = ? WHERE id = ?', [auditHash, rowId]);
        await db.run(
          'INSERT INTO transaction_allocations (transaction_id, region, amount, notes) VALUES (?, ?, ?, ?)',
          [rowId, input.region, input.amount, 'Alokasi demo fiktif']
        );
        return rowId;
      };

      const tx1 = await insertDemoTx({
        amount: 6_000_000,
        donor_name: 'Donatur Demo Umum',
        recipient_name: 'Penerima Demo Wilayah Timur',
        category: 'Konsumsi',
        region: 'Nusa Tenggara Timur, Kupang',
        proof_url: proof1.proofUrl,
        file_hash: proof1.sha256,
        anomaly_flag: 0,
        anomaly_reason: null,
        proof_status: 'APPROVED',
        campaign_id: Number(c1.lastID),
        mustahik_id: Number(m1.lastID),
      });

      const tx2 = await insertDemoTx({
        amount: 2_500_000,
        donor_name: 'Donatur Demo Pendidikan',
        recipient_name: 'Peserta Beasiswa Demo',
        category: 'Pendidikan',
        region: 'Jawa Barat, Bandung',
        proof_url: proof2.proofUrl,
        file_hash: proof2.sha256,
        anomaly_flag: 0,
        anomaly_reason: null,
        proof_status: 'APPROVED',
        campaign_id: Number(c2.lastID),
        mustahik_id: Number(m2.lastID),
      });

      const tx3 = await insertDemoTx({
        amount: 500_000,
        donor_name: 'Donatur Demo Kesehatan',
        recipient_name: 'Keluarga Rentan Demo',
        category: 'Kesehatan',
        region: 'Jawa Barat, Bogor',
        proof_url: null,
        file_hash: null,
        anomaly_flag: 1,
        anomaly_reason: 'Missing proof of delivery',
        proof_status: 'PENDING',
        campaign_id: Number(c3.lastID),
        mustahik_id: Number(m3.lastID),
      });

      await db.run(
        `INSERT INTO anomalies (transaction_id, type, reason, priority, status)
         VALUES (?, 'MISSING_PROOF', 'Laporan penyaluran demo belum disertai bukti fisik', 'HIGH', 'OPEN')`,
        [tx3]
      );

      anchoredTxIds.push(tx1, tx2);
    });

    await tryAnchorLocalChain(db, anchoredTxIds);

    const totals = await db.get<{ don: number; dist: number }>(
      `SELECT
         (SELECT COALESCE(SUM(amount), 0) FROM donations WHERE status = 'CONFIRMED') AS don,
         (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED') AS dist`
    );
    const totalDonations = Number(totals?.don ?? 0);
    const totalDist = Number(totals?.dist ?? 0);
    const balance = totalDonations - totalDist;
    await db.run(
      `INSERT INTO reconciliation_logs (total_donations, total_distributions, balance, status, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [totalDonations, totalDist, balance, balance >= 0 ? 'BALANCED' : 'DEFICIT', 'Initial demo snapshot']
    );

    console.log('Successfully seeded fictional demo campaigns, mustahik, donations, and distribution records.');
  } finally {
    await db.close();
  }
}

main().catch((error: unknown) => {
  console.error('[SEED DEMO ERROR]', error instanceof Error ? error.message : 'unknown error');
  process.exit(1);
});
