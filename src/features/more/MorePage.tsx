import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { MORE } from '../../app/Layout';
import { PageHeader } from '../../components/ui';

export function MorePage() {
  return (
    <div>
      <PageHeader title="Thêm" />
      <ul className="space-y-2">
        {MORE.map(({ to, label, desc, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-4 shadow-card hover:bg-surface2">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted">{desc}</span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
