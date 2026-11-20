import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../../utils/api';

export interface Campaign {
  id: number;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  status: string;
}

export interface PaymentSessionResponse {
  status: string;
  paymentData: {
    session_id: string;
    paymentId: string;
    qris_url: string;
    qrCodeUrl: string;
    amount: number;
    expires_at: string;
  };
  donationId?: number;
}

export interface PaymentStatusResponse {
  session_id: string;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  amount: number;
  expires_at: string;
}

export const useCampaigns = () => {
  return useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await apiClient.get<Campaign[]>('/campaigns');
      return data;
    },
  });
};

export const useCreatePaymentSession = () => {
  return useMutation<PaymentSessionResponse, Error, {
    amount: number;
    donor_name?: string;
    campaign_id?: number;
    program_id?: string;
  }>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<PaymentSessionResponse>('/payments/session', payload);
      return data;
    },
  });
};

export const usePaymentStatus = (sessionId: string | null) => {
  return useQuery<PaymentStatusResponse>({
    queryKey: ['payment-status', sessionId],
    queryFn: async () => {
      const { data } = await apiClient.get<PaymentStatusResponse>(`/payments/status/${sessionId}`);
      return data;
    },
    enabled: Boolean(sessionId),
  });
};
