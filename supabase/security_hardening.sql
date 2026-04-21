-- Security hardening for MTA community features
-- Run after community_posts.sql and community_social_features.sql.

-- Keep parent comment replies consistent with their post.
create or replace function public.enforce_comment_parent_same_post()
returns trigger
language plpgsql
as $$
declare
  parent_post_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select post_id
    into parent_post_id
    from public.community_comments
    where id = new.parent_comment_id;

  if parent_post_id is null then
    raise exception 'Parent comment does not exist';
  end if;

  if parent_post_id <> new.post_id then
    raise exception 'Reply parent must belong to the same post';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_community_comments_parent_same_post on public.community_comments;
create trigger trg_community_comments_parent_same_post
before insert or update on public.community_comments
for each row execute function public.enforce_comment_parent_same_post();

-- Avoid duplicate unread post-like notifications from the same actor for the same post.
create unique index if not exists uq_community_notifications_unread_post_like
  on public.community_notifications(recipient_id, actor_id, post_id, type)
  where type = 'post_like' and read_at is null;

-- Saved posts policies: users only manage their own saved posts.
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
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.community_posts p
      where p.id = post_id
    )
  );

drop policy if exists "community_saved_posts_delete_own" on public.community_saved_posts;
create policy "community_saved_posts_delete_own"
  on public.community_saved_posts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Comment likes policies: authenticated users can read likes and only manage their own.
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
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.community_comments c
      where c.id = comment_id
    )
  );

drop policy if exists "community_comment_likes_delete_own" on public.community_comment_likes;
create policy "community_comment_likes_delete_own"
  on public.community_comment_likes
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Notifications policies:
-- Recipients can read/update/delete their notifications.
-- Actors can insert only valid notifications tied to real post/comment ownership.
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
  with check (
    auth.uid() = actor_id
    and recipient_id <> actor_id
    and (
      (
        type = 'post_like'
        and post_id is not null
        and comment_id is null
        and exists (
          select 1
          from public.community_posts p
          where p.id = post_id
            and p.user_id = recipient_id
        )
        and exists (
          select 1
          from public.community_post_likes l
          where l.post_id = community_notifications.post_id
            and l.user_id = actor_id
        )
      )
      or
      (
        type = 'comment_reply'
        and post_id is not null
        and comment_id is not null
        and exists (
          select 1
          from public.community_comments reply
          join public.community_comments parent
            on parent.id = reply.parent_comment_id
          where reply.id = community_notifications.comment_id
            and reply.post_id = community_notifications.post_id
            and reply.user_id = actor_id
            and parent.user_id = recipient_id
        )
      )
      or
      (
        type = 'comment_like'
        and comment_id is not null
        and exists (
          select 1
          from public.community_comments c
          join public.community_comment_likes l
            on l.comment_id = c.id
          where c.id = community_notifications.comment_id
            and c.user_id = recipient_id
            and l.user_id = actor_id
        )
      )
    )
  );

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

