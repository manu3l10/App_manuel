-- Sync denormalized community profile fields after a user updates name/avatar.
-- Run after community_posts.sql and community_social_features.sql.

create or replace function public.sync_community_profile(
  p_author_name text,
  p_author_avatar text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.community_posts
  set
    author_name = coalesce(nullif(trim(p_author_name), ''), author_name),
    author_avatar = coalesce(nullif(trim(p_author_avatar), ''), author_avatar)
  where user_id = current_user_id;

  update public.community_comments
  set
    author_name = coalesce(nullif(trim(p_author_name), ''), author_name),
    author_avatar = coalesce(nullif(trim(p_author_avatar), ''), author_avatar)
  where user_id = current_user_id;

  update public.community_notifications
  set
    actor_name = coalesce(nullif(trim(p_author_name), ''), actor_name),
    actor_avatar = coalesce(nullif(trim(p_author_avatar), ''), actor_avatar)
  where actor_id = current_user_id;
end;
$$;

revoke all on function public.sync_community_profile(text, text) from public;
grant execute on function public.sync_community_profile(text, text) to authenticated;
