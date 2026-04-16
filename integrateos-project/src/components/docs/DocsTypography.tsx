import Link from "next/link";
import { type ReactNode } from "react";

/** Section heading with anchor link for deep-linking. */
export function H1({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-bold text-ink mb-4">{children}</h1>;
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="text-2xl font-bold text-ink mt-10 mb-3 scroll-mt-20"
    >
      {children}
    </h2>
  );
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3
      id={id}
      className="text-lg font-bold text-ink mt-6 mb-2 scroll-mt-20"
    >
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-ink-soft leading-relaxed mb-4 text-[15px]">{children}</p>
  );
}

/** Inline monospace code. */
export function C({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[13px] bg-paper-cream px-1.5 py-0.5 rounded border border-border text-ink">
      {children}
    </code>
  );
}

/** Fenced code block. */
export function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="font-mono text-[12px] bg-paper border border-border rounded p-3 overflow-x-auto mb-4 leading-relaxed">
      {children}
    </pre>
  );
}

/** Subtle callout box for tips / gotchas. */
export function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "tip";
  children: ReactNode;
}) {
  const style =
    tone === "warn"
      ? "border-brand-amber bg-brand-amber-soft text-ink"
      : tone === "tip"
        ? "border-brand-green bg-brand-green-soft text-ink"
        : "border-brand-blue bg-brand-blue-soft text-ink";
  return (
    <div
      className={`border-l-4 ${style} rounded-r px-4 py-3 mb-4 text-[14px]`}
    >
      {children}
    </div>
  );
}

/** Bulleted list with comfortable spacing. */
export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc pl-6 mb-4 text-ink-soft space-y-1 text-[15px]">
      {children}
    </ul>
  );
}

export function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal pl-6 mb-4 text-ink-soft space-y-1 text-[15px]">
      {children}
    </ol>
  );
}

/** Simple 2-column table for reference rows. */
export function RefTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-[13px] border border-border rounded">
        <thead>
          <tr className="bg-paper-cream text-ink-soft uppercase font-bold text-[10px]">
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-1.5 border-b border-border">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border hover:bg-paper-cream/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Internal doc link. */
export function DocLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-brand-blue hover:underline">
      {children}
    </Link>
  );
}
