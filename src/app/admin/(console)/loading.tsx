import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56 bg-zinc-800" />
      <Skeleton className="h-80 rounded-xl bg-zinc-800" />
    </div>
  );
}
