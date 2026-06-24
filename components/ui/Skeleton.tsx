import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-ground-3",
        className
      )}
    />
  );
}

export function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3.5 px-[18px] py-3.5 border-b border-[var(--border)]">
      <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
      <Skeleton className="flex-1 h-3.5" />
      <Skeleton className="w-20 h-5" />
      <Skeleton className="w-14 h-3" />
      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-ground-2 border border-[var(--border)] rounded-2xl p-6 animate-pulse",
        className
      )}
    >
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-12 w-16 mb-2" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}
