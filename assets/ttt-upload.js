/* =====================================================================
   TADELE TEEN TALKS — IMAGE UPLOADS  (ttt-upload.js)
   =====================================================================
   Uploads photos from the browser to Cloudinary.

   Uploads are SIGNED where possible: /api/sign-upload (a Pages Function
   holding the API secret) issues a short-lived signature to a signed-in
   staff member, and Cloudinary then only accepts an upload matching
   exactly the parameters that were signed. The site started out using an
   unsigned preset, which the stress test rightly flagged — anyone reading
   the page source could upload to the account (finding #5).

   The unsigned preset remains as a FALLBACK so a signing outage can never
   stop a writer mid-post. That also means the hole isn't closed until the
   `ttt-posts` preset is switched to Signed (or deleted) in the Cloudinary
   dashboard — see docs/07-next-steps.md.

   Either way Cloudinary checks real file contents, not the extension, so
   renaming a .txt to .png does not get through — verified. The cloud name
   and preset name are public by design; the API secret must NEVER appear
   in this repo.

   The preset has no max file size, so the cap is enforced here before
   anything leaves the device. That also means a 40MB phone photo fails
   fast with a clear message instead of after a long upload.
   ===================================================================== */
(function () {
  "use strict";

  var CLOUD_NAME    = "dxow1ant2";
  var UPLOAD_PRESET = "ttt-posts";
  var ENDPOINT      = "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload";

  var MAX_BYTES  = 10 * 1024 * 1024;   // 10MB — the preset can't enforce this
  var OK_TYPES   = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  function prettySize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(1) + "MB";
  }

  /* Returns null when the file is fine, or a human-readable reason. */
  function validate(file) {
    if (!file) return "No file chosen.";
    if (OK_TYPES.indexOf(file.type) === -1) {
      return "That file type isn’t supported. Use a JPG, PNG, WebP or GIF.";
    }
    if (file.size > MAX_BYTES) {
      return "That image is " + prettySize(file.size) + " — the limit is " +
             prettySize(MAX_BYTES) + ". Try a smaller version.";
    }
    return null;
  }

  /* Ask the server to sign this upload (staff only). Resolves with null if
   * signing isn't available, in which case the caller falls back to the
   * unsigned preset — that keeps uploads working while signed uploads are
   * being verified, and means a signing outage never blocks a writer. */
  function getSignature() {
    if (!window.tttAuth || !window.tttAuth.getSession) return Promise.resolve(null);
    return window.tttAuth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) return null;
      return fetch("/api/sign-upload", {
        method: "POST",
        headers: { "Authorization": "Bearer " + session.access_token }
      }).then(function (r) { return r.ok ? r.json() : null; });
    }).catch(function () { return null; });
  }

  /* Upload one image. Resolves with { url, publicId, width, height }.
   * onProgress (optional) receives 0-100. Uses XHR rather than fetch so
   * we get real progress events on slow phone connections.
   *
   * Prefers a SIGNED upload (see /api/sign-upload): the unsigned preset is
   * usable by anyone who reads the page source, so signing it to a
   * signed-in staff member is the stronger path. Falls back to the preset
   * if signing is unavailable, so this can be rolled out without risking
   * the upload feature. */
  function upload(file, onProgress) {
    var problem = validate(file);
    if (problem) return Promise.reject(new Error(problem));

    return getSignature().then(function (signed) {
      return sendUpload(file, onProgress, signed);
    });
  }

  function sendUpload(file, onProgress, signed) {
    return new Promise(function (resolve, reject) {
      var form = new FormData();
      form.append("file", file);

      if (signed && signed.signature) {
        form.append("api_key", signed.apiKey);
        form.append("signature", signed.signature);
        Object.keys(signed.params).forEach(function (k) {
          form.append(k, signed.params[k]);   // must match what was signed, exactly
        });
      } else {
        form.append("upload_preset", UPLOAD_PRESET);
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT, true);
      xhr.timeout = 120000;   // a big photo on a slow connection still needs room

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = function () {
        var body;
        try { body = JSON.parse(xhr.responseText); }
        catch (e) { reject(new Error("Upload failed — unexpected response.")); return; }

        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
          resolve({
            url: body.secure_url, publicId: body.public_id,
            width: body.width, height: body.height, bytes: body.bytes
          });
        } else {
          // Cloudinary reports rejections (wrong format, preset problems)
          // in body.error.message — surface that rather than a generic fail.
          reject(new Error((body.error && body.error.message) || "Upload failed. Please try again."));
        }
      };
      xhr.onerror   = function () { reject(new Error("Upload failed — check your connection.")); };
      xhr.ontimeout = function () { reject(new Error("Upload timed out. Try a smaller image.")); };
      xhr.send(form);
    });
  }

  /* Every Cloudinary image referenced inside a post's body HTML. Used when
   * a post is deleted so its in-article photos go with it, not just the
   * cover. */
  function imageUrlsInHtml(html) {
    var out = [];
    if (!html) return out;
    var re = /<img[^>]+src=["']([^"']+)["']/gi, m;
    while ((m = re.exec(html)) !== null) {
      if (m[1].indexOf("res.cloudinary.com") > -1) out.push(m[1]);
    }
    return out;
  }

  /* Ask the server to delete images from Cloudinary.
   *
   * The browser can't do this itself — deletion is signed with the API
   * secret, which must never ship to the page — so it goes through the
   * /api/delete-image Pages Function, which holds the secret in an
   * environment variable and checks the caller is signed in.
   *
   * Deliberately best-effort: if cleanup fails the post is still gone, and
   * a leftover image is a tidiness problem, not a broken site. It resolves
   * rather than rejecting so callers never have to guard it. */
  function deleteImages(urls) {
    var list = (urls || []).filter(Boolean);
    if (!list.length) return Promise.resolve({ deleted: [] });
    if (!window.tttAuth || !window.tttAuth.getSession) return Promise.resolve(null);

    return window.tttAuth.getSession().then(function (res) {
      var session = res && res.data && res.data.session;
      if (!session) return null;
      return fetch("/api/delete-image", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Authorization": "Bearer " + session.access_token
        },
        body: JSON.stringify({ urls: list })
      }).then(function (r) {
        return r.json().then(function (out) {
          // a non-2xx still carries a readable reason — pass it through
          // rather than letting it look like success
          if (!r.ok && out && !out.error) out.error = "HTTP " + r.status;
          return out;
        });
      });
    }).catch(function (err) {
      console.warn("[ttt-upload] image cleanup failed:", err);
      return null;
    });
  }

  window.tttUpload = {
    upload: upload,
    validate: validate,
    deleteImages: deleteImages,
    imageUrlsInHtml: imageUrlsInHtml,
    MAX_BYTES: MAX_BYTES,
    CLOUD_NAME: CLOUD_NAME
  };
})();
