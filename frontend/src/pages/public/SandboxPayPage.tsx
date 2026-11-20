import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock, QrCode, ShieldCheck } from 'lucide-react';
import apiClient from '../../utils/api';
import { formatDateTime, formatIDR } from '../../utils/format';
import { Badge, Button, Card, Skeleton } from '../../components/ui';

interface SandboxSessionInfo {
  session_id: string;
  amount: number;
  program_id: string | null;
  campaign_title: string | null;
  status: 'PAID' | 'PENDING' | 'FAILED' | 'EXPIRED';
  expires_at: string;
  provider: string;
  merchant_id: string;
}

const SandboxPayPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t') ?? '';
  const [confirmError, setConfirmError] = useState('');

  const sessionQuery = useQuery<SandboxSessionInfo>({
    queryKey: ['sandbox-qr-session', sessionId, token],
    enabled: Boolean(sessionId && token),
    queryFn: async () => {
      const { data } = await apiClient.get<SandboxSessionInfo>(
        `/payments/sandbox/session/${encodeURIComponent(sessionId ?? '')}`,
        { params: { t: token } }
      );
      return data;
    },
    retry: false,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ status: string }>(
        `/payments/sandbox/scan-confirm/${encodeURIComponent(sessionId ?? '')}`,
        { token }
      );
      return data;
    },
    onSuccess: () => {
      setConfirmError('');
      void sessionQuery.refetch();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } };
      setConfirmError(e.response?.data?.error || 'Gagal mengonfirmasi pembayaran sandbox.');
    },
  });

  if (!sessionId || !token) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <Card className="text-center space-y-3 p-6">
          <AlertCircle size={28} className="mx-auto text-danger" />
          <h1 className="text-lg font-bold text-forest-dark">Kode QR Tidak Valid</h1>
          <p className="text-xs text-slate-600">
            Tautan QRIS sandbox tidak memuat ID sesi atau token verifikasi yang lengkap.
          </p>
        </Card>
      </div>
    );
  }

  if (sessionQuery.isPending) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <Card><Skeleton lines={6} /></Card>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    const errMsg = (sessionQuery.error as { response?: { data?: { error?: string } } })?.response?.data?.error;
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <Card className="text-center space-y-3 p-6">
          <AlertCircle size={28} className="mx-auto text-danger" />
          <h1 className="text-lg font-bold text-forest-dark">Sesi QRIS Tidak Dapat Dimuat</h1>
          <p className="text-xs text-slate-600">
            {errMsg || 'Sesi mungkin sudah kedaluwarsa, token tidak cocok, atau mode sandbox dinonaktifkan.'}
          </p>
        </Card>
      </div>
    );
  }

  const info = sessionQuery.data;

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <Card className="space-y-5 text-center p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-mint border border-primary/25 px-3 py-1 text-xs font-semibold text-forest">
          <QrCode size={14} /> {info.provider}
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            {info.campaign_title || info.program_id || 'Zakat Umum'}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-forest-dark tabular-nums">
            {formatIDR(info.amount)}
          </p>
          <p className="mt-1 text-[11px] font-mono text-slate-500">
            Merchant {info.merchant_id} · {info.session_id}
          </p>
        </div>

        <div className="flex justify-center">
          <Badge
            tone={
              info.status === 'PAID'
                ? 'success'
                : info.status === 'PENDING'
                  ? 'warning'
                  : 'danger'
            }
          >
            {info.status === 'PAID'
              ? 'Pembayaran Berhasil'
              : info.status === 'PENDING'
                ? 'Menunggu Konfirmasi'
                : info.status}
          </Badge>
        </div>

        {info.status === 'PAID' ? (
          <div className="rounded-xl bg-mint/70 border border-primary/25 p-4 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-primary" />
            <p className="text-sm font-bold text-forest-dark">
              Pembayaran QRIS Sandbox Dikonfirmasi
            </p>
            <p className="text-xs text-slate-600">
              Layar pembayaran utama akan otomatis memperbarui status menjadi lunas dalam beberapa detik.
            </p>
          </div>
        ) : info.status === 'PENDING' ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 inline-flex items-center justify-center gap-1">
              <Clock size={13} /> Berlaku hingga {formatDateTime(info.expires_at)}
            </p>
            {confirmError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                {confirmError}
              </p>
            )}
            <Button
              variant="gold"
              size="lg"
              loading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
              className="w-full"
            >
              <ShieldCheck size={16} /> Konfirmasi Bayar QRIS Sekarang
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-600">
            Sesi pembayaran ini sudah tidak aktif ({info.status}). Silakan buat kode QR baru.
          </p>
        )}
      </Card>
    </div>
  );
};

export default SandboxPayPage;
