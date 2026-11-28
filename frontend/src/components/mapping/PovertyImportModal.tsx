import { useState } from 'react';
import { X } from 'lucide-react';
import apiClient from '../../utils/api';
import { Button, Card } from '../ui';

interface PovertyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

/** Modal dialog for AMIL/ADMIN bulk JSON import of BPS poverty indicators. */
export const PovertyImportModal = ({ isOpen, onClose, onImported }: PovertyImportModalProps) => {
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [importBusy, setImportBusy] = useState(false);

  if (!isOpen) return null;

  const handleImport = async () => {
    setImportError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(importData);
    } catch {
      setImportError('Format JSON tidak valid. Tempelkan array JSON provinsi atau objek {"data": [...]}.');
      return;
    }
    const payload = Array.isArray(parsed) ? { data: parsed } : parsed;
    setImportBusy(true);
    try {
      await apiClient.post('/mapping/import', payload);
      setImportData('');
      onImported();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; details?: unknown } } };
      const detail = e.response?.data?.details;
      const detailText = Array.isArray(detail)
        ? detail.map((d: { message?: string }) => d.message).filter(Boolean).join('; ')
        : typeof detail === 'string'
          ? detail
          : '';
      setImportError(`${e.response?.data?.error || 'Impor gagal.'} ${detailText}`.trim());
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-forest-dark">Impor Data Kemiskinan</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal impor"
            className="p-1 rounded-lg text-slate-500 hover:text-forest-dark hover:bg-mint"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Tempelkan array JSON data resmi (mendukung format datar maupun struktur bersarang BPS). Setiap objek memuat{' '}
          <span className="font-mono font-bold">region_code, region_name, poverty_rate</span>.
        </p>

        <textarea
          className="w-full h-44 bg-cream border border-slate-200 rounded-2xl p-3 text-xs font-mono text-forest-dark outline-none focus:ring-2 focus:ring-primary/20"
          placeholder='[{"region_code":"32","region_name":"Jawa Barat","province_name":"Jawa Barat","poverty_rate":7.02,"poverty":{"poor_population_thousand":3654.74,"poverty_line_rp_per_capita_month":547752}}]'
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
        />

        {importError && (
          <p className="text-xs text-danger font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">
            {importError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            loading={importBusy}
            disabled={importBusy || !importData.trim()}
            onClick={() => void handleImport()}
          >
            Impor Data
          </Button>
        </div>
      </Card>
    </div>
  );
};
