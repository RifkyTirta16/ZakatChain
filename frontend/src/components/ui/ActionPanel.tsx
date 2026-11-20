import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from './Badge';
import { Card } from './Card';

interface ActionItem {
  label: string;
  jumlah: number;
  href: string;
  tone: 'sky' | 'gold' | 'primary' | 'success' | 'coral';
}

interface ActionPanelProps {
  tasks: ActionItem[];
}

export const ActionPanel = ({ tasks }: ActionPanelProps) => {
  if (!tasks || tasks.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 text-slate-600 text-sm">
          <CheckCircle2 size={18} className="text-primary" />
          <span>Tidak ada antrean tindakan mendesak saat ini.</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.label} className="p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-forest-dark truncate">{task.label}</p>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{task.jumlah} item</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone={task.tone}>{task.jumlah}</Badge>
            <Link
              to={task.href}
              className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-[10px] border border-slate-200 px-3 text-xs font-semibold text-forest hover:bg-mint hover:border-primary/40 transition-colors"
            >
              Buka <ArrowRight size={13} className="ml-1" />
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
};
