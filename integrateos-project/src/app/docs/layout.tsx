import Link from "next/link";
import { type ReactNode } from "react";

export const metadata = {
  title: "Docs — IntegrateOS",
  description:
    "Product documentation for IntegrateOS — the agentic B2B integration platform. Mapper, runtime, API reference.",
};

interface DocsLayoutProps {
  children: ReactNode;
}

/**
 * Docs layout: sticky sidebar nav on the left, content on the right.
 * Kept intentionally simple — no MDX, no plugins, just .tsx pages with
 * a shared shell.
 */
export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-paper-bg text-ink font-sans">
      <header className="border-b border-border bg-paper sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="w-3 h-3 bg-brand-blue rotate-45" />
              <span className="font-extrabold">IntegrateOS</span>
            </Link>
            <span className="text-ink-mute text-xs">· Docs</span>
          </div>
          <div className="flex gap-4 text-xs text-ink-soft">
            <Link href="/demo" className="hover:text-brand-blue">
              Demo
            </Link>
            <Link href="/" className="hover:text-brand-blue">
              App
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 flex gap-8 py-8">
        <DocsSidebar />
        <article className="flex-1 min-w-0 max-w-3xl">{children}</article>
      </div>
    </div>
  );
}

function DocsSidebar() {
  return (
    <nav className="w-56 flex-shrink-0 text-sm sticky top-16 self-start max-h-[calc(100vh-5rem)] overflow-y-auto pb-8">
      <NavGroup title="Get started">
        <NavItem href="/docs">Overview</NavItem>
        <NavItem href="/docs/quickstart">Quickstart</NavItem>
      </NavGroup>
      <NavGroup title="Concepts">
        <NavItem href="/docs/concepts">Mapper concepts</NavItem>
        <NavItem href="/docs/rule-types">Rule types</NavItem>
        <NavItem href="/docs/formats">Formats</NavItem>
      </NavGroup>
      <NavGroup title="Runtime">
        <NavItem href="/docs/runtime">Endpoints &amp; transactions</NavItem>
      </NavGroup>
      <NavGroup title="Reference">
        <NavItem href="/docs/api">API reference</NavItem>
      </NavGroup>
    </nav>
  );
}

function NavGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold uppercase text-ink-mute tracking-wider mb-1">
        {title}
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="block py-1 px-2 -mx-2 rounded text-ink-soft hover:text-ink hover:bg-paper-cream"
      >
        {children}
      </Link>
    </li>
  );
}
