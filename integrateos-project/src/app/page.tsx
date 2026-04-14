import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-16 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 bg-brand-blue rotate-45" />
          <span className="text-2xl font-extrabold">IntegrateOS</span>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-ink">
          Self-learning B2B integration mapping
        </h1>
        <p className="text-ink-soft text-lg mb-8">
          Replaces Excel-based DMA workflows with an interactive, collaborative web app.
          Map X12 EDI (204, 214, 210, 990, 850, 855, 856, 810) across formats (XML, JSON,
          OTM XML, CSV) with customer-specific override stacks.
        </p>
        <div className="flex gap-3">
          <Link
            href="/mapper"
            className="px-5 py-2.5 rounded bg-brand-blue text-white font-semibold hover:opacity-90"
          >
            Open Mapping Studio →
          </Link>
          <a
            href="https://github.com/isitazebra/visualmapper"
            className="px-5 py-2.5 rounded border border-border text-ink hover:bg-paper-cream"
          >
            View Source
          </a>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 text-sm">
          <div className="border border-border rounded p-4 bg-paper">
            <div className="font-bold mb-1 text-brand-blue">8 Transaction Types</div>
            <div className="text-ink-soft">
              204, 990, 214, 210, 850, 855, 856, 810 across X12 versions 3040–5010
            </div>
          </div>
          <div className="border border-border rounded p-4 bg-paper">
            <div className="font-bold mb-1 text-brand-purple">4 Target Formats</div>
            <div className="text-ink-soft">Internal XML, JSON API, OTM XML, CSV/Flat File</div>
          </div>
          <div className="border border-border rounded p-4 bg-paper">
            <div className="font-bold mb-1 text-brand-orange">Override Stacks</div>
            <div className="text-ink-soft">
              Base mapping + customer overrides per field (UPS SCS, Kroger, Elanco, …)
            </div>
          </div>
          <div className="border border-border rounded p-4 bg-paper">
            <div className="font-bold mb-1 text-brand-green">15 Rule Types</div>
            <div className="text-ink-soft">
              Direct, hardcode, conditional, lookup, concat, date convert, HL counter, …
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
