import { type ReactNode, Suspense } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Logo } from "@/components/shared/logo";

/** Static stand-in while the header (which reads the pathname) streams in. */
function HeaderFallback() {
  return (
    <div className="sticky top-0 z-40 h-16 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="container-app flex h-full items-center">
        <Logo />
      </div>
    </div>
  );
}

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
