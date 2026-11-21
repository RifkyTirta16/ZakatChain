import { useState } from 'react';
import { ExternalLink, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeBoxProps {
  value: string;
  lanValue?: string;
  size?: number;
}

/**
 * Renders a scannable ISO-18004 SVG QR code for DOKU Sandbox / local QRIS sessions.
 * Offers a fallback LAN IP switch in local development if a phone demo uses the local simulator.
 */
export const QrCodeBox = ({ value, lanValue, size = 184 }: QrCodeBoxProps) => {
  const [useLan, setUseLan] = useState(false);
  const activeUrl = useLan && lanValue ? lanValue : value;
  const isHttp = /^https?:\/\//i.test(activeUrl);
  const isDokuCheckout = /^https:\/\/[^/]*doku\.com\//i.test(activeUrl);

  return (
    <div className="inline-flex flex-col items-center gap-2.5">
      <div className="p-3.5 bg-cream rounded-2xl border border-slate-200 inline-block">
        <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs">
          <QRCodeSVG
            value={activeUrl}
            size={size}
            level="M"
            bgColor="#FFFFFF"
            fgColor="#022C22"
          />
        </div>
      </div>

      {isDokuCheckout && !useLan && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-forest-dark">
          DOKU Sandbox · Bukan Uang Asli
        </span>
      )}

      {(import.meta.env.DEV || isDokuCheckout) && isHttp && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {isDokuCheckout && !useLan ? '1. Buka Halaman QRIS DOKU' : 'Buka Simulator Bayar QRIS'}{' '}
            <ExternalLink size={12} />
          </a>
          {isDokuCheckout && !useLan && (
            <a
              href="https://sandbox.doku.com/qris-simulator/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
            >
              2. Upload QR ke Simulator DOKU <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {isDokuCheckout && !useLan && (
        <p className="max-w-xs text-[11px] leading-relaxed text-slate-500">
          Cara bayar sandbox tanpa saldo asli: klik <strong>Download QR Code</strong> di halaman DOKU, lalu unggah di tab <strong>UPLOAD QR</strong> Simulator DOKU.
        </p>
      )}

      {import.meta.env.DEV && lanValue && (
        <button
          type="button"
          onClick={() => setUseLan((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-forest-dark hover:bg-mint transition-colors"
        >
          <Smartphone size={12} className="text-primary" />
          {useLan
            ? 'Kembali ke QR DOKU / Utama'
            : /^https:\/\/[^/]*doku\.com\//i.test(value)
              ? 'Ganti ke Simulator QR Lokal (IP LAN)'
              : 'Ganti QR ke IP WiFi LAN (Scan HP)'}
        </button>
      )}
    </div>
  );
};
