/* =====================================================================
   SITEMAP  (functions/sitemap.xml.js → /sitemap.xml)
   =====================================================================
   The list of pages Google is told about. It used to be a hand-written
   file naming only the fixed pages, so every published story was missing
   from it (and four of its links were .html addresses that redirect).
   Now it is built from the database on request: the fixed public pages,
   then every PUBLISHED post at the same /article?post= address the
   share-preview middleware names as canonical. A new post appears here
   within the hour without anyone touching this file.

   Same rules as functions/_middleware.js:
     - the public key and the same RLS the browser has -- nothing
       privileged, and drafts are excluded twice over (status filter + RLS);
     - a short timeout, and any failure falls back to the fixed pages
       alone, still a valid sitemap. That fallback is only cached for a few
       minutes so a database hiccup isn't remembered for an hour.

   Staff screens are deliberately absent. SITE must match the host in
   robots.txt -- change both if the site ever gets its own domain.
   ===================================================================== */

const SITE = "https://tadeleteentalk.pages.dev";
const LOOKUP_TIMEOUT_MS = 3000;
const MAX_POSTS = 5000;        // a single sitemap file may list up to 50,000

const FIXED_PAGES = [
  { path: "/",                       changefreq: "daily",  priority: "1.0" },
  { path: "/category?cat=articles",  changefreq: "daily",  priority: "0.8" },
  { path: "/category?cat=videos",    changefreq: "daily",  priority: "0.8" },
  { path: "/category?cat=artwork",   changefreq: "daily",  priority: "0.8" },
  { path: "/category?cat=magazines", changefreq: "weekly", priority: "0.6" },
  { path: "/terms",                  changefreq: "yearly", priority: "0.3" },
  { path: "/privacy",                changefreq: "yearly", priority: "0.3" }
];

export async function onRequest(context) {
  const method = context.request.method;
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const posts = await fetchPublishedPosts(context.env);

  const entries = FIXED_PAGES.map(function (p) {
    return entry(SITE + p.path, null, p.changefreq, p.priority);
  }).concat(posts.rows.map(function (p) {
    return entry(SITE + "/article?post=" + encodeURIComponent(p.slug),
                 p.updated_at || p.published_at, "monthly", "0.7");
  }));

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join("\n") + "\n" +
    "</urlset>\n";

  return new Response(method === "HEAD" ? null : xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": posts.ok ? "public, max-age=3600" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

/* Published posts only, newest first, just the columns a sitemap needs.
 * Resolves { ok, rows } and never throws. */
async function fetchPublishedPosts(env) {
  if (!env || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return { ok: false, rows: [] };

  const endpoint =
    env.SUPABASE_URL.replace(/\/+$/, "") +
    "/rest/v1/posts?select=slug,updated_at,published_at&status=eq.published" +
    "&order=published_at.desc.nullslast&limit=" + MAX_POSTS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: "Bearer " + env.SUPABASE_ANON_KEY,
        Accept: "application/json"
      },
      signal: controller.signal
    });
    if (!res.ok) return { ok: false, rows: [] };
    const rows = await res.json();
    if (!Array.isArray(rows)) return { ok: false, rows: [] };
    return {
      ok: true,
      rows: rows.filter(function (r) { return r && typeof r.slug === "string" && r.slug !== ""; })
    };
  } catch (e) {
    return { ok: false, rows: [] };
  } finally {
    clearTimeout(timer);
  }
}

function entry(loc, lastmod, changefreq, priority) {
  const when = isoDate(lastmod);
  return "  <url>" +
    "<loc>" + escapeXml(loc) + "</loc>" +
    (when ? "<lastmod>" + when + "</lastmod>" : "") +
    "<changefreq>" + changefreq + "</changefreq>" +
    "<priority>" + priority + "</priority>" +
    "</url>";
}

// W3C datetime, or nothing if the value isn't a real date.
function isoDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
