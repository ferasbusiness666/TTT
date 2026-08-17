# Database Schema (v1)

Built for: Cloudflare Pages (frontend) + Supabase (DB/Auth) + Cloudinary (photos) + YouTube (video)

**Access model this schema enforces:**
- Anyone can *read* published posts — no login required.
- Only a small, admin-provisioned set of staff accounts can *write* (create/edit/delete posts). No public sign-up.
- No approval workflow — publishing is direct (sign in → post → it's live).

**Update from the first draft:** "Magazine" is not a special content type anymore. It's just one option in `post_type`, treated identically to Article/Video/Artwork — same fields, same table, nothing extra.

---

## Tables

| Table | Purpose |
|---|---|
| `profiles` | One row per staff account. Mirrors Supabase Auth — created when an admin adds someone in the Auth dashboard, not through the site. |
| `categories` | The topical taxonomy — Opinion, News, Culture, Review, Photo Essay, Tech, Special Issue, etc. |
| `posts` | The core content table — every post, regardless of type. |
| `post_media` | Extra images for a post beyond its cover photo (photo essays, galleries). |
| `subscribers` | Footer email capture. |

---

## Full SQL

```sql
-- profiles: one row per staff account (mirrors Supabase Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'staff', -- unenforced for now, see notes below
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- Intentionally no insert policy: accounts are created directly in
-- Supabase Auth (Dashboard -> Authentication -> Users) by an admin.
-- Instead, a trigger auto-creates the matching profile row (below) so
-- that profiles genuinely "mirror" auth.users — see next block.


-- Auto-create a profile whenever a staff account is added in Supabase Auth.
-- Without this, adding a user in the Auth dashboard leaves profiles empty.
-- SECURITY DEFINER so it can write profiles; execute is revoked from the
-- API roles and search_path is pinned, so it isn't exposed or hijackable.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      new.email,
      'Staff'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- categories
create table public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique
);

alter table public.categories enable row level security;

create policy "categories are publicly readable"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "staff can manage categories"
  on public.categories for all
  to authenticated
  using (true)
  with check (true);


-- posts: the core content table
create table public.posts (
  id bigint generated always as identity primary key,
  title text not null,
  slug text not null unique,
  excerpt text,
  body text,
  cover_image_url text,   -- Cloudinary URL
  video_url text,         -- YouTube link, optional
  post_type text not null default 'article'
    check (post_type in ('article', 'video', 'artwork', 'magazine')), -- just a label, all equal
  category_id bigint references public.categories(id),
  author_id uuid references public.profiles(id),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_category_id_idx on public.posts (category_id);
create index posts_author_id_idx on public.posts (author_id);
create index posts_type_idx on public.posts (post_type);
create index posts_published_idx on public.posts (published_at) where status = 'published';

alter table public.posts enable row level security;

create policy "published posts are publicly readable"
  on public.posts for select
  to anon, authenticated
  using (status = 'published');

create policy "staff can view all posts including drafts"
  on public.posts for select
  to authenticated
  using (true);

create policy "staff can create posts"
  on public.posts for insert
  to authenticated
  with check (true);

create policy "staff can update posts"
  on public.posts for update
  to authenticated
  using (true)
  with check (true);

create policy "staff can delete posts"
  on public.posts for delete
  to authenticated
  using (true);


-- post_media: extra images for photo essays / galleries beyond the cover image
create table public.post_media (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  caption text,
  display_order int not null default 0
);

create index post_media_post_id_idx on public.post_media (post_id);

alter table public.post_media enable row level security;

create policy "post media is publicly readable when the post is published"
  on public.post_media for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.posts
      where posts.id = post_media.post_id and posts.status = 'published'
    )
  );

create policy "staff can manage post media"
  on public.post_media for all
  to authenticated
  using (true)
  with check (true);


-- subscribers: footer email capture
create table public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  subscribed_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

create policy "anyone can subscribe"
  on public.subscribers for insert
  to anon, authenticated
  with check (true);

create policy "staff can view subscriber list"
  on public.subscribers for select
  to authenticated
  using (true);
```

---

## Hardening applied after the security stress test

Two migrations tighten the original schema (see `09-security-stress-test.md`):

```sql
-- validate_subscriber_emails (#1)
-- Public INSERT stays — the newsletter needs it — but junk is rejected.
alter table public.subscribers
  add constraint subscribers_email_format check (
    char_length(email) between 6 and 254
    and email ~ '^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$'
  );
-- plus a BEFORE INSERT/UPDATE trigger lowercasing and trimming the address,
-- so Foo@Bar.com and foo@bar.com can't both be stored past the unique index.

-- narrow_public_profile_columns (#4)
-- RLS filters rows, not columns, so column-level grants are the right tool:
-- the public may read a byline, nothing more.
revoke select on public.profiles from anon;
grant  select (id, full_name) on public.profiles to anon;
grant  select on public.profiles to authenticated;   -- staff still see role
```

**Consequence worth knowing:** any *public* query that selects `profiles.role` now fails with `42501`. `article.html` used to request `author:profiles(full_name, role)` for its byline and had to stop — the byline shows date + read time instead. Staff-only code (`tttAuth.currentProfile()`) still reads `role` because `authenticated` keeps full access.

## Notes

- **Accounts aren't created through the app.** Add each staff person directly in Supabase → Authentication → Users. The `on_auth_user_created` trigger then creates their `profiles` row automatically — no manual insert needed.
- **Set a real display name when creating the account.** In the "Add user" dialog (or afterward, under the user's *User Metadata*), add `full_name`. If you skip it, the profile's `full_name` falls back to the email address, which is what shows in the UI. The name can be updated later either in Auth metadata or directly on the `profiles` row.
- **`role` on `profiles` does nothing yet.** Every account can do everything right now. It's there so that later, if an approval step is wanted, a policy can check `role = 'editor'` — no restructuring needed.
- **Comments, whenever ready**, would just be a new, fully independent table referencing `posts.id` — zero risk to anything above.
- **Data API access:** Supabase sometimes needs `anon`/`authenticated` roles explicitly granted on a *new* table beyond RLS. If a table seems invisible from the app right after creating it, check Table Editor → API settings.
- **When actually running this:** use `supabase migration new create_initial_schema` and put this SQL in the generated file, rather than pasting it straight into the SQL editor — keeps a clean migration history.