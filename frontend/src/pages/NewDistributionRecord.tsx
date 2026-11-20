import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { INDONESIA_REGIONS } from '../utils/regions';
import apiClient from '../utils/api';
import { formatIDR, shortHash } from '../utils/format';
import { Badge, Button, Card, JourneyTracker, ON_CHAIN_NOTE, SectionHeader } from '../components/ui';

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleAmountChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 15);
    setAmountDigits(digits);
    setFieldErrors((prev) => ({ ...prev, amount: undefined }));
  };

  const handleFileChange = (selected: File | null) => {
    setFieldErrors((prev) => ({ ...prev, proof_file: undefined }));
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
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
      setFieldErrors((prev) => ({ ...prev, proof_file: `Ukuran berkas maksimal ${MAX_FILE_MB} MB.` }));
      return;
    }
    setFile(selected);
    if (selected.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    const amount = Number(amountDigits);
    if (!amountDigits || Number.isNaN(amount) || amount <= 0) {
      errors.amount = 'Nominal harus lebih besar dari 0.';
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
      clearFile();
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string; details?: unknown } } };
      const details = e2.response?.data?.details;
      if (Array.isArray(details)) {
        const msgs = details
          .map((d: { path?: string[]; message?: string }) => `${(d.path || []).join('.')}: ${d.message}`)
          .join('; ');
        setErrorMessage(msgs || 'Validasi backend menolak data.');
      } else {
        setErrorMessage(e2.response?.data?.error || 'Gagal mengirim laporan. Periksa koneksi backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stageStep = result
    ? result.blockchain_status === 'CONFIRMED'
      ? 4
      : 2
    : loading
      ? 1
      : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SectionHeader
        title="Catat Distribusi Zakat"
        subtitle="Simpan catatan penyaluran ke database terlebih dahulu, lalu catat hash audit ke smart contract Ethereum."
      />

      <Card>
        <JourneyTracker
          currentStep={stageStep}
          steps={['Isi Data', 'Simpan DB & Hash', 'Kirim ke Ethereum', 'Tercatat On-Chain']}
        />
      </Card>

      {result && (
        <Card className="border-emerald-200 bg-mint/50 space-y-2.5">
          <div className="flex items-center gap-2 text-forest font-bold text-sm">
            <CheckCircle2 size={18} className="text-primary" />
            <span>Laporan penyaluran berhasil disimpan (ID #{result.id}).</span>
          </div>
          <div className="text-xs text-slate-700 font-mono space-y-1 pl-6">
            <p>Audit hash: {shortHash(result.audit_hash, 12, 8)}</p>
            <div className="flex items-center gap-2 font-sans pt-1">
              <span>Status on-chain:</span>
              <Badge tone={result.blockchain_status === 'CONFIRMED' ? 'primary' : 'warning'}>
                {result.blockchain_status === 'CONFIRMED'
                  ? `Terkonfirmasi (tx: ${shortHash(result.tx_hash)})`
                  : 'Menunggu Node Blockchain'}
              </Badge>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 pl-6">{ON_CHAIN_NOTE}</p>
        </Card>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 font-medium"
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-danger" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText size={18} className="text-primary" />
            <h2 className="text-base font-bold text-forest-dark">Formulir Penyaluran</h2>
          </div>

          <div>
            <label htmlFor="amount" className="block text-xs uppercase tracking-wider text-slateText font-semibold mb-1.5">
              Nominal Distribusi (IDR) <span className="text-danger">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                Rp
              </span>
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                className={`w-full min-h-[44px] rounded-[10px] bg-white border py-2.5 pl-11 pr-4 text-sm text-forest-dark font-mono font-bold outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${
                  fieldErrors.amount ? 'border-danger' : 'border-slate-300'
                }`}
                placeholder="0"
                value={groupThousands(amountDigits)}
                onChange={(e) => handleAmountChange(e.target.value)}
                aria-invalid={Boolean(fieldErrors.amount)}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              {fieldErrors.amount ? (
                <p className="text-xs text-danger font-medium">{fieldErrors.amount}</p>
              ) : (
                <span />
              )}
              {amountDigits && (
                <p className="text-xs text-primary font-bold tabular-nums">{formatIDR(Number(amountDigits))}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="recipient" className="block text-xs uppercase tracking-wider text-slateText font-semibold mb-1.5">
              Nama Penerima Manfaat (Mustahik — Privat) <span className="text-danger">*</span>
            </label>
            <input
              id="recipient"
              type="text"
              className={`w-full min-h-[44px] rounded-[10px] bg-white border px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${
                fieldErrors.recipient_name ? 'border-danger' : 'border-slate-300'
              }`}
              placeholder="Nama lengkap mustahik (tidak dibuka ke publik)"
              value={recipientName}
              onChange={(e) => {
                setRecipientName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, recipient_name: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.recipient_name)}
            />
            {fieldErrors.recipient_name && (
              <p className="text-xs text-danger font-medium mt-1">{fieldErrors.recipient_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="donor" className="block text-xs uppercase tracking-wider text-slateText font-semibold mb-1.5">
              Nama Muzakki / Sumber Dana (Opsional)
            </label>
            <input
              id="donor"
              type="text"
              className="w-full min-h-[44px] rounded-[10px] bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              placeholder="Contoh: Hamba Allah / Program Pangan"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-xs uppercase tracking-wider text-slateText font-semibold mb-1.5">
              Kategori Penyaluran <span className="text-danger">*</span>
            </label>
            <select
              id="category"
              className="w-full min-h-[44px] rounded-[10px] bg-white border border-slate-300 px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary cursor-pointer"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="province" className="block text-xs uppercase tracking-wider text-slateText font-semibold mb-1.5">
                Provinsi <span className="text-danger">*</span>
              </label>
              <select
                id="province"
                className={`w-full min-h-[44px] rounded-[10px] bg-white border px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer ${
                  fieldErrors.region ? 'border-danger' : 'border-slate-300'
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
              <label htmlFor="city" className="block text-xs uppercase tracking-wider text-slateText font-semibold mb-1.5">
                Kota / Kabupaten <span className="text-danger">*</span>
              </label>
              <select
                id="city"
                className={`w-full min-h-[44px] rounded-[10px] bg-white border px-3.5 py-2.5 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer disabled:bg-slate-100 ${
                  fieldErrors.region ? 'border-danger' : 'border-slate-300'
                }`}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, region: undefined }));
                }}
                disabled={!province}
              >
                <option value="">Pilih Kota / Kabupaten</option>
                {province &&
                  INDONESIA_REGIONS[province as keyof typeof INDONESIA_REGIONS]?.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
              </select>
            </div>
          </div>
          {fieldErrors.region && <p className="text-xs text-danger font-medium">{fieldErrors.region}</p>}

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slateText font-semibold">
              Dokumen Bukti Penyaluran (JPG, PNG, PDF — maks. {MAX_FILE_MB} MB)
            </label>

            {!file ? (
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer bg-cream hover:bg-mint/40 ${
                  fieldErrors.proof_file ? 'border-danger' : 'border-slate-300 hover:border-primary'
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
                <div className="flex flex-col items-center gap-2 text-slate-600">
                  <Upload className="text-primary" size={26} />
                  <span className="text-xs sm:text-sm font-semibold text-forest-dark">
                    Klik untuk mengunggah foto atau dokumen bukti
                  </span>
                  <span className="text-xs text-slate-500">JPG, PNG, atau PDF (maks. {MAX_FILE_MB} MB)</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-cream border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={18} className="text-primary shrink-0" />
                    <span className="text-xs font-bold text-forest-dark truncate">{file.name}</span>
                    <span className="text-xs text-slate-500 font-mono shrink-0">
                      ({(file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-slate-500 hover:text-danger p-1 rounded-lg"
                    title="Hapus file"
                  >
                    <X size={16} />
                  </button>
                </div>

                {previewUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-48 flex justify-center">
                    <img src={previewUrl} alt="Pratinjau bukti penyaluran" className="object-contain max-h-48" />
                  </div>
                )}

                {!previewUrl && file.type === 'application/pdf' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-forest-dark font-medium">
                    <Eye size={16} className="text-primary" />
                    <span>Dokumen PDF terlampir siap diverifikasi oleh auditor.</span>
                  </div>
                )}
              </div>
            )}
            {fieldErrors.proof_file && <p className="text-xs text-danger font-medium">{fieldErrors.proof_file}</p>}
          </div>

          {amountDigits && recipientName && province && city && (
            <div className="p-4 rounded-xl bg-mint/60 border border-primary/20 space-y-2 text-xs">
              <p className="font-bold uppercase tracking-wider text-forest text-[11px]">Ringkasan Sebelum Simpan</p>
              <div className="grid grid-cols-2 gap-2 text-forest-dark">
                <div>
                  <span className="text-slate-500 block">Nominal</span>
                  <span className="font-bold tabular-nums">{formatIDR(Number(amountDigits))}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mustahik (Privat)</span>
                  <span className="font-bold">{recipientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Kategori</span>
                  <span className="font-bold">{category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Wilayah</span>
                  <span className="font-bold">{city}, {province}</span>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
            <Send size={16} /> Simpan Laporan Penyaluran
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default NewDistributionRecord;
