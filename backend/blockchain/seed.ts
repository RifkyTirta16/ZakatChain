
import { initDb } from './models/db.js';
import { generateAuditHash } from './utils/crypto.js';

async function seed() {
  const db = await initDb();
  const count = await db.get('SELECT COUNT(*) as total FROM transactions');
  
  if (count.total > 0) {
    console.log('Database already seeded.');
    return;
  }

  const mockData = [
    { amount: 500000, donor: 'Hamba Allah', recipient: 'Budi', cat: 'Konsumsi', region: 'Jakarta Selatan', proof: 'https://cdn.example.com/p1.jpg' },
    { amount: 1000000, donor: 'Siti Aminah', recipient: 'Susi', cat: 'Pendidikan', region: 'Bekasi', proof: '' },
    { amount: 250000, donor: 'Hamba Allah', recipient: 'Andi', cat: 'Kesehatan', region: 'Tangerang', proof: 'https://cdn.example.com/p3.jpg' },
    { amount: 1500000, donor: 'Zaid', recipient: 'Ani', cat: 'Modal Usaha', region: 'Bogor', proof: 'https://cdn.example.com/p4.jpg' },
    { amount: 300000, donor: 'Hamba Allah', recipient: 'Rudi', cat: 'Konsumsi', region: 'Depok', proof: '' },
  ];

  for (const item of mockData) {
    const data = { amount: item.amount, donor_name: item.donor, recipient_name: item.recipient, category: item.cat, region: item.region, proof_url: item.proof };
    const hash = generateAuditHash(data);
    const anomaly = !item.proof;
    await db.run(
      `INSERT INTO transactions (amount, donor_name, recipient_name, category, region, proof_url, audit_hash, anomaly_flag, anomaly_reason) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.amount, item.donor, item.recipient, item.cat, item.region, item.proof, hash, anomaly, anomaly ? 'Missing proof' : null]
    );
  }
  console.log('Successfully seeded 5 mock transactions.');
}

seed().catch(console.error);
