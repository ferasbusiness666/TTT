/* =====================================================================
   TADELE TEEN TALKS — IMAGE UPLOADS  (ttt-upload.js)
   =====================================================================
   Uploads photos straight from the browser to Cloudinary using an
   UNSIGNED upload preset. Unsigned is the right call here: signing needs
   a server holding an API secret, and this site is static — there is
   nowhere safe to keep one. The cloud name and preset name below are
   public by design (they ship in the page); the API secret must NEVER
   appear in this repo.

   The preset (`ttt-posts`) restricts uploads to image formats and drops
   everything in the ttt-posts folder with an unguessable public ID.
   Cloudinary checks real file contents, not the extension, so renaming
   a .txt to .png does not get through — verified.

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

  /* Upload one image. Resolves with { url, publicId, width, height }.
   * onProgress (optional) receives 0-100. Uses XHR rather than fetch so
   * we get real progress events on slow phone connections. */
  function upload(file, onProgress) {
    return new Promise(function (resolve, reject) {
      var problem = validate(file);
      if (problem) { reject(new Error(problem)); return; }

      var form = new FormData();
      form.append("file", file);
      form.append("upload_preset", UPLOAD_PRESET);

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

  window.tttUpload = {
    upload: upload,
    validate: validate,
    MAX_BYTES: MAX_BYTES,
    CLOUD_NAME: CLOUD_NAME
  };
})();
