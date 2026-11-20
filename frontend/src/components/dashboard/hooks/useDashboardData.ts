import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../utils/api';

export interface Campaign {
  id: number;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  status: string;
  deadline: string | null;
  created_at: string;
}

export interface Donation {
  id: number;
  campaign_id: number | null;
  amount: number;
  status: string;
  timestamp: string;
}

export interface DashboardStats {
  kpis: {
    totalDonations: number;
    totalDistributed: number;
    totalReports: number;
    verifiedReports: number;
    pendingReports: number;
    openAnomalies: number;
    balance: number;
  };
  recentTransactions: Record<string, unknown>[];
  categoryDistribution: Record<string, unknown>[];
  networkStatus: Record<string, unknown>;
}

export const useCampaigns = () =>
  useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      return data;
    },
  });

export const useDonorDonations = (donorId: number | null) =>
  useQuery<Donation[]>({
    queryKey: ['donor-donations', donorId],
    queryFn: async () => {
      const { data } = await apiClient.get<Donation[]>(`/donations/donor/${donorId}`);
      return data;
    },
    enabled: typeof donorId === 'number',
  });

export const useDashboardStats = () =>
  useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
      return data;
    },
  });

export interface Transaction {
  id: number;
  amount: number;
  category: string | null;
  region: string | null;
  status: string;
  timestamp: string;
  tx_hash: string | null;
  audit_hash?: string | null;
  blockchain_status: string | null;
  block_number: number | null;
  proof_status?: string | null;
}

export interface RegionStat {
  region: string;
  province: string;
  region_code: string;
  poverty_rate: number;
  poor_population: number;
  total_distributed: number;
  total_reports: number;
  target_amount: number;
  gap: number;
  reach_percentage: number;
  priority_score: string;
  status: 'CRITICAL' | 'WARNING' | 'STABLE';
}

export const useTransactions = () =>
  useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Transaction[]>('/transactions');
      return data;
    },
  });

export const useRegionStats = () =>
  useQuery<RegionStat[]>({
    queryKey: ['mapping-stats'],
    queryFn: async () => {
      const { data } = await apiClient.get<RegionStat[]>('/mapping/stats');
      return data;
    },
  });
