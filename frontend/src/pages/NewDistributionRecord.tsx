import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Send, Loader2 } from 'lucide-react';
import { INDONESIA_REGIONS } from '../utils/regions';
import apiClient from '../utils/api';
import { formatIDR, shortHash } from '../utils/format';

const CATEGORIES = ['Konsumsi', 'Kesehatan', 'Pendidikan', 'Modal Usaha'] as const;

const MAX_FILE_MB = 5;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

interface FieldErrors {
  amount?: string;
  recipient_name?: string;
  region?: string;
  proof_file?: string;
}

interface SubmitResult {
  id: number;
  audit_hash: string;
  tx_hash: string | null;
  blockchain_status: string;
}

const groupThousands = (digits: string): string => {
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
};

const NewDistributionRecord = () => {
  const [amountDigits, setAmountDigits] = useState('');
  const [donorName, setDonorName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAmountChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 15);
    setAmountDigits(digits);
    setFieldErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const handleFileChange = (selected: File | null) => {
    setFieldErrors((prev) => ({ ...prev, proof_file: undefined }));
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED_FILE_TYPES.includes(selected.type)) {
      setFile(null);
      setFieldErrors((prev) => ({ ...prev, proof_file: 'Bukti harus berupa JPG, PNG, atau PDF.' }));
      return;
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      setFieldErrors((prev) => ({ ...prev, proof_file: `Ukuran file maksimal ${MAX_FILE_MB} MB.` }));
      return;
    }
    setFile(selected);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const amount = Number(amountDigits);
    if (!amountDigits || Number.isNaN(amount) || amount <= 0) {
      errors.amount = 'Nominal harus berupa angka lebih besar dari 0.';
    }
    if (recipientName.trim().length < 3) {
      errors.recipient_name = 'Nama penerima minimal 3 karakter.';
    }
    if (!province || !city) {
      errors.region = 'Provinsi dan kota/kabupaten wajib dipilih.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResult(null);
    if (!validate()) return;

    setLoading(true);
    const data = new FormData();
    data.append('amount', amountDigits);
    data.append('donor_name', donorName.trim());
    data.append('recipient_name', recipientName.trim());
    data.append('category', category);
    data.append('region', `${province}, ${city}`);
    if (file) data.append('proof_file', file);

    try {
      const response = await apiClient.post<SubmitResult>('/transactions', data);
      setResult(response.data);
      setAmountDigits('');
      setDonorName('');
      setRecipientName('');
      setCategory(CATEGORIES[0]);
      setProvince('');
      setCity('');
      setFile(null);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string; details?: unknown } } };
      const details = e2.response?.data?.details;
      if (Array.isArray(details)) {
        const msgs = details
          .map((d: { path?: string[]; message?: string }) => `${(d.path || []).join('.')}: ${d.message}`)
          .join('; ');
        setErrorMessage(msgs || 'Validasi backend menolak data.');
      } else {
        setErrorMessage(e2.response?.data?.error || 'Gagal mengirim data. Periksa koneksi backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="max-w-2xl w-full bg-wattvision-surface border border-wattvision-border p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-wattvision-primary/10 rounded-2xl">
            <FileText className="text-wattvision-primary" size={24} />
          </div>
          <h1 className="text-2xl font-bold uppercase italic">Catat <span className="text-wattvision-primary">Distribusi</span></h1>
        </div>
        <p className="text-wattvision-textSecondary text-xs uppercase tracking-widest mb-6">
          POST /api/transactions · memerlukan sesi login
        </p>

        {result && (
          <div className="mb-6 p-4 rounded-xl border border-wattvision-success/30 bg-wattvision-success/10 text-wattvision-success space-y-2">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} />
              <span className="text-sm font-medium">Laporan distribusi tersimpan (ID #{result.id}).</span>
            </div>
            <p className="text-xs font-mono leading-relaxed pl-8">
              Audit hash: {shortHash(result.audit_hash, 12, 8)}
              <br />
              Status blockchain:{' '}
              {result.blockchain_status === 'CONFIRMED' ? (
                <>terkonfirmasi (tx {shortHash(result.tx_hash)})</>
              ) : (
                <span className="text-yellow-400">
                  tertunda — transaksi tersimpan di basis data lokal dan dapat direkonsiliasi saat node blockchain tersedia.
                </span>
              )}
              <br />
              Status bukti: PENDING — menunggu verifikasi petugas (ADMIN/AUDITOR).
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-wattvision-alert/10 text-wattvision-alert border border-wattvision-alert/20">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-xs text-wattvision-textSecondary mb-1 ml-1 uppercase tracking-widest">
                  Nominal Distribusi (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-wattvision-textSecondary font-mono text-sm">Rp</span>
                  <input
                    id="amount"
                    type="text"
                    inputMode="numeric"
                    className={`w-full bg-wattvision-bg border rounded-xl py-3 pl-10 pr-4 focus:outline-none transition-colors font-mono text-lg ${
                      fieldErrors.amount ? 'border-wattvision-alert' : 'border-wattvision-border focus:border-wattvision-primary'
                    }`}
                    placeholder="0"
                    value={groupThousands(amountDigits)}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.amount)}
                  />
                </div>
                <div className="flex justify-between mt-1 ml-1">
                  <p className="text-[11px] text-wattvision-alert">{fieldErrors.amount || ''}</p>
                  <p className="text-[11px] text-wattvision-textSecondary font-mono">
                    {amountDigits ? formatIDR(Number(amountDigits)) : ''}
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="donor" className="block text-xs text-wattvision-textSecondary mb-1 ml-1 uppercase tracking-widest">
                  Nama Donatur
                </label>
                <input
                  id="donor"
                  type="text"
                  className="w-full bg-wattvision-bg border border-wattvision-border rounded-xl p-3 focus:outline-none focus:border-wattvision-primary transition-colors"
                  placeholder="Nama pemberi zakat (opsional)"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="recipient" className="block text-xs text-wattvision-textSecondary mb-1 ml-1 uppercase tracking-widest">
                  Nama Penerima
                </label>
                <input
                  id="recipient"
                  type="text"
                  className={`w-full bg-wattvision-bg border rounded-xl p-3 focus:outline-none transition-colors ${
                    fieldErrors.recipient_name ? 'border-wattvision-alert' : 'border-wattvision-border focus:border-wattvision-primary'
                  }`}
                  placeholder="Nama mustahik"
                  value={recipientName}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, recipient_name: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.recipient_name)}
                />
                {fieldErrors.recipient_name && (
                  <p className="text-[11px] text-wattvision-alert mt-1 ml-1">{fieldErrors.recipient_name}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="category" className="block text-xs text-wattvision-textSecondary mb-1 ml-1 uppercase tracking-widest">
                  Kategori Penyaluran
                </label>
                <select
                  id="category"
                  className="w-full bg-wattvision-bg border border-wattvision-border rounded-xl p-3 focus:outline-none focus:border-wattvision-primary transition-colors"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-[10px] text-wattvision-textSecondary mt-1 ml-1 uppercase tracking-wider">
                  Daftar kategori mengikuti validasi backend
                </p>
              </div>
              <div>
                <label htmlFor="province" className="block text-xs text-wattvision-textSecondary mb-1 ml-1 uppercase tracking-widest">
                  Provinsi
                </label>
                <select
                  id="province"
                  className={`w-full bg-wattvision-bg border rounded-xl p-3 focus:outline-none transition-colors ${
                    fieldErrors.region ? 'border-wattvision-alert' : 'border-wattvision-border focus:border-wattvision-primary'
                  }`}
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setCity('');
                    setFieldErrors((prev) => ({ ...prev, region: undefined }));
                  }}
                >
                  <option value="">Pilih Provinsi</option>
                  {Object.keys(INDONESIA_REGIONS).map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="city" className="block text-xs text-wattvision-textSecondary mb-1 ml-1 uppercase tracking-widest">
                  Kota/Kabupaten
                </label>
                <select
                  id="city"
                  className={`w-full bg-wattvision-bg border rounded-xl p-3 focus:outline-none transition-colors ${
                    fieldErrors.region ? 'border-wattvision-alert' : 'border-wattvision-border focus:border-wattvision-primary'
                  }`}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, region: undefined }));
                  }}
                  disabled={!province}
                >
                  <option value="">Pilih Kota</option>
                  {province && INDONESIA_REGIONS[province as keyof typeof INDONESIA_REGIONS].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {fieldErrors.region && (
                  <p className="text-[11px] text-wattvision-alert mt-1 ml-1">{fieldErrors.region}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-wattvision-textSecondary mb-1 ml-1 uppercase tracking-widest">
              Bukti Penyaluran (JPG, PNG, PDF — maks. {MAX_FILE_MB} MB)
            </label>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                fieldErrors.proof_file
                  ? 'border-wattvision-alert bg-wattvision-alert/5'
                  : file
                    ? 'border-wattvision-success bg-wattvision-success/5'
                    : 'border-wattvision-border hover:border-wattvision-primary bg-wattvision-bg'
              }`}
              onClick={() => document.getElementById('file-upload')?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-upload')?.click();
              }}
            >
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
              />
              <div className="flex flex-col items-center gap-3">
                {file ? (
                  <>
                    <CheckCircle className="text-wattvision-success" size={32} />
                    <span className="font-mono text-sm text-wattvision-success break-all">{file.name}</span>
                    <span className="text-[11px] text-wattvision-textSecondary font-mono">
                      {(file.size / 1024).toFixed(0)} KB · klik untuk mengganti
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="text-wattvision-textSecondary" size={32} />
                    <span className="text-wattvision-textSecondary text-sm">
                      Klik untuk memilih file bukti penyaluran
                    </span>
                  </>
                )}
              </div>
            </div>
            {fieldErrors.proof_file && (
              <p className="text-[11px] text-wattvision-alert ml-1">{fieldErrors.proof_file}</p>
            )}
            <p className="text-[10px] text-wattvision-textSecondary ml-1 leading-relaxed">
              File dikirim sebagai <span className="font-mono">proof_file</span> melalui multer di backend
              (disimpan ke <span className="font-mono">/uploads</span>, di-hash SHA-256).
              Mengunggah bukti bersifat disarankan — tanpa bukti, laporan ditandai anomali oleh backend.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wattvision-primary text-wattvision-bg font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-wattvision-primary/20 uppercase tracking-widest text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Mengirim…
              </>
            ) : (
              <>
                <Send size={20} /> Simpan Laporan Distribusi
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewDistributionRecord;
