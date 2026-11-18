import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

async function seed() {
  const db = await open({
    filename: '/home/jarvis/ZakatChain/backend/database.sqlite',
    driver: sqlite3.Database
  });

  const campaigns = [
    { title: 'Zakat Fitrah Ramadhan 2026', description: 'Program pengumpulan zakat fitrah untuk distribusi pangan pokok bagi kaum dhuafa.', target_amount: 500000000, current_amount: 120000000, deadline: '2026-03-20', status: 'ACTIVE' },
    { title: 'Bantuan Bencana Banjir Jakarta', description: 'Dana darurat untuk evakuasi dan bantuan logistik korban banjir Jakarta.', target_amount: 200000000, current_amount: 180000000, deadline: '2026-12-31', status: 'ACTIVE' },
    { title: 'Beasiswa Pendidikan Yatim', description: 'Pemberian beasiswa sekolah bagi anak yatim dan piatu berprestasi.', target_amount: 100000000, current_amount: 45000000, deadline: '2026-06-15', status: 'ACTIVE' },
  ];

  for (const c of campaigns) {
    await db.run(
      'INSERT OR IGNORE INTO campaigns (title, description, target_amount, current_amount, deadline, status) VALUES (?, ?, ?, ?, ?, ?)',
      [c.title, c.description, c.target_amount, c.current_amount, c.deadline, c.status]
    );
  }

  console.log('Successfully seeded campaigns!');
}

seed().catch(console.error);
