/* =====================================================================
   TADELE TEEN TALKS — SHARED CHROME  (ttt.js)
   =====================================================================
   Builds the sticky HEADER and the FOOTER once, here, then injects them
   into every public page. Keeping them in one place means the nav, the
   masthead and the footer can never drift between pages.

   USAGE — every public page (index / category / article) contains:
     <header id="site-header" data-nav="all"></header>   <- data-nav = active tab
     ... page content ...
     <footer id="site-footer"></footer>
     <script src="assets/ttt.js"></script>

   data-nav accepts: all | articles | videos | artwork | founders | magazines
   (Login / admin / editor pages do NOT use this chrome — they have their
   own bespoke top bars, but still link assets/ttt.css for the design system.)
   ===================================================================== */
(function () {
  "use strict";

  /* ---- nav model: label -> destination ---------------------------- *
   * Category tabs route to the archive page (category.html?cat=…) so a
   * tab shows ONLY that category — no trending / videos / mixed sections. */
  var NAV = [
    { key: "all",       label: "all",       href: "index.html" },
    { key: "articles",  label: "articles",  href: "category.html?cat=articles" },
    { key: "videos",    label: "videos",    href: "category.html?cat=videos" },
    { key: "artwork",   label: "artwork",   href: "category.html?cat=artwork" },
    { key: "magazines", label: "magazines", href: "category.html?cat=magazines" }
  ];

  function headerHTML(active) {
    var tabs = NAV.map(function (n) {
      var cls = "tab" + (n.key === active ? " is-active" : "");
      return '<a class="' + cls + '" href="' + n.href + '">' + n.label + "</a>";
    }).join("");

    return '' +
    '<div class="masthead__top">' +
      '<div class="brand">' +
        '<a href="index.html" aria-label="Tadele Teen Talks home">' +
          '<div class="ticker" aria-hidden="true">' +
            '<span class="star">\u2605</span> BLM <span class="sep">\u00b7</span> POC <span class="sep">\u00b7</span> TEEN <span class="sep">\u00b7</span> SUBERBIA <span class="sep">\u00b7</span> TRENDING <span class="star">\u2605</span>' +
          '</div>' +
          '<div class="wordmark">TADELE TEEN TALKS</div>' +
        '</a>' +
      '</div>' +
      '<div class="head-tools">' +
        '<label class="search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line></svg>' +
          '<input type="text" placeholder="search stories..." aria-label="Search stories" />' +
        '</label>' +
        '<a class="login" href="login.html">LOGIN' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>' +
        '</a>' +
        '<a class="logo-badge" href="index.html" title="Tadele Teen Talks"><img src="images/logo-badge.png" alt="" width="44" height="44" /></a>' +
      '</div>' +
    '</div>' +
    '<nav class="nav" aria-label="Sections">' + tabs + '</nav>';
  }

  function footerHTML() {
    return '' +
    '<div class="footer-grid">' +
      '<div class="fwordmark">TADELE<br />TEEN TALKS</div>' +
      '<nav class="flinks" aria-label="Footer">' +
        '<a href="category.html?cat=articles">ARTICLES</a>' +
        '<a href="category.html?cat=videos">VIDEOS</a>' +
        '<a href="category.html?cat=artwork">ARTWORK</a>' +
        '<a href="index.html#founders">FOUNDERS</a>' +
        '<a href="login.html">SIGN IN</a>' +
        '<a href="terms.html">TERMS</a>' +
        '<a href="privacy.html">PRIVACY</a>' +
      '</nav>' +
      '<div class="fsocial-block">' +
        '<a class="discord-btn" href="https://discord.gg/G8fC4aJtM" target="_blank" rel="noopener noreferrer" aria-label="Join the TTT Discord">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"></path></svg>' +
          'JOIN THE DISCORD' +
        '</a>' +
        '<div class="social-row">' +
          '<a class="sbtn" href="https://instagram.com/tadeleteentalks" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path></svg></a>' +
          '<a class="sbtn" href="https://tiktok.com/@tadeleteentalks" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"></path></svg></a>' +
          '<a class="sbtn" href="https://youtube.com/@tadeleteentalks" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg></a>' +
        '</div>' +
        '<div class="handle">@TADELETEENTALKS</div>' +
      '</div>' +
    '</div>' +
    '<div class="footer-base">' +
      '<span class="tagline">By teens, for teens.</span>' +
      '<span class="copy">VOL. 03 \u00b7 2025 \u00b7 TTT MEDIA</span>' +
    '</div>';
  }

  /* ---- compact-on-scroll: full masthead at top, slim bar once scrolled.
   * Hysteresis (120 down / 10 up) is wider than the header's own height
   * change so the boundary can never re-trigger itself (no flicker). */
  function wireShrink(header) {
    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      if (y > 120) header.classList.add("is-compact");
      else if (y < 10) header.classList.remove("is-compact");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---- mount everything ------------------------------------------- */
  function mount() {
    var header = document.getElementById("site-header");
    if (header) {
      header.classList.add("masthead");
      var active = header.getAttribute("data-nav") || "all";
      header.innerHTML = headerHTML(active);
      wireShrink(header);

      // search: full pill on desktop; round icon that expands on mobile
      var searchEl = header.querySelector(".search");
      var input = header.querySelector(".search input");
      if (searchEl && input) {
        // is-searching clears the tabs/brand out from under the open field,
        // which otherwise gets drawn on top of them.
        var closeSearch = function () {
          searchEl.classList.remove("is-open");
          header.classList.remove("is-searching");
        };
        searchEl.addEventListener("click", function (e) {
          if (window.matchMedia("(max-width: 720px)").matches && !searchEl.classList.contains("is-open")) {
            e.preventDefault();
            searchEl.classList.add("is-open");
            header.classList.add("is-searching");
            setTimeout(function () { input.focus(); }, 40);
          }
        });
        input.addEventListener("blur", function () {
          if (!input.value.trim()) closeSearch();
        });
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && input.value.trim()) {
            window.location.href = "category.html?q=" + encodeURIComponent(input.value.trim());
          } else if (e.key === "Escape") {
            input.value = ""; closeSearch(); input.blur();
          }
        });
      }
    }

    var footer = document.getElementById("site-footer");
    if (footer) {
      footer.classList.add("site-footer");
      footer.innerHTML = footerHTML();

      /* The newsletter form is wired by tttPosts.wireNewsletter on the
       * pages that carry one — it needs a Supabase client, which this
       * file deliberately doesn't load. The mockup used to fake a
       * "YOU'RE IN" confirmation here without storing anything. */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  // expose for pages that want the nav model (e.g. editor category list)
  window.TTT = { NAV: NAV };
})();
