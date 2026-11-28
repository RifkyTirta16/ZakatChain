import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Prevents runtime rendering errors inside lazy routes from blanking the screen. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[UI ERROR BOUNDARY]', error.message, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
        <Card className="max-w-md w-full text-center space-y-4 p-8">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <h1 className="font-display text-xl font-extrabold text-forest-dark">
            Terjadi Gangguan Tampilan
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Halaman mengalami kendala saat dimuat. Data transaksi Anda tetap aman; silakan muat ulang halaman atau kembali ke beranda.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} /> Muat Ulang Halaman
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = '/';
              }}
            >
              <Home size={14} /> Ke Beranda
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}
