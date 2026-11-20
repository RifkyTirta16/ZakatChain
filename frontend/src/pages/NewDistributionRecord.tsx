import { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Send, Loader2, X, Eye } from 'lucide-react';
import { INDONESIA_REGIONS } from '../utils/regions';
import apiClient from '../utils/api';
import { formatIDR, shortHash } from '../utils/format';
import { Badge, Card } from '../components/ui';
import { ON_CHAIN_NOTE } from '../components/ui/badgeStatus';

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
      setFieldErrors((prev) => ({ ...prev, proof_file: `Ukuran file maksimal ${MAX_FILE_MB} MB.` }));
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
        setErrorMessage(e2.response?.data?.error || 'Gagal mengirim data. Periksa koneksi backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8F8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Form */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-bg rounded-2xl flex items-center justify-center text-primary shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-primary-dark">Catat Distribusi Zakat</h1>
            <p className="text-xs sm:text-sm text-primary-dark/70">
              Formulir pencatatan penyaluran dana zakat dan infaq dengan bukti pendukung.
            </p>
          </div>
        </div>

        {/* Notifikasi Hasil Simpan */}
        {result && (
          <Card className="rounded-2xl p-5 border border-success/30 bg-success/10 space-y-2">
            <div className="flex items-center gap-2.5 text-success font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>Laporan penyaluran berhasil disimpan (ID #{result.id}).</span>
            </div>
            <div className="text-xs text-primary-dark/80 font-mono space-y-1 pl-7">
              <p>Audit hash: {shortHash(result.audit_hash, 12, 8)}</p>
              <div className="flex items-center gap-2 font-sans pt-1">
                <span>Status on-chain:</span>
                <Badge tone={result.blockchain_status === 'CONFIRMED' ? 'primary' : 'gold'}>
                  {result.blockchain_status === 'CONFIRMED'
                    ? `Terkonfirmasi (tx: ${shortHash(result.tx_hash)})`
                    : 'Tertunda On-Chain'}
                </Badge>
              </div>
            </div>
            <p className="text-[11px] text-primary-dark/60 pl-7 pt-1">
              {ON_CHAIN_NOTE}
            </p>
          </Card>
        )}

        {/* Notifikasi Error Global */}
        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-2xl border border-coral/30 bg-coral/10 text-coral-dark text-xs sm:text-sm flex items-start gap-2.5 font-medium"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Satu Kolom */}
        <Card className="rounded-2xl p-6 sm:p-8 bg-white border border-slate-200/70 shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* 1. Nominal */}
            <div>
              <label htmlFor="amount" className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5">
                Nominal Distribusi (Rp) <span className="text-coral">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-dark/50 font-bold text-sm">
                  Rp
                </span>
                <input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  className={`w-full min-h-[44px] rounded-xl bg-cream border py-2.5 pl-11 pr-4 text-sm text-primary-dark font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20 ${
                    fieldErrors.amount ? 'border-coral' : 'border-primary-bg'
                  }`}
                  placeholder="0"
                  value={groupThousands(amountDigits)}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.amount)}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                {fieldErrors.amount ? (
                  <p className="text-[11px] text-coral font-medium">{fieldErrors.amount}</p>
                ) : (
                  <span />
                )}
                {amountDigits && (
                  <p className="text-[11px] text-primary-dark/70 font-bold tabular-nums">
                    {formatIDR(Number(amountDigits))}
                  </p>
                )}
              </div>
            </div>

            {/* 2. Nama Penerima */}
            <div>
              <label htmlFor="recipient" className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5">
                Nama Penerima Manfaat (Mustahik) <span className="text-coral">*</span>
              </label>
              <input
                id="recipient"
                type="text"
                className={`w-full min-h-[44px] rounded-xl bg-cream border px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 ${
                  fieldErrors.recipient_name ? 'border-coral' : 'border-primary-bg'
                }`}
                placeholder="Nama lengkap mustahik"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, recipient_name: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.recipient_name)}
              />
              {fieldErrors.recipient_name && (
                <p className="text-[11px] text-coral font-medium mt-1">{fieldErrors.recipient_name}</p>
              )}
            </div>

            {/* 3. Nama Donatur (Opsional) */}
            <div>
              <label htmlFor="donor" className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5">
                Nama Donatur (Opsional)
              </label>
              <input
                id="donor"
                type="text"
                className="w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark placeholder-primary-dark/40 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Contoh: Hamba Allah / Nama perorangan"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
              />
            </div>

            {/* 4. Kategori Penyaluran */}
            <div>
              <label htmlFor="category" className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5">
                Kategori Penyaluran <span className="text-coral">*</span>
              </label>
              <select
                id="category"
                className="w-full min-h-[44px] rounded-xl bg-cream border border-primary-bg px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Wilayah Penyaluran: Provinsi & Kota/Kabupaten */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="province" className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5">
                  Provinsi <span className="text-coral">*</span>
                </label>
                <select
                  id="province"
                  className={`w-full min-h-[44px] rounded-xl bg-cream border px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                    fieldErrors.region ? 'border-coral' : 'border-primary-bg'
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
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="city" className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold mb-1.5">
                  Kota / Kabupaten <span className="text-coral">*</span>
                </label>
                <select
                  id="city"
                  className={`w-full min-h-[44px] rounded-xl bg-cream border px-4 py-2.5 text-sm text-primary-dark outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                    fieldErrors.region ? 'border-coral' : 'border-primary-bg'
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
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {fieldErrors.region && (
              <p className="text-[11px] text-coral font-medium mt-1">{fieldErrors.region}</p>
            )}

            {/* 6. Upload Bukti dengan Pratinjau */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs uppercase tracking-wider text-primary-dark/70 font-bold">
                Bukti Penyaluran (JPG, PNG, PDF — maks. {MAX_FILE_MB} MB)
              </label>

              {!file ? (
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer bg-primary-bg/20 hover:bg-primary-bg/40 ${
                    fieldErrors.proof_file ? 'border-coral' : 'border-primary/40 hover:border-primary'
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
                  <div className="flex flex-col items-center gap-2 text-primary-dark/70">
                    <Upload className="text-primary" size={28} />
                    <span className="text-xs sm:text-sm font-semibold">
                      Klik atau seret file bukti ke sini
                    </span>
                    <span className="text-[11px] text-primary-dark/50">
                      Format didukung: JPG, PNG, atau PDF (maks. {MAX_FILE_MB}MB)
                    </span>
                  </div>
                </div>
              ) : (
                /* Pratinjau Bukti Terpilih */
                <div className="p-4 rounded-2xl bg-cream/70 border border-cream space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={18} className="text-success shrink-0" />
                      <span className="text-xs font-bold text-primary-dark truncate">{file.name}</span>
                      <span className="text-[11px] text-primary-dark/60 font-mono shrink-0">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => clearFile()}
                      className="text-primary-dark/60 hover:text-coral p-1 rounded-lg"
                      title="Hapus file"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {previewUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-white max-h-48 flex justify-center">
                      <img src={previewUrl} alt="Pratinjau bukti penyaluran" className="object-contain max-h-48" />
                    </div>
                  )}

                  {!previewUrl && file.type === 'application/pdf' && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-primary-dark font-medium">
                      <Eye size={16} className="text-primary" />
                      <span>Dokumen PDF terlampir siap diverifikasi oleh sistem.</span>
                    </div>
                  )}
                </div>
              )}

              {fieldErrors.proof_file && (
                <p className="text-[11px] text-coral font-medium">{fieldErrors.proof_file}</p>
              )}
            </div>

            {/* 7. Ringkasan Sebelum Kirim */}
            {amountDigits && recipientName && province && city && (
              <div className="p-4 rounded-xl bg-primary-bg/40 border border-primary-bg space-y-2 text-xs">
                <p className="font-bold uppercase tracking-wider text-primary-dark/70 text-[11px]">
                  Ringkasan Penyaluran
                </p>
                <div className="grid grid-cols-2 gap-2 text-primary-dark">
                  <div>
                    <span className="text-primary-dark/60 block">Nominal:</span>
                    <span className="font-bold">{formatIDR(Number(amountDigits))}</span>
                  </div>
                  <div>
                    <span className="text-primary-dark/60 block">Penerima:</span>
                    <span className="font-bold">{recipientName}</span>
                  </div>
                  <div>
                    <span className="text-primary-dark/60 block">Kategori:</span>
                    <span className="font-bold">{category}</span>
                  </div>
                  <div>
                    <span className="text-primary-dark/60 block">Wilayah:</span>
                    <span className="font-bold">{city}, {province}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Aksi Utama Tunggal: Simpan Laporan */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center min-h-[44px] rounded-full bg-gradient-to-br from-gold to-gold-light text-primary-dark font-bold text-sm shadow-gold-glow outline-none focus-visible:ring-2 focus-visible:ring-primary transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Menyimpan Laporan...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Simpan Laporan Penyaluran
                  </>
                )}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default NewDistributionRecord;
