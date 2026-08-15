/* =====================================================================
   POST /api/delete-image        (Cloudflare Pages Function)
   =====================================================================
   Deletes an image from Cloudinary when a post is deleted or its cover is
   replaced. This has to run on the server: deleting a Cloudinary asset is
   signed with the API SECRET, and a static page has nowhere safe to keep
   one — shipping it in the browser would let anyone wipe the media
   library. Pages Functions run on Cloudflare's edge for free and read the
   secret from an environment variable, so it never touches the repo.

   Required environment variables (Cloudflare Pages → Settings →
   Environment variables). Add them to BOTH Production and Preview:
     CLOUDINARY_CLOUD_NAME   e.g. dxow1ant2      (public, but kept here too)
     CLOUDINARY_API_KEY      from Cloudinary → API Keys
     CLOUDINARY_API_SECRET   from Cloudinary → API Keys   ← SECRET
     SUPABASE_URL            https://<ref>.supabase.co
     SUPABASE_ANON_KEY       the publishable/anon key (public)

   Auth: the caller must send a signed-in staff member's Supabase access
   token as `Authorization: Bearer <token>`. We hand that straight to
   Supabase to verify — if Supabase doesn't recognise it, we refuse. That
   keeps the endpoint useless to anonymous visitors even though the URL
   is public.
   ===================================================================== */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

/* Cloudinary signs with SHA-1 over the alphabetically-sorted params. */
async function sha1Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Pull the public_id out of a delivery URL.
 * https://res.cloudinary.com/<cloud>/image/upload/v1699/abc123.webp -> abc123
 * Any transformation segments and the version prefix are stripped. Uploads
 * use "asset folders", so the id has no folder path in it. */
export function publicIdFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const marker = "/image/upload/";
  const at = url.indexOf(marker);
  if (at === -1) return null;
  let rest = url.slice(at + marker.length);
  const versioned = rest.match(/(?:^|\/)v\d+\/(.+)$/);
  rest = versioned ? versioned[1] : rest.split("/").pop();
  rest = rest.split("?")[0].split("#")[0];
  return rest.replace(/\.[A-Za-z0-9]+$/, "") || null;
}

async function callerIsStaff(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return !!(user && user.id);
  } catch (_) {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET",
                   "SUPABASE_URL", "SUPABASE_ANON_KEY"].filter((k) => !env[k]);
  if (missing.length) {
    return json({ error: "Server not configured: missing " + missing.join(", ") }, 500);
  }

  if (!(await callerIsStaff(request, env))) {
    return json({ error: "Not signed in." }, 401);
  }

  let body;
  try { body = await request.json(); } catch (_) { return json({ error: "Bad request body." }, 400); }

  // Accept either full delivery URLs or bare public ids; ignore anything
  // that isn't ours so a bad value can't reach Cloudinary.
  const urls = Array.isArray(body.urls) ? body.urls : (body.url ? [body.url] : []);
  const ids = urls.map(publicIdFromUrl).filter(Boolean);
  if (!ids.length) return json({ deleted: [], skipped: urls.length, note: "No Cloudinary images to delete." });

  const results = [];
  for (const publicId of ids) {
    const timestamp = Math.floor(Date.now() / 1000);
    // params in alphabetical order, secret appended, then SHA-1
    const toSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
    const signature = await sha1Hex(toSign);

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("timestamp", String(timestamp));
    form.append("invalidate", "true");
    form.append("api_key", env.CLOUDINARY_API_KEY);
    form.append("signature", signature);

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`,
        { method: "POST", body: form }
      );
      const out = await res.json();
      // Cloudinary answers {"result":"ok"} or {"result":"not found"}
      results.push({ publicId, result: out.result || out.error?.message || "unknown" });
    } catch (err) {
      results.push({ publicId, result: "request failed" });
    }
  }

  return json({ deleted: results });
}

/* Anything other than POST gets a clear answer rather than a stack trace. */
export async function onRequest({ request }) {
  if (request.method === "POST") return;   // handled above
  return json({ error: "Use POST." }, 405);
}
