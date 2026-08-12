# SEO & Technical Checklist

Went through all 11 items. Some are ready to use now, some can't be finished until real posts exist, and one is being skipped — with reasons, not just silently dropped.

## Summary

| # | Item | Status |
|---|---|---|
| 1 | Custom 404 | Ready below |
| 2 | CTA above the fold | Skipped — reason below |
| 3 | Internal links | Guideline only — needs real post pages to exist first |
| 4 | 5 FAQs | Ready below |
| 5 | robots.txt | Ready below |
| 6 | Unique page titles | Already mostly done — note below |
| 7 | Meta description | Homepage version ready below; per-post needs dynamic content |
| 8 | Favicon | Needs an image file from you — note below |
| 9 | sitemap.xml | Basic version ready below; will need to become dynamic later |
| 10 | llms.txt | Ready below, but flagged as low-priority — reason below |
| 11 | Structured data | Homepage version ready below; per-post needs dynamic content |

---

## 1. Custom 404

Build `404.html` using the site's existing header, footer, and `ttt.css` — same look as every other page, don't invent new styling for it.

Suggested copy (adjust the wording if you want, this is just a starting point):
- Headline: **"This Page Doesn't Exist (Yet)"**
- Subtext: "The story you're looking for isn't here — maybe it hasn't been written."
- A button back to the homepage.

Cloudflare Pages automatically serves `404.html` for any URL that doesn't match a real page, no extra configuration needed.

---

## 4. Five FAQs

Grounded in what's actually confirmed about TTT — not generic filler.

**What is Tadele Teen Talks?**
A teen-run news and media organization giving young people a platform to share unfiltered stories, ideas, and opinions.

**Who's behind it?**
TTT is led by two co-CEOs, Ije Ezedani and Liya Tadele, along with a team of teen contributors across writing, video, art, and social media.

**What kind of content do you publish?**
Articles, videos, artwork, and photo essays, organized by topic — Opinion, News, Culture, Reviews, and more.

**How can I get involved?**
Join the TTT Discord (linked in the footer) to learn about open roles and how to contribute.

**Where can I follow TTT?**
Instagram, TikTok, and YouTube at @tadeleteentalks — also linked in the footer.

*(Note: I left out "can I submit a story" — that feature was never confirmed as something you're building. Add it once that's actually decided.)*

---

## 5. robots.txt

```
User-agent: *
Allow: /
Disallow: /admin.html
Disallow: /login.html
Disallow: /editor

Sitemap: https://[your-domain]/sitemap.xml
```

The admin, login, and editor pages are deliberately blocked from search engines — no reason for "TTT admin login" to be something people can find on Google.

---

## 6. Unique page titles

Checked this directly on the live pages. Already good: Home, Sign in, Admin, and New Post all have distinct, descriptive browser-tab titles. One thing to double check with Claude Code: make sure `article.html` and `category.html` don't reuse the same generic title for every article/category — each real post should show its own title once posts are dynamic.

---

## 7. Meta description

For the homepage, add this now:

```html
<meta name="description" content="Tadele Teen Talks is a teen-run news and media platform sharing unfiltered stories, opinions, and creative work from young voices.">
```

For individual posts later: pull this straight from the post's `excerpt` field, which already exists in the database schema — no new field needed, just wire the existing one into the `<meta>` tag when post pages go live.

---

## 8. Favicon

This one needs something from you — I can't generate your actual logo. Export a small square version of the circular "TTT" badge from the header (128×128px or so works well) and hand it to Claude Code to convert into a proper favicon set. Until then, browsers will just show a generic blank icon — not broken, just not branded yet.

---

## 9. sitemap.xml

Static version for now — only the pages that actually exist as fixed pages:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://[your-domain]/</loc>
  </url>
</urlset>
```

This can't include real article URLs yet because there are no real articles yet. Once posts exist in Supabase, this needs to become **generated**, not hand-written — added to `07-next-steps.md` as a building task, not something to redo by hand every time a post goes up.

---

## 10. llms.txt

Included, but here's the honest picture: this is a genuinely new, unofficial convention — not backed by any standards body, and as of now no major AI company has confirmed they actually read or act on it. Where it's proven useful so far is mostly developer-documentation sites (coding tools reading library docs), not general content sites like a magazine. It's cheap to add, so no harm including it — just don't expect much from it yet.

```
# Tadele Teen Talks

> A teen-run news and media platform sharing unfiltered stories, ideas, and opinions from young voices, ages 13-21.

## Pages

- [Home](https://[your-domain]/): Latest articles, videos, artwork, and photo essays
```

---

## 11. Structured data

For the homepage, add this now (identifies TTT as an organization to search engines):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Tadele Teen Talks",
  "description": "A teen-run news and media platform sharing unfiltered stories, ideas, and opinions from young voices.",
  "sameAs": [
    "https://instagram.com/tadeleteentalks",
    "https://tiktok.com/@tadeleteentalks",
    "https://youtube.com/@tadeleteentalks"
  ]
}
</script>
```

For individual posts later: each one should get its own `Article` or `NewsArticle` structured data block (headline, author, datePublished, image) built from the real post data — a building task, not something to hand-write per post.

---

## 3. Internal links — guideline, not built yet

Can't actually implement this yet — there are no real article pages to link between, only the template mockup. Add as a rule for when post pages go live: **each article should link to 2-3 related posts (same category) near the bottom.** Note this in the build task for turning the template real (already tracked in `07-next-steps.md`).

---

## 2. CTA above the fold — skipped, here's why

This is a conversion-optimization idea, built for sites trying to drive one specific action — buy something, sign up for a trial. TTT is a magazine: the "action" is reading, and the trending-articles grid right below the header already does that job — it's the same concept a content site actually needs, just not shaped like a marketing button. Forcing an SaaS-style CTA into a magazine layout would fight the actual design instead of helping it. Skipped on purpose, not missed.