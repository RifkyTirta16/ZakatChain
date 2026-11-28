import { Request, Response } from 'express';
import {
  getContractAddress,
  getBlockchainProvider,
  getZakatContract,
  resolveNetworkName,
} from '../utils/web3.js';
import { ethers } from 'ethers';

const normalizeHash = (value: string): string | null => {
  const stripped = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (!/^[a-f0-9]{64}$/i.test(stripped)) return null;
  return stripped.toLowerCase();
};

const findTxByAnyHash = async (db: any, bareLowerHash: string) => {
  const withPrefix = `0x${bareLowerHash}`;
  return db.get(
    `SELECT * FROM transactions
     WHERE LOWER(REPLACE(COALESCE(audit_hash, ''), '0x', '')) = ?
        OR LOWER(COALESCE(tx_hash, '')) = ?
        OR LOWER(COALESCE(revoke_tx_hash, '')) = ?
     ORDER BY id DESC
     LIMIT 1`,
    [bareLowerHash, withPrefix, withPrefix]
  );
};

const buildVerdictAndTimeline = (input: {
  status: 'VERIFIED' | 'REVOKED' | 'CHAIN_UNAVAILABLE' | 'NOT_FOUND_ON_CHAIN';
  dbInfo: any;
  exists: boolean;
  revoked: boolean;
  timestamp: bigint;
  chainUnavailable: boolean;
}) => {
  const { status, dbInfo, exists, revoked, timestamp, chainUnavailable } = input;

  let verdict: { label: string; tone: 'success' | 'danger' | 'warning' | 'info' | 'neutral'; summary: string };
  if (status === 'VERIFIED') {
    verdict = {
      label: 'Tercatat & Utuh',
      tone: 'success',
      summary:
        'Sidik jari digital laporan ini cocok dengan catatan di smart contract Ethereum dan belum pernah dicabut.',
    };
  } else if (status === 'REVOKED') {
    verdict = {
      label: 'Catatan Dicabut',
      tone: 'danger',
      summary:
        'Laporan ini telah dicabut secara permanen pada smart contract dan tidak dihitung sebagai penyaluran aktif.',
    };
  } else if (status === 'CHAIN_UNAVAILABLE') {
    verdict = {
      label: 'Jaringan Sedang Sinkronisasi',
      tone: 'warning',
      summary:
        'Data laporan ditemukan di basis data, namun node Ethereum sedang tidak terjangkau sementara.',
    };
  } else if (dbInfo) {
    verdict = {
      label: 'Menunggu Pencatatan On-Chain',
      tone: 'info',
      summary:
        'Laporan sudah tercatat di basis data internal dan sedang menunggu pencatatan hash ke Ethereum.',
    };
  } else {
    verdict = {
      label: 'Laporan Tidak Ditemukan',
      tone: 'neutral',
      summary: 'Tidak ditemukan laporan penyaluran dengan nomor atau kode hash tersebut.',
    };
  }

  const proofStatus = String(dbInfo?.proof_status ?? 'PENDING').toUpperCase();
  const chainTimeIso =
    Number(timestamp) > 0 ? new Date(Number(timestamp) * 1000).toISOString() : null;

  const timeline = [
    {
      step: 'Laporan Penyaluran Dicatat',
      state: dbInfo ? 'completed' : 'pending',
      timestamp: dbInfo?.timestamp ?? null,
      detail: dbInfo
        ? `Laporan #${dbInfo.id} sebesar Rp ${Number(dbInfo.amount || 0).toLocaleString('id-ID')} dicatat untuk ${dbInfo.region || 'wilayah sasaran'}.`
        : 'Belum ditemukan arsip internal untuk kode ini.',
    },
    {
      step: 'Verifikasi Bukti Lapangan',
      state: !dbInfo
        ? 'pending'
        : proofStatus === 'APPROVED'
          ? 'completed'
          : proofStatus === 'REJECTED'
            ? 'danger'
            : 'warning',
      timestamp: dbInfo?.timestamp ?? null,
      detail: !dbInfo
        ? 'Menunggu data laporan.'
        : proofStatus === 'APPROVED'
          ? 'Bukti penyaluran telah diverifikasi dan disetujui oleh Auditor.'
          : proofStatus === 'REJECTED'
            ? dbInfo.proof_rejection_reason || 'Bukti ditolak dalam peninjauan.'
            : 'Berkas bukti sedang menunggu peninjauan Auditor.',
    },
    {
      step: 'Pencatatan Hash ke Ethereum',
      state: chainUnavailable
        ? 'warning'
        : exists
          ? 'completed'
          : 'pending',
      timestamp: chainTimeIso,
      detail: chainUnavailable
        ? 'Node blockchain sedang tidak terjangkau saat pengecekan.'
        : exists
          ? `Hash audit tercatat pada blok #${dbInfo?.block_number ?? '-'}.`
          : 'Hash audit belum tercatat di smart contract ZakatVerify.',
    },
    {
      step: 'Status Keutuhan Catatan',
      state: revoked
        ? 'danger'
        : chainUnavailable
          ? 'warning'
          : exists
            ? 'completed'
            : 'pending',
      timestamp: chainTimeIso,
      detail: revoked
        ? dbInfo?.revoke_reason
          ? `Dicabut dengan alasan: ${dbInfo.revoke_reason}`
          : 'Catatan telah dicabut secara permanen di smart contract.'
        : exists
          ? 'Catatan aktif dan utuh tanpa pencabutan.'
          : 'Menunggu pencatatan hash aktif.',
    },
  ];

  return { verdict, timeline };
};

export const verifyReportProof = async (req: Request, res: Response) => {
  const id = typeof req.params.id === 'string' ? req.params.id : undefined;
  const hash = typeof req.params.hash === 'string' ? req.params.hash : undefined;
  const rawQuery = typeof req.params.query === 'string' ? req.params.query.trim() : undefined;
  const { db } = req;

  try {
    let targetHash: string | null = null;
    let dbInfo: any = null;
    let resolvedVia: 'tx_id' | 'audit_hash' | 'tx_hash' | 'bsz' = 'audit_hash';
    let donationRef: { id: number; status: string } | null = null;

    if (rawQuery !== undefined) {
      if (!rawQuery || rawQuery.length > 128) {
        return res.status(400).json({ error: 'Nomor laporan, BSZ, atau hash tidak valid' });
      }
      const bszMatch = rawQuery.match(/^BSZ-\d{4}-(\d+)$/i);
      const txIdMatch = rawQuery.match(/^(?:#|ZC-TX-)?(\d+)$/i);
      const maybeHex = normalizeHash(rawQuery);

      if (bszMatch) {
        resolvedVia = 'bsz';
        const donationId = Number(bszMatch[1]);
        const donation = await (db as any).get(
          'SELECT id, campaign_id, status FROM donations WHERE id = ?',
          [donationId]
        );
        if (!donation) {
          return res.status(404).json({ error: 'Nomor BSZ tidak ditemukan di sistem' });
        }
        donationRef = { id: donation.id, status: donation.status };
        const poolClause = donation.campaign_id !== null ? 'campaign_id = ?' : 'campaign_id IS NULL';
        const poolArgs = donation.campaign_id !== null ? [donation.campaign_id] : [];
        dbInfo = await (db as any).get(
          `SELECT * FROM transactions
           WHERE proof_status = 'APPROVED'
             AND COALESCE(blockchain_status, '') != 'REVOKED'
             AND ${poolClause}
           ORDER BY timestamp DESC, id DESC
           LIMIT 1`,
          poolArgs
        );
        if (!dbInfo) {
          return res.json({
            verified: false,
            verified_as: 'audit_hash_present_on_chain',
            resolved_via: 'bsz',
            donation_reference: `BSZ-2026-${donation.id}`,
            network: { chainId: null, networkName: 'Menunggu Penyaluran', contractAddress: getContractAddress() },
            blockchain: { exists: false, timestamp: '0', revoked: false, formattedHash: null, unavailable: false },
            database: null,
            data: null,
            match: false,
            status: 'NOT_FOUND_ON_CHAIN',
            verdict: {
              label: donation.status === 'CONFIRMED' ? 'Dana Terhimpun, Menunggu Penyaluran' : 'Donasi Belum Terkonfirmasi',
              tone: 'info',
              summary:
                donation.status === 'CONFIRMED'
                  ? 'Donasi Anda sudah terkonfirmasi di pool program dan akan segera terhubung ke laporan penyaluran terverifikasi.'
                  : 'Pembayaran donasi untuk nomor BSZ ini belum terkonfirmasi.',
            },
            timeline: [],
          });
        }
        targetHash = normalizeHash(String(dbInfo.audit_hash ?? '')) ?? String(dbInfo.audit_hash ?? '');
      } else if (txIdMatch) {
        resolvedVia = 'tx_id';
        const numericId = Number(txIdMatch[1]);
        dbInfo = await (db as any).get('SELECT * FROM transactions WHERE id = ?', [numericId]);
        if (!dbInfo) {
          return res.status(404).json({ error: 'Report not found in database' });
        }
        targetHash = normalizeHash(String(dbInfo.audit_hash ?? '')) ?? String(dbInfo.audit_hash ?? '');
      } else if (maybeHex) {
        dbInfo = await findTxByAnyHash(db, maybeHex);
        if (dbInfo) {
          const bareAudit = normalizeHash(String(dbInfo.audit_hash ?? ''));
          resolvedVia = bareAudit === maybeHex ? 'audit_hash' : 'tx_hash';
          targetHash = bareAudit ?? maybeHex;
        } else {
          targetHash = maybeHex;
        }
      } else {
        return res.status(400).json({
          error: 'Masukkan ID laporan (mis. 1), nomor BSZ (BSZ-2026-1), atau hash SHA-256 / tx hash yang valid.',
        });
      }
    } else if (hash) {
      const normalized = normalizeHash(hash);
      if (!normalized) {
        return res.status(400).json({ error: 'Audit hash must be a 32-byte hexadecimal value' });
      }
      dbInfo = await findTxByAnyHash(db, normalized);
      if (dbInfo) {
        const bareAudit = normalizeHash(String(dbInfo.audit_hash ?? ''));
        resolvedVia = bareAudit === normalized ? 'audit_hash' : 'tx_hash';
        targetHash = bareAudit ?? normalized;
      } else {
        targetHash = normalized;
      }
    } else {
      resolvedVia = 'tx_id';
      if (!id || !/^\d+$/.test(id) || Number(id) < 1) {
        return res.status(400).json({ error: 'A valid transaction ID or audit hash is required' });
      }
      dbInfo = await (db as any).get('SELECT * FROM transactions WHERE id = ?', [Number(id)]);
      if (!dbInfo) {
        return res.status(404).json({ error: 'Report not found in database' });
      }
      targetHash = normalizeHash(String(dbInfo.audit_hash ?? '')) ?? String(dbInfo.audit_hash ?? '');
    }

    if (typeof targetHash !== 'string' || targetHash.length === 0) {
      return res.status(400).json({ error: 'Report has no usable audit hash' });
    }

    const formattedHash = ethers.id(targetHash);

    let exists = false;
    let timestamp = 0n;
    let revoked = false;
    let chainUnavailable = false;
    let chainId: number | null = null;
    let provider: ReturnType<typeof getBlockchainProvider> | null = null;

    try {
      provider = getBlockchainProvider();
      const contract = getZakatContract(provider);
      const [reportInfo, network] = await Promise.all([
        contract.verifyReport(formattedHash),
        provider.getNetwork(),
      ]);
      exists = reportInfo[0];
      timestamp = reportInfo[1];
      revoked = reportInfo[2];
      chainId = Number(network.chainId);
    } catch (chainError: any) {
      console.error(`[EXPLORER CHAIN ERROR] ${chainError?.message}`);
      chainUnavailable = true;
    } finally {
      provider?.destroy();
    }

    const status: 'VERIFIED' | 'REVOKED' | 'CHAIN_UNAVAILABLE' | 'NOT_FOUND_ON_CHAIN' = chainUnavailable
      ? 'CHAIN_UNAVAILABLE'
      : exists
        ? (revoked ? 'REVOKED' : 'VERIFIED')
        : 'NOT_FOUND_ON_CHAIN';

    const allocations = dbInfo
      ? await (db as any).all(
          'SELECT region, amount FROM transaction_allocations WHERE transaction_id = ? ORDER BY id ASC',
          [dbInfo.id]
        )
      : [];

    const database = dbInfo
      ? {
          id: dbInfo.id,
          amount: dbInfo.amount,
          category: dbInfo.category,
          region: dbInfo.region,
          timestamp: dbInfo.timestamp,
          status: dbInfo.blockchain_status,
          blockchain_status: dbInfo.blockchain_status,
          auditHash: dbInfo.audit_hash,
          audit_hash: dbInfo.audit_hash,
          tx_hash: dbInfo.tx_hash,
          block_number: dbInfo.block_number ?? null,
          proof_status: dbInfo.proof_status ?? null,
          revoke_tx_hash: dbInfo.revoke_tx_hash ?? null,
          revoke_reason: dbInfo.revoke_reason ?? null,
          allocations,
        }
      : null;

    const { verdict, timeline } = buildVerdictAndTimeline({
      status,
      dbInfo,
      exists,
      revoked,
      timestamp,
      chainUnavailable,
    });

    return res.json({
      verified: !chainUnavailable && exists && !revoked,
      verified_as: 'audit_hash_present_on_chain',
      resolved_via: resolvedVia,
      ...(donationRef ? { donation_reference: `BSZ-2026-${donationRef.id}` } : {}),
      network: {
        chainId,
        networkName: resolveNetworkName(chainId),
        contractAddress: getContractAddress(),
      },
      blockchain: {
        exists,
        timestamp: timestamp.toString(),
        revoked,
        formattedHash,
        unavailable: chainUnavailable,
      },
      database,
      data: database,
      match:
        !revoked &&
        exists &&
        !!dbInfo &&
        targetHash === String(dbInfo.audit_hash ?? '').replace(/^0x/i, '').toLowerCase(),
      status,
      verdict,
      timeline,
    });
  } catch (error: any) {
    console.error(`[EXPLORER ERROR] ${error?.message}`);
    res.status(500).json({ error: 'Blockchain verification failed' });
  }
};
