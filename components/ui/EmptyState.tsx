import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && <div className="mb-4 text-ink-3">{icon}</div>}
      <p className="text-base font-semibold text-ink">{title}</p>
      {message && <p className="mt-1 text-sm text-ink-2">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
