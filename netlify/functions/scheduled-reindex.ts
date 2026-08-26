// Netlify Scheduled Function: keeps the app's on-chain indexer running in
// production. The app itself starts a `setInterval` poller in
// instrumentation.ts, but this app deploys as Netlify Functions
// (@netlify/plugin-nextjs) — a process model where each request is its own
// short-lived invocation, so that interval has no guarantee of ever firing
// again after the invocation that registered it ends. Netlify's own
// scheduler, by contrast, actually invokes this function on the cron below
// regardless of app traffic, which is what makes indexing reliable here.
//
// Requires the INDEX_ADMIN_SECRET environment variable to be set (in the
// Netlify site config) to the same value POST /api/index checks for. Without
// it, this function is a deliberate no-op — see src/app/api/index/route.ts.

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.INDEX_ADMIN_SECRET;
  if (!base || !secret) {
    console.warn("[scheduled-reindex] URL or INDEX_ADMIN_SECRET not set, skipping");
    return new Response("skipped: not configured", { status: 200 });
  }
  try {
    const res = await fetch(`${base}/api/index`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    return new Response(`reindex responded ${res.status}`, { status: 200 });
  } catch (err) {
    console.error("[scheduled-reindex] failed", err);
    return new Response("error", { status: 200 });
  }
};

export const config = {
  schedule: "*/5 * * * *",
};
