import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="relative p-[1px] rounded-xl bg-gradient-to-b from-white/10 to-transparent">
      <div className="relative h-full bg-black/40 backdrop-blur-xl rounded-xl p-6">
        <Skeleton className="w-12 h-12 rounded-lg mb-6 bg-white/10" />
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-6 w-32 bg-white/10" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/10" />
        </div>
        <Skeleton className="h-4 w-full mt-3 bg-white/10" />
        <Skeleton className="h-4 w-3/4 mt-2 bg-white/10" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="text-center animate-pulse">
      <Skeleton className="h-12 w-24 mx-auto mb-2 bg-white/10 rounded" />
      <Skeleton className="h-4 w-20 mx-auto bg-white/10 rounded" />
    </div>
  );
}

export function SkeletonDocCard() {
  return (
    <div className="p-6 rounded-xl bg-black/40 border border-white/10">
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
        <div className="flex-1">
          <Skeleton className="h-5 w-48 mb-2 bg-white/10" />
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-2/3 mt-1 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
