/* =====================================================================
   POST /api/sign-upload        (Cloudflare Pages Function)
   =====================================================================
   Hands a signed-in staff member a short-lived Cloudinary upload
   signature, so uploads no longer have to go through an UNSIGNED preset
   that anyone on the internet could use (finding #5 in
   docs/09-security-stress-test.md — an anonymous client could upload
   unlimited images and run up the owner's storage bill).

   Uses the same environment variables as delete-image:
     CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
     SUPABASE_URL, SUPABASE_ANON_KEY

   Returns only the signature and the values it covers — never the secret.
   A signature is valid for about an hour on Cloudinary's side, and only
   for exactly these parameters, so it can't be reused to upload somewhere
   else in the account.

   ROLLOUT NOTE: the client still falls back to the unsigned preset if this
   endpoint is unavailable, so uploads can't break while this is being
   verified. Once signed uploads are confirmed working, the `ttt-posts`
   preset should be switched to Signed (or deleted) in the Cloudinary
   dashboard — that is the step that actually closes anonymous uploads.
   ===================================================================== */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function sha1Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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

  // The parameters the upload is allowed to use. The browser cannot change
  // any of these without invalidating the signature, so a staff token
  // can't be borrowed to write outside ttt-posts or to smuggle in a
  // different file type.
  const params = {
    allowed_formats: "jpg,png,webp,gif",
    asset_folder: "ttt-posts",
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Cloudinary signs the parameters sorted alphabetically by key, joined
  // as k=v pairs with &, with the API secret appended.
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const signature = await sha1Hex(toSign + env.CLOUDINARY_API_SECRET);

  return json({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    signature,
    params,
  });
}

export async function onRequest({ request }) {
  if (request.method === "POST") return;
  return json({ error: "Use POST." }, 405);
}
