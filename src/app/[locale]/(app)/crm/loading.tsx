function SkeletonCard() {
  return (
    <div className="min-h-32 rounded-xl border border-line bg-surface-raised p-4">
      <div className="h-3.5 w-24 animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
      <div className="mt-4 h-7 w-20 animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
      <div className="mt-4 h-3 w-32 animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
    </div>
  );
}

export default function CrmDashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8" aria-busy="true">
      <div className="mb-5 space-y-2">
        <div className="h-3 w-24 animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
        <div className="h-8 w-64 animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-surface-sunken motion-reduce:animate-none" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <SkeletonCard key={item} />)}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="h-80 animate-pulse rounded-xl border border-line bg-surface-raised motion-reduce:animate-none" />
        <div className="h-80 animate-pulse rounded-xl border border-line bg-surface-raised motion-reduce:animate-none" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="h-72 animate-pulse rounded-xl border border-line bg-surface-raised motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-xl border border-line bg-surface-raised motion-reduce:animate-none" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-xl border border-line bg-surface-raised motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-xl border border-line bg-surface-raised motion-reduce:animate-none" />
      </div>
    </div>
  );
}
