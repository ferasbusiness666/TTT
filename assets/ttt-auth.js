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

  /* "Remember me" — supabase-js keeps the session in localStorage, which
   * survives closing the browser. When the box is left unchecked the
   * session should die with the tab instead, so the client writes through
   * this shim: it picks sessionStorage or localStorage based on a flag the
   * login page sets just before signing in.
   *
   * Reads check both stores, so a page loaded later in the same tab finds
   * a session-only login. A NEW tab has neither the flag nor the
   * sessionStorage entry, so there is nothing to find — which is exactly
   * what "don't remember me" should mean. Removal clears both, so signing
   * out can never leave a stale token behind in the other store. */
  var SESSION_ONLY = "ttt.session-only";

  function writeStore() {
    try {
      return window.sessionStorage.getItem(SESSION_ONLY) === "1"
        ? window.sessionStorage
        : window.localStorage;
    } catch (e) { return window.localStorage; }
  }

  var storage = {
    getItem: function (k) {
      try { return window.sessionStorage.getItem(k) || window.localStorage.getItem(k); }
      catch (e) { return null; }
    },
    setItem: function (k, v) {
      try { writeStore().setItem(k, v); } catch (e) {}
    },
    removeItem: function (k) {
      try { window.sessionStorage.removeItem(k); } catch (e) {}
      try { window.localStorage.removeItem(k); } catch (e) {}
    }
  };

  /* Called by the login page before signIn. Must be set first: it decides
   * where the very first session write lands. */
  function setRemember(remember) {
    try {
      if (remember) window.sessionStorage.removeItem(SESSION_ONLY);
      else window.sessionStorage.setItem(SESSION_ONLY, "1");
    } catch (e) {}
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage: storage, persistSession: true, autoRefreshToken: true }
  });

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
      // A session alone isn't authorisation (finding #14): check the account
      // is actually staff. Today every account is, but the editor can create,
      // publish and delete posts and trigger Cloudinary deletions, so it
      // shouldn't open for any future non-staff login.
      //
      // Note this is convenience, not the security boundary — the real
      // enforcement is RLS on the database, which a hidden page can't bypass.
      return client.from("profiles").select("role").eq("id", session.user.id).maybeSingle()
        .then(function (r) {
          var role = r && r.data && r.data.role;
          // No profile row yet (trigger lag) is treated as staff rather than
          // locking a legitimate new account out of the desk.
          if (role && role !== "staff" && role !== "editor" && role !== "admin") {
            alert("This account doesn't have access to the editorial desk.");
            return signOut().then(function () {
              window.location.replace("login.html");
              return false;
            });
          }
          document.documentElement.style.visibility = "";
          return true;
        })
        .catch(function () {
          // Couldn't read the role (offline, RLS hiccup) — the session is
          // still valid and RLS guards the data, so let them through.
          document.documentElement.style.visibility = "";
          return true;
        });
    }).catch(function () {
      window.location.replace("login.html");
      return false;
    });
  }

  /* The signed-in user's profile row (full_name, role), joined with a couple
   * of fields from the auth session. Falls back to the email as a display
   * name when no full_name was set in the account's Auth metadata. Returns
   * null if nobody is signed in. */
  function currentProfile() {
    return getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) return null;
      var user = session.user;
      return client.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()
        .then(function (r) {
          var row = r && r.data;
          return {
            id: user.id,
            email: user.email,
            full_name: (row && row.full_name) || user.email || "Staff",
            role: (row && row.role) || "staff"
          };
        })
        .catch(function () {
          return { id: user.id, email: user.email, full_name: user.email || "Staff", role: "staff" };
        });
    });
  }

  window.tttAuth = {
    client: client,
    signIn: signIn,
    signOut: signOut,
    getSession: getSession,
    guard: guard,
    currentProfile: currentProfile,
    setRemember: setRemember
  };
})();
