/* =====================================================================
   TADELE TEEN TALKS — AUTH  (ttt-auth.js)
   =====================================================================
   A thin wrapper over Supabase Auth (email / password). Staff accounts
   are created by an admin in the Supabase dashboard — there is NO public
   sign-up. Loaded AFTER the supabase-js UMD bundle on:

     • login.html            — signs a staff member in
     • admin.html / editor   — guard: bounce to login if not signed in

   The key below is Supabase's PUBLISHABLE key. It is public by design —
   every Supabase app ships it in the browser. Real protection comes from
   Row Level Security on the database, not from hiding this key. (The
   service_role key and any Cloudinary secret must NEVER live here.)
   ===================================================================== */
(function () {
  "use strict";

  var SUPABASE_URL = "https://ruzsbwgwbneqyvbdmwdb.supabase.co";
  var SUPABASE_KEY = "sb_publishable_Nxym422bogE3VI8L92BQSA_sfGrXOpz";

  // supabase-js UMD must have loaded first. If it didn't (offline / CDN
  // down), fail open on the UI only — the database is still protected by
  // RLS — and let callers detect the outage via `tttAuth.unavailable`.
  if (!window.supabase || !window.supabase.createClient) {
    console.error("[ttt-auth] supabase-js failed to load — auth unavailable.");
    document.documentElement.style.visibility = "";
    window.tttAuth = { unavailable: true };
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  function signIn(email, password) {
    return client.auth.signInWithPassword({ email: email, password: password });
  }

  function signOut() {
    return client.auth.signOut();
  }

  function getSession() {
    return client.auth.getSession();
  }

  /* Page guard for staff-only screens (admin, editor).
   * Those pages hide themselves first (an inline <head> script sets
   * visibility:hidden) so protected content never flashes before the
   * check finishes. Here we either reveal the page (signed in) or send
   * the visitor to the login screen. */
  function guard() {
    return getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) {
        window.location.replace("login.html");
        return false;
      }
      document.documentElement.style.visibility = "";
      return true;
    }).catch(function () {
      window.location.replace("login.html");
      return false;
    });
  }

  window.tttAuth = {
    client: client,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    guard: guard
  };
})();
