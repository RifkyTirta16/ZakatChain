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
        <div className="text-center">
          <p className="text-primary-dark/70">Tidak ada tindakan, semua beres</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.label} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-primary-dark">{task.label}</p>
              <p className="text-xs text-primary-dark/60">
                {task.jumlah} item
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={task.tone}>{task.jumlah}</Badge>
              <a
                href={task.href}
                className="inline-flex items-center min-h-[44px] rounded-xl border-2 border-primary px-3 py-2 text-sm font-bold text-primary-dark hover:bg-primary-bg"
              >
                Lihat
              </a>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
