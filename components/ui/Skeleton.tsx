import { cn } from '@/lib/utils';

function Block({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-subtle', className)} />;
}

interface SkeletonProps {
  variant?: 'text' | 'number' | 'card' | 'row';
  className?: string;
}

export default function Skeleton({ variant = 'text', className }: SkeletonProps) {
  if (variant === 'number') return <Block className={cn('h-9 w-20', className)} />;

  if (variant === 'card') {
    return (
      <div className="rounded-[10px] border border-line bg-surface p-5 space-y-3">
        <Block className="h-3 w-24" />
        <Block className="h-9 w-16" />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className="flex items-center gap-4 border-b border-line px-6 py-4">
        <Block className="h-4 w-28" />
        <Block className="h-4 w-20" />
        <Block className="h-4 w-32" />
        <Block className="h-4 w-24" />
        <Block className="h-6 w-20 rounded-full" />
      </div>
    );
  }

  return <Block className={cn('h-4 w-full', className)} />;
}
