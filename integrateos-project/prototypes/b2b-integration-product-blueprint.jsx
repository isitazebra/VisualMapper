import { useState } from "react";

const TABS = [
  "Vision",
  "Architecture",
  "Onboarding Engine",
  "Platform Features",
  "Monetization",
  "GTM & Roadmap",
];

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 3l5 5-5 5" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#10b981" strokeWidth="2.5">
    <path d="M3 8.5l3.5 3.5 6.5-7" />
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="2.5">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const MetricCard = ({ value, label, sub }) => (
  <div style={{
    background: "linear-gradient(135deg, #0a0f1a 0%, #131b2e 100%)",
    border: "1px solid #1e3a5f",
    borderRadius: 8,
    padding: "20px 16px",
    textAlign: "center",
    minWidth: 140,
    flex: 1,
  }}>
    <div style={{ fontSize: 28, fontWeight: 800, color: "#38bdf8", fontFamily: "'JetBrains Mono', monospace", letterSpacing: -1 }}>{value}</div>
    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sub}</div>}
  </div>
);

const SectionBlock = ({ title, children, accent = "#38bdf8" }) => (
  <div style={{
    background: "#0d1117",
    border: `1px solid ${accent}22`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 6,
    padding: "20px 24px",
    marginBottom: 16,
  }}>
    {title && <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</div>}
    {children}
  </div>
);

const FlowStep = ({ num, title, desc, time }) => (
  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
    <div style={{
      width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #38bdf8, #6366f1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{num}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{title}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
      {time && <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>⏱ {time}</div>}
    </div>
  </div>
);

const CompRow = ({ feature, us, them }) => (
  <div style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid #1e293b", alignItems: "center" }}>
    <div style={{ flex: 2, fontSize: 13, color: "#cbd5e1" }}>{feature}</div>
    <div style={{ flex: 1, textAlign: "center" }}>{us ? <CheckIcon /> : <XIcon />}</div>
    <div style={{ flex: 1, textAlign: "center" }}>{them ? <CheckIcon /> : <XIcon />}</div>
  </div>
);

// ── TABS CONTENT ──

function VisionTab() {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6, lineHeight: 1.3 }}>
        The Problem: B2B Integration Is Stuck in 2005
      </div>
      <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
        AIT Worldwide has 50 new customers to onboard. On IBM Sterling, each one takes <span style={{ color: "#f87171", fontWeight: 700 }}>6–12 weeks</span> of manual configuration — EDI mapping, AS2 certificate exchange, testing cycles, compliance validation. That's <span style={{ color: "#f87171", fontWeight: 700 }}>300+ weeks of labor</span> just to start trading. This isn't a technology problem. It's an architecture problem.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <MetricCard value="6-12wk" label="Current Onboarding" sub="per partner on Sterling" />
        <MetricCard value="< 48hr" label="Target Onboarding" sub="with agentic automation" />
        <MetricCard value="$18K" label="Cost per Partner" sub="Sterling avg. fully loaded" />
        <MetricCard value="$800" label="Target Cost" sub="90%+ reduction" />
      </div>

      <SectionBlock title="Product Name: IntegrateOS" accent="#a78bfa">
        <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: "#a78bfa" }}>IntegrateOS</strong> is a self-learning B2B integration platform that replaces the manual, consultant-driven model of Sterling/SPS/OpenText with an agentic AI engine that autonomously onboards trading partners, maps data formats, negotiates protocols, and monitors connections — in hours, not months.
        </p>
      </SectionBlock>

      <SectionBlock title="Core Thesis">
        <div style={{ display: "grid", gap: 12 }}>
          {[
            ["Integration-as-Code, not Integration-as-Config", "Every partner connection is a declarative spec — version-controlled, testable, deployable. Not a GUI config buried in Sterling."],
            ["Agentic Onboarding", "AI agents handle the entire partner lifecycle: detect capabilities, propose mappings, negotiate protocols, validate compliance, go live."],
            ["Network Effects", "Every partner onboarded makes the next one faster. Mappings, rules, compliance patterns are learned and reused across the network."],
            ["Open Core + Marketplace", "Core engine is open and extensible. Revenue comes from managed network, compliance modules, and vertical accelerators."],
          ].map(([t, d], i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <ChevronRight />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{t}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}

function ArchitectureTab() {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>Platform Architecture</div>

      <SectionBlock title="Layer 1 — Connectivity Fabric" accent="#22d3ee">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          Protocol-agnostic ingress/egress layer supporting AS2, SFTP, HTTP/REST, GraphQL, gRPC, SOAP, Kafka, MQ. Built on an event mesh (not point-to-point) so every message is observable, replayable, and auditable. <strong>Key differentiator:</strong> protocol auto-detection — drop a connection and the system identifies the protocol, encryption, and certificate requirements automatically.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {["AS2", "SFTP", "REST", "GraphQL", "gRPC", "SOAP", "Kafka", "AMQP", "WebSocket"].map(p => (
            <span key={p} style={{
              padding: "4px 10px", borderRadius: 4, background: "#164e63", color: "#22d3ee",
              fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            }}>{p}</span>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Layer 2 — Semantic Data Engine" accent="#a78bfa">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          Universal canonical model that understands EDI (X12, EDIFACT, HL7), flat files, JSON, XML, CSV, Parquet, and proprietary formats. The engine doesn't just transform — it <strong>understands semantics</strong>. It knows that "Ship-To Party" in EDIFACT NAD+ST is the same as "N1*ST" in X12 856. Built on an LLM-powered mapping engine with deterministic validation layers.
        </div>
        <div style={{ background: "#1a1028", border: "1px solid #6366f133", borderRadius: 6, padding: 14, marginTop: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#a78bfa", lineHeight: 1.8 }}>
          <div style={{ color: "#64748b" }}>// Mapping spec — declarative, version-controlled</div>
          <div>{"{"}</div>
          <div>&nbsp; "source": "X12_850",</div>
          <div>&nbsp; "target": "canonical.purchase_order",</div>
          <div>&nbsp; "rules": [</div>
          <div>&nbsp;&nbsp;&nbsp; {"{ \"from\": \"BEG03\", \"to\": \"po_number\", \"confidence\": 0.99 }"},</div>
          <div>&nbsp;&nbsp;&nbsp; {"{ \"from\": \"N1*ST/N3\", \"to\": \"ship_to.address\", \"confidence\": 0.97 }"},</div>
          <div>&nbsp;&nbsp;&nbsp; {"{ \"from\": \"PO1*02\", \"to\": \"line_items[].quantity\", \"confidence\": 0.98 }"}</div>
          <div>&nbsp; ],</div>
          <div>&nbsp; "learned_from": ["kroger_850_v3", "walmart_850_v7", "costco_850_v2"]</div>
          <div>{"}"}</div>
        </div>
      </SectionBlock>

      <SectionBlock title="Layer 3 — Agentic Orchestration" accent="#f59e0b">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          The brain of the platform. A multi-agent system using the <strong>Perceive → Diagnose → Plan → Decide → Act → Learn</strong> loop. Each agent is specialized:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            ["🔍 Discovery Agent", "Scans partner capabilities, detects EDI versions, protocols, compliance requirements"],
            ["🗺️ Mapping Agent", "Auto-generates field mappings using semantic understanding + historical patterns"],
            ["🤝 Negotiation Agent", "Proposes connection specs to partner, handles back-and-forth on cert exchange & testing"],
            ["✅ Compliance Agent", "Validates FSMA 204, GS1, HIPAA, SOX requirements and generates audit trails"],
            ["📊 Monitoring Agent", "Watches live connections, detects anomalies, auto-remediates common failures"],
            ["🧠 Learning Agent", "Feeds outcomes back into the network — every onboarding improves the next"],
          ].map(([t, d], i) => (
            <div key={i} style={{ background: "#1a1408", border: "1px solid #f59e0b22", borderRadius: 6, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>{t}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Layer 4 — Developer Platform" accent="#10b981">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          API-first. Every capability exposed as a composable API. CLI for power users. SDK for embedded integration. Terraform provider for infrastructure-as-code. GitOps-native — partner specs live in repos, changes go through PRs, deployments are CI/CD pipelines.
        </div>
      </SectionBlock>
    </div>
  );
}

function OnboardingTab() {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Agentic Onboarding Engine</div>
      <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
        The killer feature. This is what turns 6–12 weeks into 24–48 hours. Here's the autonomous flow for onboarding a new trading partner:
      </p>

      <SectionBlock title="Autonomous Onboarding Flow" accent="#38bdf8">
        <FlowStep num="1" title="Partner Invitation & Discovery" desc="Send a smart invite link. The system crawls the partner's public EDI capabilities, checks SPS/GS1 registries, and pre-populates a capability profile. Partner confirms or corrects via a simple self-service portal." time="< 2 hours" />
        <FlowStep num="2" title="Protocol & Credential Negotiation" desc="Agents propose the optimal transport protocol (AS2 preferred, SFTP fallback). Automated certificate exchange, key management, and firewall rule generation. No more emailing .cer files back and forth." time="< 4 hours" />
        <FlowStep num="3" title="Semantic Mapping Generation" desc="LLM-powered mapping engine analyzes sample documents from the partner, matches to canonical model, generates deterministic transformation rules. Cross-references against 10,000+ existing mappings in the network for 97%+ accuracy." time="< 1 hour (AI) + 2hr human review" />
        <FlowStep num="4" title="Synthetic Test Execution" desc="Auto-generates realistic test transactions based on partner's industry vertical. Runs full round-trip testing — 850 → 855 → 856 → 810 cycle. Validates compliance rules, catches edge cases, generates test report." time="< 4 hours" />
        <FlowStep num="5" title="Compliance Validation" desc="Runs partner-specific compliance checks: FSMA 204 traceability for food, HIPAA for healthcare, customs declarations for cross-border. Generates audit-ready compliance certificates." time="< 2 hours" />
        <FlowStep num="6" title="Go-Live & Monitoring Activation" desc="Production cutover with zero-downtime. Shadow mode runs parallel for 24 hours. Monitoring agents activate with partner-specific anomaly baselines. Auto-rollback on failure detection." time="< 12 hours" />
      </SectionBlock>

      <SectionBlock title="AIT Scenario: 50 Partners in 30 Days" accent="#f59e0b">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          With Sterling: 50 partners × 8 weeks avg = <strong style={{ color: "#f87171" }}>400 staff-weeks</strong>. Sequentially, that's 7.5 years. Even with 5 parallel tracks, 1.5 years.
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          With IntegrateOS: 50 partners × 48 hours avg = <strong style={{ color: "#10b981" }}>2,400 hours</strong>. With 10 parallel agentic tracks (no human bottleneck), <strong style={{ color: "#10b981" }}>30 calendar days</strong>. One integration engineer supervises, not 15.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MetricCard value="400wk" label="Sterling Effort" sub="50 partners" />
          <MetricCard value="30 days" label="IntegrateOS" sub="same 50 partners" />
          <MetricCard value="15 → 1" label="Staff Required" sub="engineer headcount" />
          <MetricCard value="93%" label="Cost Reduction" sub="fully loaded" />
        </div>
      </SectionBlock>

      <SectionBlock title="Self-Learning Flywheel" accent="#a78bfa">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          <strong>Partner 1:</strong> Full AI mapping generation + human review (3 hrs). <strong>Partner 10:</strong> AI generates with 95% accuracy, human spot-checks (30 min). <strong>Partner 50:</strong> Fully autonomous for standard patterns, human only for exceptions (10 min). <strong>Partner 500:</strong> The system has seen every major retailer/carrier EDI variant — onboarding is essentially instant for known patterns.
        </div>
      </SectionBlock>
    </div>
  );
}

function FeaturesTab() {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>Platform Feature Set</div>

      <div style={{ display: "grid", gap: 12 }}>
        <SectionBlock title="Partner Command Center" accent="#38bdf8">
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
            Real-time visibility across all partner connections. Health scores, SLA tracking, volume trends, error rates, compliance status — all in one pane. Think Datadog but purpose-built for B2B integration. Alerting engine with escalation paths. Weekly automated partner health reports.
          </div>
        </SectionBlock>

        <SectionBlock title="Visual Mapping Studio" accent="#10b981">
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
            AI-suggested mappings presented in a drag-and-drop visual interface. Color-coded confidence scores. Click to accept/reject/modify. Version history with diff view. Export as declarative spec (JSON/YAML). Supports complex transformations: conditional logic, lookups, aggregations, splitting/merging, cross-referencing.
          </div>
        </SectionBlock>

        <SectionBlock title="Compliance Automation Suite" accent="#f59e0b">
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
            Pre-built compliance modules: FSMA 204 (food traceability with KDE/CTE tracking), GS1 (GTIN, SSCC, GLN validation), HIPAA (healthcare EDI), customs & trade compliance, SOX audit trails. Each module auto-validates transactions and generates compliance certificates. Regulation change monitoring — when FDA updates FSMA rules, the platform adapts.
          </div>
        </SectionBlock>

        <SectionBlock title="Marketplace & Ecosystem" accent="#ec4899">
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
            Community-contributed connectors, mapping templates, compliance packs, and vertical accelerators. Revenue share model for partners who contribute. Pre-built accelerators for: Retail (850/856/810 cycles), Logistics (204/214/210/990 carrier integration), Healthcare (837/835/270/271), Financial Services (SWIFT, FIX).
          </div>
        </SectionBlock>

        <SectionBlock title="Competitive Displacement: IntegrateOS vs. Incumbents" accent="#f87171">
          <div style={{ display: "flex", padding: "8px 0", borderBottom: "1px solid #334155" }}>
            <div style={{ flex: 2, fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Capability</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>IntegrateOS</div>
            <div style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: 700, color: "#f87171" }}>Sterling/SPS</div>
          </div>
          <CompRow feature="AI-powered auto-mapping" us={true} them={false} />
          <CompRow feature="Autonomous partner onboarding" us={true} them={false} />
          <CompRow feature="Self-learning network effects" us={true} them={false} />
          <CompRow feature="API-first / GitOps native" us={true} them={false} />
          <CompRow feature="Real-time partner health monitoring" us={true} them={false} />
          <CompRow feature="< 48hr onboarding SLA" us={true} them={false} />
          <CompRow feature="Large enterprise EDI support" us={true} them={true} />
          <CompRow feature="Regulatory compliance modules" us={true} them={true} />
          <CompRow feature="Consultant-free implementation" us={true} them={false} />
          <CompRow feature="Protocol auto-detection" us={true} them={false} />
        </SectionBlock>
      </div>
    </div>
  );
}

function MonetizationTab() {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>Revenue Model & Unit Economics</div>

      <SectionBlock title="Pricing Architecture — 3 Revenue Streams" accent="#10b981">
        <div style={{ display: "grid", gap: 16 }}>
          {[
            {
              tier: "Platform Subscription",
              price: "$2K–$15K/mo",
              desc: "Tiered by connected partners. Starter (≤25 partners): $2K. Growth (≤100): $7K. Enterprise (unlimited): $15K. Includes core engine, monitoring, compliance basics.",
              color: "#22d3ee"
            },
            {
              tier: "Transaction Volume",
              price: "$0.01–$0.05/txn",
              desc: "Per-document fee declining with volume. First 50K docs/mo included in subscription. 50K–500K: $0.03. 500K–5M: $0.01. Captures value from high-volume traders without punishing growth.",
              color: "#a78bfa"
            },
            {
              tier: "Managed Onboarding & Compliance",
              price: "$500–$2K/partner",
              desc: "White-glove onboarding with human-in-the-loop for complex partners. FSMA 204, HIPAA, and customs compliance packs: $5K–$20K/yr each. This is where the margin is — 85%+ gross margin on compliance.",
              color: "#f59e0b"
            },
          ].map((t, i) => (
            <div key={i} style={{ background: "#0a0f1a", border: `1px solid ${t.color}33`, borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: t.color }}>{t.tier}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", fontFamily: "'JetBrains Mono', monospace" }}>{t.price}</div>
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="AIT Deal Model (Illustrative)" accent="#38bdf8">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>
          <strong>Year 1:</strong> Enterprise platform ($15K/mo = $180K) + 50 partner onboarding ($1K × 50 = $50K) + FSMA compliance ($15K) + transaction fees (~$60K) = <strong style={{ color: "#38bdf8" }}>$305K ARR</strong>
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>
          <strong>Year 2:</strong> Platform ($180K) + 100 new partners ($100K) + expanded compliance ($40K) + growing transaction volume ($120K) = <strong style={{ color: "#38bdf8" }}>$440K ARR</strong>
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.8, marginTop: 8 }}>
          <strong>Contrast with Sterling:</strong> AIT's current Sterling spend is estimated at $800K–$1.2M/yr (licenses + consulting + managed services). IntegrateOS delivers more at 40% of the cost.
        </div>
      </SectionBlock>

      <SectionBlock title="Path to $50M ARR" accent="#a78bfa">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <MetricCard value="Yr 1" label="$3M ARR" sub="10 enterprise logos" />
          <MetricCard value="Yr 2" label="$12M ARR" sub="40 logos + expansion" />
          <MetricCard value="Yr 3" label="$50M ARR" sub="150 logos + marketplace" />
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
          Key assumption: Net Revenue Retention > 140% — every customer adds more partners and compliance modules over time. The network effect means CAC drops as the partner graph densifies.
        </div>
      </SectionBlock>
    </div>
  );
}

function GTMTab() {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 16 }}>Go-to-Market & Roadmap</div>

      <SectionBlock title="Phase 1: Foundation (Months 1–6)" accent="#38bdf8">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Build:</strong> Core connectivity fabric (AS2, SFTP, REST), semantic mapping engine (X12 focus), partner self-service portal, basic monitoring dashboard.
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Launch with 3 Design Partners:</strong> AIT Worldwide (logistics/3PL), one CPG brand (Mondelez or similar), one mid-market retailer. These provide the three key verticals and transaction patterns to train the learning engine.
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          <strong>Team:</strong> 4 engineers (2 backend, 1 AI/ML, 1 frontend), 1 product manager, 1 solutions architect. Lean.
        </div>
      </SectionBlock>

      <SectionBlock title="Phase 2: Agentic Intelligence (Months 7–12)" accent="#a78bfa">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Build:</strong> Full agentic onboarding engine, compliance modules (FSMA 204, GS1), visual mapping studio, advanced monitoring with anomaly detection.
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Prove:</strong> Demonstrate 48-hour onboarding SLA with design partners. Publish case study showing 10x improvement over Sterling. Target 10 paying customers by month 12.
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          <strong>GTM Motion:</strong> Sterling displacement campaigns targeting logistics companies burned by CargoWise pricing + retail brands frustrated with SPS Commerce limitations. Use intent data (Bombora/6sense) to identify companies actively evaluating alternatives.
        </div>
      </SectionBlock>

      <SectionBlock title="Phase 3: Network & Scale (Months 13–24)" accent="#10b981">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Build:</strong> Marketplace for connectors and compliance packs, multi-tenant network effects, healthcare and financial services verticals, Terraform provider, advanced API platform.
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
          <strong>Scale:</strong> Target 50+ enterprise logos. Partner program for SIs and consultants. Developer ecosystem for custom connectors. International expansion (EDIFACT, PEPPOL for Europe).
        </div>
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          <strong>Moat:</strong> By this point, the mapping network has seen thousands of partner combinations. New onboardings are near-instant for known patterns. This creates a defensible data moat that no incumbent can replicate without starting from scratch.
        </div>
      </SectionBlock>

      <SectionBlock title="Target Customer Profile" accent="#f59e0b">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            ["Primary ICP", "Enterprises with 50+ trading partners on legacy platforms (Sterling, SPS, OpenText) spending >$500K/yr on B2B integration. Industries: logistics/3PL, retail/CPG, manufacturing."],
            ["Expansion ICP", "Mid-market companies ($500M–$5B rev) scaling partner networks rapidly — marketplace sellers, omnichannel retailers, and 3PLs adding new carrier/shipper relationships."],
            ["Wedge Accounts", "Companies with an imminent onboarding wave (M&A, new marketplace launch, regulatory deadline like FSMA 204). Urgency + pain = fastest close."],
            ["Strategic Accounts", "Companies where the PE sponsor (like Jordan Company for AIT) has a portfolio of logistics companies — land in one, expand across the portfolio."],
          ].map(([t, d], i) => (
            <div key={i} style={{ background: "#1a1408", border: "1px solid #f59e0b22", borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Defensibility & Moat Analysis" accent="#ec4899">
        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
          <strong>Network data moat:</strong> Every partner onboarded enriches the mapping corpus. At 1,000+ partners, accuracy exceeds 99% for standard patterns — no cold-start competitor can match this. <strong>Switching costs:</strong> Once a company's partner graph is managed on IntegrateOS, migration is painful and risky. <strong>Ecosystem lock-in:</strong> Marketplace connectors and compliance modules create a platform ecosystem (like Salesforce AppExchange) that compounds stickiness. <strong>Speed moat:</strong> Incumbent platforms are architecturally incapable of agentic onboarding — adding AI to Sterling is like adding a jet engine to a horse carriage.
        </div>
      </SectionBlock>
    </div>
  );
}

// ── MAIN APP ──

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  const renderTab = () => {
    switch (activeTab) {
      case 0: return <VisionTab />;
      case 1: return <ArchitectureTab />;
      case 2: return <OnboardingTab />;
      case 3: return <FeaturesTab />;
      case 4: return <MonetizationTab />;
      case 5: return <GTMTab />;
      default: return <VisionTab />;
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      color: "#f1f5f9",
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0a0f1a 0%, #0f172a 50%, #0a0f1a 100%)",
        borderBottom: "1px solid #1e3a5f",
        padding: "28px 24px 20px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "linear-gradient(135deg, #38bdf8, #6366f1)",
              boxShadow: "0 0 12px #38bdf855",
            }} />
            <span style={{
              fontSize: 22, fontWeight: 800, letterSpacing: -0.5,
              background: "linear-gradient(135deg, #38bdf8, #a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontFamily: "'JetBrains Mono', monospace",
            }}>IntegrateOS</span>
          </div>
          <div style={{ fontSize: 13, color: "#64748b", letterSpacing: 0.5 }}>
            The Self-Learning B2B Integration Platform — Product Blueprint
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: "#0a0f1a",
        borderBottom: "1px solid #1e293b",
        position: "sticky", top: 0, zIndex: 10,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{ display: "flex", maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "12px 16px",
                fontSize: 12,
                fontWeight: activeTab === i ? 700 : 500,
                color: activeTab === i ? "#38bdf8" : "#64748b",
                background: "none",
                border: "none",
                borderBottom: activeTab === i ? "2px solid #38bdf8" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: 0.3,
              }}
            >{tab}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 48px" }}>
        {renderTab()}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid #1e293b",
        padding: "16px 24px",
        textAlign: "center",
        fontSize: 11,
        color: "#334155",
      }}>
        IntegrateOS Product Blueprint — Confidential — {new Date().getFullYear()}
      </div>
    </div>
  );
}
