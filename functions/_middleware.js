/* =====================================================================
   PER-POST SHARE METADATA  (functions/_middleware.js)
   =====================================================================
   article.html sets its title, description and og:* tags from the post
   once JavaScript runs. Google renders JavaScript, so search results are
   fine. Social crawlers do not — Discord, WhatsApp, iMessage, Slack,
   Facebook and X all read the raw HTML — so a shared link previewed with
   the site-level title, the generic description and the default cover,
   no matter which story it pointed at.

   This rewrites those tags at the edge, before the HTML leaves Cloudflare,
   so a shared link shows the actual story.

   SAFETY, because this sits in front of every request on the site:
     - anything that is not an article URL with a ?post= returns
       immediately, untouched. The homepage, the archive and the staff
       screens never reach the rest of this file.
     - every step after that is wrapped so any failure — Supabase down, a
       slow response, malformed data — falls back to the original page.
       The worst case is the behaviour we had before this file existed.
   ===================================================================== */

const ARTICLE_PATHS = ["/article", "/article.html"];
const LOOKUP_TIMEOUT_MS = 1500;   // a share preview is not worth a slow page

export async function onRequest(context) {
  const { request, next, env } = context;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return next();
  }

  // Fast path out for everything that isn't a single article view.
  if (ARTICLE_PATHS.indexOf(url.pathname) === -1) return next();
  const slug = url.searchParams.get("post");
  if (!slug) return next();

  const response = await next();

  try {
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;
    if (!env || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return response;

    const post = await fetchPost(env, slug);
    if (!post) return response;

    const canonical = url.origin + "/article.html?post=" + encodeURIComponent(slug);
    const image = post.cover_image_url || url.origin + "/images/og-cover.png";
    const description = post.excerpt || "A story from Tadele Teen Talks.";
    const title = post.title + " — Tadele Teen Talks";

    // setAttribute escapes for us, so a title containing quotes or angle
    // brackets can't break out of the attribute.
    let rewriter = new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title); } })
      .on('meta[name="description"]',        { element(el) { el.setAttribute("content", description); } })
      .on('meta[property="og:title"]',       { element(el) { el.setAttribute("content", post.title); } })
      .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", description); } })
      .on('meta[property="og:image"]',       { element(el) { el.setAttribute("content", image); } })
      .on('meta[property="og:type"]',        { element(el) { el.setAttribute("content", "article"); } })
      .on('meta[name="twitter:card"]',       { element(el) { el.setAttribute("content", "summary_large_image"); } })
      // og:url and canonical don't exist in the static HTML, so add them.
      .on("head", {
        element(el) {
          el.append(
            '<meta property="og:url" content="' + escapeAttr(canonical) + '" />' +
            '<link rel="canonical" href="' + escapeAttr(canonical) + '" />',
            { html: true }
          );
        }
      });

    return rewriter.transform(response);
  } catch (e) {
    // Never let a preview problem cost someone the article.
    return response;
  }
}

/* Only published posts, and only the few columns a preview needs. Uses the
 * public key and the same RLS the browser is subject to — this runs at the
 * edge, but it is not privileged. */
async function fetchPost(env, slug) {
  const endpoint =
    env.SUPABASE_URL.replace(/\/+$/, "") +
    "/rest/v1/posts?select=title,excerpt,cover_image_url&status=eq.published&limit=1&slug=eq." +
    encodeURIComponent(slug);

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
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length && rows[0].title ? rows[0] : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
