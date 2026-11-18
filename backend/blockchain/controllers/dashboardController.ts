import { Request, Response } from 'express';

export const getDashboardStats = async (req: Request, res: Response) => {
  const { db } = req;
  try {
    const donationRes = await (db as any).get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE status = 'CONFIRMED'`
    );
    const totalDonations = Number(donationRes?.total ?? 0);

    const distributionRes = await (db as any).get(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE blockchain_status = 'CONFIRMED' AND proof_status = 'APPROVED'`
    );
    const totalDistributed = Number(distributionRes?.total ?? 0);

    const reportCountRes = await (db as any).get('SELECT COUNT(*) as count FROM transactions');
    const totalReports = reportCountRes?.count || 0;

    const verifiedReportsRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM transactions WHERE blockchain_status = 'CONFIRMED'`
    );
    const verifiedReports = verifiedReportsRes?.count || 0;

    const pendingReportsRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM transactions WHERE blockchain_status IS NULL OR blockchain_status != 'CONFIRMED'`
    );
    const pendingReports = pendingReportsRes?.count || 0;

    const anomalyRes = await (db as any).get(
      `SELECT COUNT(*) as count FROM anomalies WHERE status = 'OPEN'`
    );
    const openAnomalies = anomalyRes?.count || 0;

    const recentTxs = await (db as any).all(
      `SELECT id, recipient_name, amount, blockchain_status, proof_status, timestamp
       FROM transactions ORDER BY timestamp DESC, id DESC LIMIT 5`
    );

    const categoryRes = await (db as any).all(
      `SELECT category, SUM(amount) as total FROM transactions GROUP BY category`
    );

    // Network health is probed rather than hardcoded, so the dashboard does not
    // report "Connected/Healthy" while the RPC endpoint is actually unreachable.
    // Bounded by a timeout so a hanging RPC cannot stall the dashboard response.
    let networkStatus = { rpc: 'Unknown', contract: 'Unknown', status: 'Unknown' };
    let provider: ReturnType<typeof import('../utils/web3.js').getBlockchainProvider> | null = null;
    try {
      const { getBlockchainProvider, getZakatContract } = await import('../utils/web3.js');
      provider = getBlockchainProvider();
      const probe = (async () => {
        await provider.getBlockNumber();
        const contract = getZakatContract(provider);
        return provider.getCode((contract as any).target);
      })();
      const code = await Promise.race([
        probe,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RPC probe timed out')), 3000)),
      ]);
      networkStatus = code && code !== '0x'
        ? { rpc: 'Connected', contract: 'Active', status: 'Healthy' }
        : { rpc: 'Connected', contract: 'No contract code', status: 'Degraded' };
    } catch {
      networkStatus = { rpc: 'Unreachable', contract: 'Unknown', status: 'Degraded' };
    } finally {
      provider?.destroy();
    }

    res.json({
      kpis: {
        totalDonations,
        totalDistributed,
        totalReports,
        verifiedReports,
        pendingReports,
        openAnomalies,
        balance: totalDonations - totalDistributed,
      },
      recentTransactions: recentTxs,
      categoryDistribution: categoryRes,
      networkStatus,
    });
  } catch (error: any) {
    console.error('[DASHBOARD ERROR]', error?.message);
    res.status(500).json({ error: 'Dashboard data fetch failed' });
  }
};
