import Link from "next/link";
import { PUBLIC_NAV, SECONDARY_NAV } from "@/components/layout/nav-config";
import { Logo } from "@/components/shared/logo";

const ACCOUNT_LINKS = [
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/signup" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Search", href: "/search" },
  { label: "Staff console", href: "/admin/login" },
];

/** Site footer (server component, zero client JS). */
export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border bg-surface/60">
      <div className="container-app grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm space-y-4">
          <Logo tagline />
          <p className="text-sm leading-relaxed text-fg-muted">
            One place for all of City University: events, notes, bus times, notices, lost &amp; found and a campus assistant that only answers from verified data.
          </p>
          <p className="text-xs text-fg-subtle">Khagan, Birulia, Savar, Dhaka 1216, Bangladesh</p>
        </div>
        <FooterColumn title="Explore" links={PUBLIC_NAV} />
        <FooterColumn title="Services" links={SECONDARY_NAV} />
        <FooterColumn title="Account" links={ACCOUNT_LINKS} />
      </div>
      <div className="border-t border-border">
        <div className="container-app flex flex-col gap-2 py-5 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © CampusOS · City University, Bangladesh. Designed &amp; developed by <span className="font-semibold text-fg-muted">Nurix Hive</span> team.
          </p>
          <p>
            Press <kbd className="rounded border border-border px-1 font-sans">Ctrl</kbd> + <kbd className="rounded border border-border px-1 font-sans">K</kbd> to search anywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <nav aria-label={title}>
      <h2 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-fg-subtle">{title}</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} prefetch={false} className="text-sm text-fg-muted transition hover:text-primary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
