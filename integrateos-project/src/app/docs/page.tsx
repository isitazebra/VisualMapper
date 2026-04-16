import {
  H1,
  H2,
  P,
  Callout,
  DocLink,
} from "@/components/docs/DocsTypography";

export const metadata = {
  title: "Docs — IntegrateOS",
  description:
    "Documentation for IntegrateOS — the agentic B2B integration platform.",
};

export default function DocsHomePage() {
  return (
    <>
      <H1>IntegrateOS documentation</H1>
      <P>
        IntegrateOS is an agentic B2B integration platform. You define mappings
        between any two payload formats — EDI X12, EDIFACT, JSON, XML, CSV — in
        minutes, author rules in plain English with Claude, and run every
        production transaction through the same engine your design-time
        preview uses.
      </P>
      <P>
        These docs cover the concepts, the rule grammar, the runtime, and the
        REST API. Start with the <DocLink href="/docs/quickstart">Quickstart</DocLink>{" "}
        if you&apos;re new.
      </P>

      <Callout tone="tip">
        Want to explore without reading? Open the{" "}
        <DocLink href="/demo">read-only demo</DocLink> — a real Coyote 204 load
        tender mapping with 42 rules and customer overrides, pre-loaded with a
        sample payload.
      </Callout>

      <H2>Sections</H2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <SectionCard
          href="/docs/quickstart"
          title="Quickstart"
          body="Create a partner, build a mapping, send a test payload through the runtime — end to end in 10 minutes."
        />
        <SectionCard
          href="/docs/concepts"
          title="Mapper concepts"
          body="Schemas, loops, customer overrides, lookup tables, aggregations."
        />
        <SectionCard
          href="/docs/rule-types"
          title="Rule types"
          body="Every rule type the engine executes, with syntax and examples."
        />
        <SectionCard
          href="/docs/formats"
          title="Formats"
          body="X12, EDIFACT, JSON, XML, CSV — parsing, emission, qualified segments, loops."
        />
        <SectionCard
          href="/docs/runtime"
          title="Runtime"
          body="Ingress endpoints, transaction lifecycle, alerts, exception queue."
        />
        <SectionCard
          href="/docs/api"
          title="API reference"
          body="Every REST endpoint — partners, mappings, schemas, lookups, endpoints, runs, alerts, AI."
        />
      </div>
    </>
  );
}

function SectionCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <a
      href={href}
      className="block border border-border rounded p-4 bg-paper hover:bg-paper-cream transition"
    >
      <div className="font-bold text-ink mb-1">{title}</div>
      <div className="text-sm text-ink-soft">{body}</div>
    </a>
  );
}
