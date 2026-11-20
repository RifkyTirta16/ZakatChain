import { useState } from 'react';
import { AlertCircle, Download, FileText } from 'lucide-react';
import apiClient from '../../utils/api';
import { Button, Card, ON_CHAIN_NOTE, SectionHeader } from '../../components/ui';

export const ExportPage = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setError('');
    setDownloading(true);
    try {
      const response = await apiClient.get('/export/csv', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zakat_distribution_report.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      setError(
        e.response?.status === 404
          ? 'Belum ada catatan transaksi distribusi untuk diekspor.'
          : 'Gagal mengunduh laporan CSV. Periksa koneksi dan hak akses akun Anda.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <SectionHeader
        title="Ekspor Laporan Distribusi"
        subtitle="Unduh seluruh catatan penyaluran zakat dalam format CSV (UTF-8 dengan BOM) untuk audit offline."
      />

      {error && (
        <div role="alert" className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm flex items-center gap-2 font-medium">
          <AlertCircle size={16} className="text-danger shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="text-center space-y-4 p-8">
        <div className="w-12 h-12 rounded-xl bg-mint text-primary flex items-center justify-center mx-auto">
          <Download size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-forest-dark">Laporan Distribusi Zakat (CSV)</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Berisi rincian nominal, donor, penerima (khusus Auditor/Admin), bukti, audit hash, serta status blockchain.
          </p>
        </div>
        <div className="pt-1">
          <Button variant="primary" loading={downloading} onClick={() => void handleDownload()}>
            <Download size={16} /> Unduh File CSV
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Nama berkas: <span className="font-mono">zakat_distribution_report.csv</span>
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold text-forest-dark flex items-center gap-2 text-base">
          <FileText size={16} className="text-primary" /> Kolom yang Disertakan
        </h2>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
          <li>ID, jumlah (IDR), nama donor, nama penerima, kategori, wilayah, timestamp</li>
          <li>URL bukti (proof_url), file hash, audit hash (SHA-256)</li>
          <li>Status rekonsiliasi, flag anomali, dan alasan anomali</li>
          <li>Tx hash Ethereum, status blockchain, nomor blok, status verifikasi bukti</li>
        </ul>
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{ON_CHAIN_NOTE}</p>
      </Card>
    </div>
  );
};

export default ExportPage;
