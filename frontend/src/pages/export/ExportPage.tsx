import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import apiClient from '../../utils/api';
import { Card } from '../../components/ui';
import { ON_CHAIN_NOTE } from '../../components/ui/badgeStatus';

export const ExportPage = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
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
    } catch {
      // Error interceptor already handles 401; surface generic failure silently per security rule.
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary-dark mb-1">Ekspor Data</h1>
        <p className="text-primary-dark/70">Unduh laporan distribusi zakat dalam format CSV.</p>
      </div>

      <Card>
        <div className="bg-primary-bg rounded-xl p-6 border border-primary/30 text-center">
          <Download size={32} className="text-primary-dark mx-auto mb-3" />
          <h2 className="text-lg font-bold text-primary-dark mb-2">Laporan Distribusi Zakat</h2>
          <p className="text-primary-dark/70 text-sm mb-4">
            Semua catatan distribusi (transaksi) diekspor ke CSV, lengkap dengan bukti, hash, dan status rekonsiliasi.
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light px-6 font-bold text-primary-dark shadow-gold-glow hover:shadow-gold-glow transition-shadow disabled:opacity-60"
          >
            {downloading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Sedang mengunduh…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download size={16} className="mr-2" /> Unduh CSV
              </span>
            )}
          </button>
          <p className="text-xs text-primary-dark/70 mt-3">
            File: <span className="font-mono">zakat_distribution_report.csv</span> (encoding UTF-8 dengan BOM).
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold text-primary-dark mb-3 flex items-center gap-2">
          <FileText size={16} className="text-primary" /> Kolom yang Diekspor
        </h2>
        <ul className="text-sm text-primary-dark/70 space-y-2 leading-relaxed max-w-md">
          <li>ID, jumlah, donor, penerima, kategori, wilayah, waktu</li>
          <li>Bukti (proof_url), berkas, hash bukti, hash audit</li>
          <li>Status rekonsiliasi, flag anomali, alasan anomali</li>
          <li>TX hash, status blockchain, nomor blok</li>
          <li>Status bukti, alasan penolakan bukti</li>
        </ul>
        <p className="text-xs text-primary-dark/70 mt-3">{ON_CHAIN_NOTE}</p>
      </Card>
    </div>
  );
};

export default ExportPage;
