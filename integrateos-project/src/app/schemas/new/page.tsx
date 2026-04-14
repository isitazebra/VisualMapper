import Link from "next/link";
import { NewSchemaForm } from "@/components/workspace/NewSchemaForm";

export const metadata = {
  title: "New schema from sample — IntegrateOS",
};

export default function NewSchemaPage() {
  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-10 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/schemas" className="text-xs text-ink-mute hover:underline">
          ← Schemas
        </Link>
        <h1 className="text-3xl font-bold mt-3 mb-1">New schema from sample</h1>
        <p className="text-ink-soft mb-6">
          Paste a representative sample payload. We&apos;ll infer the structure and
          register it as a custom schema you can map against.
        </p>
        <NewSchemaForm />
      </div>
    </main>
  );
}
