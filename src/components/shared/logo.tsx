import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

/** CampusOS mark: a stylised "C" orbit around a campus node. */
export function LogoMark({ className }: { className?: string }) {
  // Unique per instance: a display:none copy (responsive swap) must not own the gradient other copies reference.
  const gradientId = `logo-g-${useId().replaceAll(":", "")}`;
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gradientId})`} />
      <path d="M27.5 13.2A10 10 0 1 0 27.5 26.8" fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round" />
      <circle cx="27.6" cy="20" r="3.1" fill="white" />
      <circle cx="20" cy="20" r="2" fill="white" opacity="0.7" />
    </svg>
  );
}

/** Logo lock-up; links home unless `href={null}`. */
export function Logo({ className, href = "/", compact, inverted }: { className?: string; href?: string | null; compact?: boolean; inverted?: boolean }) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-lg font-bold tracking-tight", inverted && "text-white")}>
            Campus<span className={inverted ? "text-white/80" : "text-gradient"}>OS</span>
          </span>
          <span className={cn("mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em]", inverted ? "text-white/70" : "text-fg-subtle")}>City University</span>
        </span>
      )}
    </span>
  );
  if (href === null) return content;
  return (
    <Link href={href} className="rounded-xl" aria-label="CampusOS home">
      {content}
    </Link>
  );
}
