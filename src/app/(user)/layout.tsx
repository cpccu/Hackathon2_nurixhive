import { type ReactNode, Suspense } from "react";
import { UserShell } from "@/components/layout/user-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96 rounded-2xl" />}>
      <UserShell>{children}</UserShell>
    </Suspense>
  );
}
