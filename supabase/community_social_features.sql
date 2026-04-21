-- Community social features for MTA
-- Adds saved posts, comment replies, comment likes and notifications.

create extension if not exists pgcrypto;

alter table public.community_comments
  add column if not exists parent_comment_id uuid references public.community_comments(id) on delete cascade;

create table if not exists public.community_saved_posts (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'viajero',
  actor_avatar text not null default '',
  type text not null check (type in ('post_like', 'comment_like', 'comment_reply')),
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_community_comments_parent_comment_id
  on public.community_comments(parent_comment_id);

create index if not exists idx_community_saved_posts_user_created_at
  on public.community_saved_posts(user_id, created_at desc);

create index if not exists idx_community_saved_posts_post_id
  on public.community_saved_posts(post_id);

create index if not exists idx_community_comment_likes_comment_id
  on public.community_comment_likes(comment_id);

create index if not exists idx_community_notifications_recipient_created_at
  on public.community_notifications(recipient_id, created_at desc);

alter table public.community_saved_posts enable row level security;
alter table public.community_comment_likes enable row level security;
alter table public.community_notifications enable row level security;

-- Saved posts

drop policy if exists "community_saved_posts_select_own" on public.community_saved_posts;
create policy "community_saved_posts_select_own"
  on public.community_saved_posts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "community_saved_posts_insert_own" on public.community_saved_posts;
create policy "community_saved_posts_insert_own"
  on public.community_saved_posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_saved_posts_delete_own" on public.community_saved_posts;
create policy "community_saved_posts_delete_own"
  on public.community_saved_posts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Comment likes

drop policy if exists "community_comment_likes_select_authenticated" on public.community_comment_likes;
create policy "community_comment_likes_select_authenticated"
  on public.community_comment_likes
  for select
  to authenticated
  using (true);

drop policy if exists "community_comment_likes_insert_own" on public.community_comment_likes;
create policy "community_comment_likes_insert_own"
  on public.community_comment_likes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "community_comment_likes_delete_own" on public.community_comment_likes;
create policy "community_comment_likes_delete_own"
  on public.community_comment_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Notifications

drop policy if exists "community_notifications_select_recipient" on public.community_notifications;
create policy "community_notifications_select_recipient"
  on public.community_notifications
  for select
  to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "community_notifications_insert_actor" on public.community_notifications;
create policy "community_notifications_insert_actor"
  on public.community_notifications
  for insert
  to authenticated
  with check (auth.uid() = actor_id and recipient_id <> actor_id);

drop policy if exists "community_notifications_update_recipient" on public.community_notifications;
create policy "community_notifications_update_recipient"
  on public.community_notifications
  for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "community_notifications_delete_recipient" on public.community_notifications;
create policy "community_notifications_delete_recipient"
  on public.community_notifications
  for delete
  to authenticated
  using (auth.uid() = recipient_id);

