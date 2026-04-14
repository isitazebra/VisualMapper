/**
 * Full-page "you need to set up your database" state. Rendered whenever
 * a page tries to query Prisma and fails — usually on a fresh Vercel
 * deploy before the Neon integration is installed.
 */
export function DbSetupBanner({ error }: { error: string }) {
  return (
    <main className="min-h-screen bg-paper-bg text-ink px-8 py-16 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 bg-brand-blue rotate-45" />
          <span className="text-2xl font-extrabold">IntegrateOS</span>
        </div>
        <h1 className="text-3xl font-bold mb-3">Connect your database</h1>
        <p className="text-ink-soft mb-6">
          This deploy can&apos;t reach Postgres yet. Install the Neon integration from
          Vercel to provision a database and populate the <code>DATABASE_URL</code> and{" "}
          <code>DATABASE_URL_UNPOOLED</code> environment variables automatically.
        </p>

        <ol className="list-decimal pl-5 text-ink space-y-2 mb-6">
          <li>Open your Vercel project → <b>Storage</b> → <b>Create Database</b>.</li>
          <li>Choose <b>Neon</b> and accept the defaults.</li>
          <li>Redeploy. The build will run <code>prisma migrate deploy</code> and provision the schema.</li>
          <li>
            Optionally run <code>npm run db:seed</code> locally to add example partners.
          </li>
        </ol>

        <details className="text-xs text-ink-mute">
          <summary className="cursor-pointer">Error detail</summary>
          <pre className="mt-2 p-2 bg-paper rounded border border-border whitespace-pre-wrap">
            {error}
          </pre>
        </details>

        <p className="mt-8 text-sm text-ink-soft">
          In the meantime you can try the mapper without persistence at{" "}
          <a href="/mapper" className="text-brand-blue underline">
            /mapper
          </a>
          .
        </p>
      </div>
    </main>
  );
}
