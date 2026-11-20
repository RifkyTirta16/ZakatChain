import { useState } from 'react';
import { ExternalLink, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface QrCodeBoxProps {
  value: string;
  lanValue?: string;
  size?: number;
}

/**
 * Renders a scannable ISO-18004 SVG QR code for QRIS sandbox sessions.
 * Offers a one-click LAN IP switch in local development so a phone on the same
 * WiFi network can scan the QR and trigger live status confirmation.
 */
export const QrCodeBox = ({ value, lanValue, size = 184 }: QrCodeBoxProps) => {
  const [useLan, setUseLan] = useState(false);
  const activeUrl = useLan && lanValue ? lanValue : value;
  const isDevHttp = import.meta.env.DEV && /^https?:\/\//i.test(activeUrl);

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

      {import.meta.env.DEV && lanValue && (
        <button
          type="button"
          onClick={() => setUseLan((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-forest-dark hover:bg-mint transition-colors"
        >
          <Smartphone size={12} className="text-primary" />
          {useLan ? 'Mode QR: IP WiFi LAN (Siap Scan HP)' : 'Ganti QR ke IP WiFi LAN (Scan HP)'}
        </button>
      )}

      {isDevHttp && (
        <a
          href={activeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Buka Simulator Bayar QRIS <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
};
