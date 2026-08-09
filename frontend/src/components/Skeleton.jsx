export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonText({ lines = 1, className = "" }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3"
          style={{ width: i === lines - 1 && lines > 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`rounded-lg border border-ink-200 bg-surface p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-3 w-16" />
      </div>
      <SkeletonBlock className="mt-3 h-3 w-32" />
      <SkeletonBlock className="mt-2 h-3 w-full" />
    </div>
  );
}

export function SkeletonCardList({ count = 3, className = "" }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-lg border border-ink-200 bg-surface p-4">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="mt-2 h-6 w-14" />
    </div>
  );
}
