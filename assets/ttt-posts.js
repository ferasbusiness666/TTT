/* =====================================================================
   TADELE TEEN TALKS — POST RENDERERS  (ttt-posts.js)
   =====================================================================
   Builds the site's post cards from real database rows. There are FOUR
   distinct card styles and they are NOT interchangeable — each one is
   reproduced here exactly as it was authored in the original design:

     bentoCard()  trending grid  — solid pastel card, glyph + tag, title,
                                   byline. The "featured" slot also gets a
                                   polaroid cover and a subtitle.
     vcard()      video rail     — 16:9 thumb with play triangle, tag
                                   below the image, title, byline.
     acard()      latest list    — photo, pill, title, description,
                                   author + date. The lead uses .lead.
     gitem()      gallery        — full-bleed image, caption printed over
                                   it. Real images keep their natural
                                   aspect ratio (.gitem .media is auto).

   FALLBACK RULE — deliberate, agreed with Fero:
   a section is only re-rendered once there are enough published posts to
   FILL it (see fillSection). Until then the hand-authored demo cards in
   the HTML are left untouched, so the live site never looks half-empty
   while TTT is still writing its first stories. As real posts land, each
   section flips over on its own.
   ===================================================================== */
(function () {
  "use strict";

  var GLYPH      = { article: "✦", video: "▶", artwork: "◆", magazine: "★" };
  var TYPE_LABEL = { article: "ARTICLE", video: "VIDEO", artwork: "ARTWORK", magazine: "MAGAZINE" };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function link(p) { return "article.html?post=" + encodeURIComponent(p.slug || ""); }
  function author(p) { return (p.author && p.author.full_name) || "TTT Staff"; }
  function label(p) {
    return String((p.category && p.category.name) || TYPE_LABEL[p.post_type] || "STORY").toUpperCase();
  }
  function glyph(p) { return GLYPH[p.post_type] || GLYPH.article; }
  function date(p) {
    var d = new Date(p.published_at || p.created_at);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function monthYear(p) {
    var d = new Date(p.published_at || p.created_at);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  /* A real cover when the post has one, otherwise the same placeholder box
   * the mockup uses — so a post without a photo still fills its slot.
   *
   * Real photos are NOT forced into the slot's shape. Posts carry portrait,
   * square, landscape and 4:5 images, and cropping them all to one ratio
   * (object-fit: cover) slices the picture. `.is-natural` drops the fixed
   * aspect-ratio so the image keeps its own proportions and the card grows
   * to match. Placeholders keep a ratio — they have no intrinsic size. */
  function media(p, ratioCls, phLabel, extra) {
    if (p.cover_image_url) {
      return '<div class="media is-natural"><img src="' + esc(p.cover_image_url) + '" alt="' + esc(p.title) + '">' + (extra || "") + "</div>";
    }
    return '<div class="media ' + (ratioCls || "") + ' ph"><code>' + esc(phLabel) + "</code>" + (extra || "") + "</div>";
  }

  /* ---- 1. trending grid (bento) ----------------------------------- *
   * slot = { cls, featured } — the slot's classes drive the grid layout,
   * so they stay fixed; only the content comes from the post.          */
  function bentoCard(p, slot) {
    var tag = slot.featured
      ? '<span class="star">★</span> FEATURED STORY · ' + esc(label(p))
      : esc(glyph(p) + " " + label(p));
    var html = '<a class="card ' + slot.cls + '" href="' + link(p) + '">' +
      '<span class="glyph">' + (slot.featured ? "★" : glyph(p)) + "</span>" +
      '<span class="tag">' + tag + "</span>";
    if (slot.featured) {
      html += '<div class="polaroid" aria-hidden="true">' +
                media(p, "r-4-3", "cover photo") +
                '<div class="cap">' + esc(label(p).toLowerCase()) + "</div>" +
              "</div>";
    }
    html += '<h2 class="title">' + esc(p.title) + "</h2>";
    if (slot.featured && p.excerpt) html += '<p class="sub">' + esc(p.excerpt) + "</p>";
    html += '<p class="byline">' + esc(author(p)) + (slot.featured ? " · " + esc(monthYear(p)) : "") + "</p>";
    return html + "</a>";
  }

  /* ---- 2. video rail ---------------------------------------------- */
  function vcard(p, colorCls) {
    return '<a class="vcard ' + colorCls + '" href="' + link(p) + '">' +
      media(p, "r-16-9", "16:9 thumbnail", '<span class="tri"></span>') +
      '<div class="body">' +
        '<span class="tag">' + esc(label(p)) + "</span>" +
        '<h3 class="title">' + esc(p.title) + "</h3>" +
        '<p class="byline">' + esc(author(p)) + "</p>" +
      "</div></a>";
  }

  /* ---- 3. latest articles list ------------------------------------ */
  function acard(p, isLead) {
    return '<a class="acard' + (isLead ? " lead" : "") + '" href="' + link(p) + '">' +
      media(p, "r-4-3", isLead ? "4:3 lead photo" : "4:3 photo") +
      '<div class="body">' +
        '<span class="pill">' + esc(label(p)) + "</span>" +
        '<h3 class="title">' + esc(p.title) + "</h3>" +
        (p.excerpt ? '<p class="desc">' + esc(p.excerpt) + "</p>" : "") +
        '<div class="meta"><span>' + esc(author(p)) + '</span><span class="dot">·</span><span>' + esc(date(p)) + "</span></div>" +
      "</div></a>";
  }

  /* ---- 4. art & photography gallery ------------------------------- *
   * With a real image we let the picture set its own height (.gitem
   * .media is aspect-ratio:auto), which is what "ratio matches the
   * artwork" means. Without one we fall back to the slot's shape.      */
  function gitem(p, slot) {
    var box = p.cover_image_url
      ? '<div class="media"><img src="' + esc(p.cover_image_url) + '" alt="' + esc(p.title) + '"></div>'
      : '<div class="media ph" style="aspect-ratio:' + slot.ar + '; background-color: ' + slot.color + ';"><code>' + esc(slot.label) + "</code></div>";
    return '<a class="gitem" href="' + link(p) + '">' + box +
      '<div class="cap"><div class="t">' + esc(p.title) + '</div><div class="a">by ' + esc(author(p)) + "</div></div></a>";
  }

  /* ---- 5. archive card (category.html) ---------------------------- *
   * Same .acard class as the homepage list, but that page authored its
   * cards with <span>s and gives each post type its own photo ratio, so
   * it gets its own renderer rather than being forced to share one.    */
  var ARCHIVE_RATIO = { article: "r-4-3", video: "r-16-9", artwork: "r-1-1", magazine: "r-3-2" };
  var ARCHIVE_PH    = { article: "4:3 photo", video: "16:9 video", artwork: "square art", magazine: "cover" };
  var TYPE_TO_CAT   = { article: "articles", video: "videos", artwork: "artwork", magazine: "magazines" };

  function archiveCard(p) {
    var type  = p.post_type || "article";
    var ratio = ARCHIVE_RATIO[type] || "r-4-3";
    var box = p.cover_image_url
      ? '<span class="media is-natural"><img src="' + esc(p.cover_image_url) + '" alt="' + esc(p.title) + '"></span>'
      : '<span class="media ' + ratio + ' ph"><code>' + esc(ARCHIVE_PH[type] || "photo") + "</code></span>";
    return '<a class="acard" data-cat="' + (TYPE_TO_CAT[type] || "articles") + '" href="' + link(p) + '">' + box +
      '<span class="body">' +
        '<span class="pill">' + esc(label(p)) + "</span>" +
        '<span class="title">' + esc(p.title) + "</span>" +
        (p.excerpt ? '<span class="desc">' + esc(p.excerpt) + "</span>" : "") +
        '<span class="meta"><span>' + esc(author(p)) + '</span><span class="dot">·</span><span>' + esc(date(p)) + "</span></span>" +
      "</span></a>";
  }

  /* ---- fetch ------------------------------------------------------- *
   * Public pages only ever show PUBLISHED posts. This is filtered here
   * as well as by RLS, because a signed-in staff member's session can
   * legitimately read drafts — they just shouldn't surface on the site. */
  function fetchPosts(client, opts) {
    opts = opts || {};
    var q = client.from("posts")
      .select("id, title, slug, excerpt, cover_image_url, post_type, published_at, created_at, category:categories(name), author:profiles(full_name)")
      .eq("status", "published");
    if (opts.type) q = q.eq("post_type", opts.type);
    return q.order("published_at", { ascending: false, nullsFirst: false })
            .limit(opts.limit || 12)
            .then(function (r) { return (r && r.data) || []; });
  }

  /* Replace a container's cards only when there are enough posts to fill
   * every slot; otherwise leave the authored demo markup exactly as-is. */
  function fillSection(container, posts, slots, renderFn) {
    if (!container || !posts || posts.length < slots.length) return false;
    container.innerHTML = slots.map(function (slot, i) { return renderFn(posts[i], slot); }).join("");
    return true;
  }

  /* Has TTT published anything at all? The single switch for the archive
   * page: while the site has nothing, the demo cards stay; once anything
   * is published the archive goes fully data-driven (real results, real
   * count, real empty states). Asks for one row rather than an exact
   * count — it only needs a yes/no, and it avoids depending on the
   * Content-Range header that HEAD/count requests rely on. */
  function hasPublished(client) {
    return client.from("posts").select("id").eq("status", "published").limit(1)
      .then(function (r) { return !!(r && r.data && r.data.length); })
      .catch(function () { return false; });
  }

  window.tttPosts = {
    esc: esc, link: link, author: author, label: label, date: date, media: media,
    bentoCard: bentoCard, vcard: vcard, acard: acard, gitem: gitem, archiveCard: archiveCard,
    fetchPosts: fetchPosts, fillSection: fillSection, hasPublished: hasPublished
  };
})();
