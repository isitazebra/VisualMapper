# IntegrateOS

Self-learning B2B integration mapping platform. Replaces Excel-based EDI mapping workflows with an interactive, collaborative web application.

## Quick Start with Claude Code

### Prerequisites
- Node.js 18+ 
- PostgreSQL (or use Supabase/Neon for managed)
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)

### Getting Started

1. Clone this repo and cd into it
2. Run `claude` to start Claude Code
3. Tell it: "Read CLAUDE.md, then scaffold the Next.js project with all the schemas from the prototypes"

Claude Code will read the CLAUDE.md file automatically and understand the full project context.

### What's Here

```
CLAUDE.md              → Project brief (Claude Code reads this automatically)
prototypes/            → Working React artifacts from the design phase
  ├── integrateos-mapper-final.jsx         → Main mapping UI
  ├── integrateos-collaboration-workspace.jsx → Partner workspace
  ├── integrateos-856-blueyonder-mapper.jsx   → 856 ASN mapper with Excel export
  ├── integrateos-dma-mapper.jsx              → Customer override architecture
  └── b2b-integration-product-blueprint.jsx   → Product vision/blueprint
```

### First Claude Code Session

Open terminal in this directory and run:

```bash
claude
```

Then say:

> Read the CLAUDE.md file and the prototypes directory. Initialize a Next.js 14 project with TypeScript, Tailwind, and Prisma. Set up the database schema for mapping specs, field mappings, customer overrides, and partners. Then port the mapping UI from integrateos-mapper-final.jsx into a proper Next.js component structure.

Claude Code will scaffold the entire project.

## Architecture

- **Frontend**: Next.js 14 (App Router) + React + TypeScript + Tailwind
- **Backend**: Next.js API routes + Prisma ORM
- **Database**: PostgreSQL
- **Key Pattern**: Base mapping + customer override stack per field

## Domain

B2B EDI integration for logistics. Supports X12 transaction types (204, 214, 210, 990, 850, 856, 855, 810) across versions (3040-5010) mapped to multiple target formats (XML, JSON, OTM, CSV).
