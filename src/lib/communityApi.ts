import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface CommunityPostRecord {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  location: string;
  caption: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityCommentRecord {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  user_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityLikeRecord {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface CommunitySavedPostRecord {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface CommunityCommentLikeRecord {
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface CommunityNotificationRecord {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  actor_name: string;
  actor_avatar: string;
  type: 'post_like' | 'comment_like' | 'comment_reply';
  post_id: string | null;
  comment_id: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface CommunityFeedSnapshot {
  currentUserId: string | null;
  posts: CommunityPostRecord[];
  comments: CommunityCommentRecord[];
  likes: CommunityLikeRecord[];
  savedPosts: CommunitySavedPostRecord[];
  commentLikes: CommunityCommentLikeRecord[];
  fetchedAt: number;
}

const COMMUNITY_FEED_CACHE_TTL_MS = 45_000;
let cachedCommunityFeed: CommunityFeedSnapshot | null = null;
let communityFeedRequest: Promise<CommunityFeedSnapshot> | null = null;

const buildDefaultAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

const buildAuthorName = (email?: string | null) => {
  if (!email) return 'viajero';
  const left = email.split('@')[0] ?? 'viajero';
  return left.replace(/[^a-zA-Z0-9_]/g, '_');
};

const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
};

const getCurrentUserOrThrow = async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Debes iniciar sesión para usar esta acción.');
  }
  return user;
};

const getAuthorProfile = (user: User) => {
  const metadata = user.user_metadata ?? {};
  const authorName =
    metadata.username ??
    metadata.full_name ??
    metadata.name ??
    buildAuthorName(user.email);

  const authorAvatar =
    metadata.avatar_url ??
    metadata.picture ??
    buildDefaultAvatar(String(authorName));

  return {
    authorName: String(authorName),
    authorAvatar: String(authorAvatar),
  };
};

export const listCommunityPosts = async (): Promise<CommunityPostRecord[]> => {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CommunityPostRecord[];
};

export const listCommunityCommentsByPostIds = async (
  postIds: string[]
): Promise<CommunityCommentRecord[]> => {
  if (postIds.length === 0) return [];

  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CommunityCommentRecord[];
};

export const listCommunityLikesByPostIds = async (
  postIds: string[]
): Promise<CommunityLikeRecord[]> => {
  if (postIds.length === 0) return [];

  const { data, error } = await supabase
    .from('community_post_likes')
    .select('post_id,user_id,created_at')
    .in('post_id', postIds);

  if (error) throw error;
  return (data ?? []) as CommunityLikeRecord[];
};

export const listCommunitySavedPostsByPostIds = async (
  postIds: string[],
  currentUserId?: string | null
): Promise<CommunitySavedPostRecord[]> => {
  if (postIds.length === 0) return [];
  const resolvedUserId = currentUserId ?? (await getCurrentUser())?.id ?? null;
  if (!resolvedUserId) return [];

  const { data, error } = await supabase
    .from('community_saved_posts')
    .select('post_id,user_id,created_at')
    .eq('user_id', resolvedUserId)
    .in('post_id', postIds);

  if (error) throw error;
  return (data ?? []) as CommunitySavedPostRecord[];
};

export const listCommunityCommentLikesByPostIds = async (
  postIds: string[]
): Promise<CommunityCommentLikeRecord[]> => {
  if (postIds.length === 0) return [];

  const comments = await listCommunityCommentsByPostIds(postIds);
  const commentIds = comments.map((comment) => comment.id);
  if (commentIds.length === 0) return [];

  const { data, error } = await supabase
    .from('community_comment_likes')
    .select('comment_id,user_id,created_at')
    .in('comment_id', commentIds);

  if (error) throw error;
  return (data ?? []) as CommunityCommentLikeRecord[];
};

export const listCommunityCommentLikesByCommentIds = async (
  commentIds: string[]
): Promise<CommunityCommentLikeRecord[]> => {
  if (commentIds.length === 0) return [];

  const { data, error } = await supabase
    .from('community_comment_likes')
    .select('comment_id,user_id,created_at')
    .in('comment_id', commentIds);

  if (error) throw error;
  return (data ?? []) as CommunityCommentLikeRecord[];
};

export const listSavedCommunityPosts = async (): Promise<{
  posts: CommunityPostRecord[];
  saved: CommunitySavedPostRecord[];
}> => {
  const user = await getCurrentUserOrThrow();

  const { data: savedData, error: savedError } = await supabase
    .from('community_saved_posts')
    .select('post_id,user_id,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (savedError) throw savedError;

  const saved = (savedData ?? []) as CommunitySavedPostRecord[];
  const postIds = saved.map((item) => item.post_id);
  if (postIds.length === 0) return { posts: [], saved };

  const { data: postsData, error: postsError } = await supabase
    .from('community_posts')
    .select('*')
    .in('id', postIds);

  if (postsError) throw postsError;

  const order = new Map(postIds.map((id, index) => [id, index]));
  const posts = ((postsData ?? []) as CommunityPostRecord[]).sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );

  return { posts, saved };
};

export const getCachedCommunityFeed = (): CommunityFeedSnapshot | null => {
  if (!cachedCommunityFeed) return null;
  if (Date.now() - cachedCommunityFeed.fetchedAt > COMMUNITY_FEED_CACHE_TTL_MS) return null;
  return cachedCommunityFeed;
};

export const invalidateCommunityFeedCache = () => {
  cachedCommunityFeed = null;
  communityFeedRequest = null;
};

export const syncCommunityProfile = async (payload: {
  authorName: string;
  authorAvatar: string;
}): Promise<void> => {
  const { error } = await supabase.rpc('sync_community_profile', {
    p_author_name: payload.authorName,
    p_author_avatar: payload.authorAvatar,
  });

  if (error) throw error;
  invalidateCommunityFeedCache();
};

export const loadCommunityFeed = async (
  options: { forceRefresh?: boolean } = {}
): Promise<CommunityFeedSnapshot> => {
  const { forceRefresh = false } = options;
  const cached = !forceRefresh ? getCachedCommunityFeed() : null;
  if (cached) return cached;

  if (communityFeedRequest) {
    return communityFeedRequest;
  }

  communityFeedRequest = (async () => {
    const [currentUserId, postRecords] = await Promise.all([
      getCurrentUserId(),
      listCommunityPosts(),
    ]);

    const postIds = postRecords.map((post) => post.id);
    const commentsPromise = listCommunityCommentsByPostIds(postIds);

    const [comments, likes, savedPosts] = await Promise.all([
      commentsPromise,
      listCommunityLikesByPostIds(postIds),
      listCommunitySavedPostsByPostIds(postIds, currentUserId),
    ]);

    const commentIds = comments.map((comment) => comment.id);
    const commentLikes = await listCommunityCommentLikesByCommentIds(commentIds);

    const snapshot: CommunityFeedSnapshot = {
      currentUserId,
      posts: postRecords,
      comments,
      likes,
      savedPosts,
      commentLikes,
      fetchedAt: Date.now(),
    };

    cachedCommunityFeed = snapshot;
    return snapshot;
  })();

  try {
    return await communityFeedRequest;
  } finally {
    communityFeedRequest = null;
  }
};

export const warmCommunityFeed = async (): Promise<void> => {
  try {
    await loadCommunityFeed();
  } catch (error) {
    console.error("Error warming community feed:", error);
  }
};

export const createCommunityPost = async (payload: {
  location: string;
  caption: string;
  imageUrl: string;
}): Promise<CommunityPostRecord> => {
  const user = await getCurrentUserOrThrow();
  const { authorName, authorAvatar } = getAuthorProfile(user);

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      author_name: authorName,
      author_avatar: authorAvatar,
      location: payload.location,
      caption: payload.caption,
      image_url: payload.imageUrl,
    })
    .select('*')
    .single();

  if (error) throw error;
  invalidateCommunityFeedCache();
  return data as CommunityPostRecord;
};

export const createCommunityComment = async (payload: {
  postId: string;
  content: string;
  parentCommentId?: string | null;
}): Promise<CommunityCommentRecord> => {
  const user = await getCurrentUserOrThrow();
  const { authorName, authorAvatar } = getAuthorProfile(user);

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: payload.postId,
      parent_comment_id: payload.parentCommentId ?? null,
      user_id: user.id,
      author_name: authorName,
      author_avatar: authorAvatar,
      content: payload.content,
    })
    .select('*')
    .single();

  if (error) throw error;
  invalidateCommunityFeedCache();
  await maybeCreateReplyNotification(data as CommunityCommentRecord, user);
  return data as CommunityCommentRecord;
};

export const toggleCommunityLike = async (
  postId: string
): Promise<{ liked: boolean }> => {
  const user = await getCurrentUserOrThrow();

  const { data: existingLike, error: existingLikeError } = await supabase
    .from('community_post_likes')
    .select('post_id,user_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingLikeError) throw existingLikeError;

  if (existingLike) {
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
    invalidateCommunityFeedCache();
    return { liked: false };
  }

  const { error } = await supabase
    .from('community_post_likes')
    .insert({
      post_id: postId,
      user_id: user.id,
    });

  if (error) throw error;
  invalidateCommunityFeedCache();
  await maybeCreatePostLikeNotification(postId, user);
  return { liked: true };
};

export const toggleCommunitySave = async (
  postId: string
): Promise<{ saved: boolean }> => {
  const user = await getCurrentUserOrThrow();

  const { data: existingSave, error: existingSaveError } = await supabase
    .from('community_saved_posts')
    .select('post_id,user_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingSaveError) throw existingSaveError;

  if (existingSave) {
    const { error } = await supabase
      .from('community_saved_posts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
    invalidateCommunityFeedCache();
    return { saved: false };
  }

  const { error } = await supabase
    .from('community_saved_posts')
    .insert({
      post_id: postId,
      user_id: user.id,
    });

  if (error) throw error;
  invalidateCommunityFeedCache();
  return { saved: true };
};

export const toggleCommunityCommentLike = async (
  commentId: string
): Promise<{ liked: boolean }> => {
  const user = await getCurrentUserOrThrow();

  const { data: existingLike, error: existingLikeError } = await supabase
    .from('community_comment_likes')
    .select('comment_id,user_id')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingLikeError) throw existingLikeError;

  if (existingLike) {
    const { error } = await supabase
      .from('community_comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;
    invalidateCommunityFeedCache();
    return { liked: false };
  }

  const { error } = await supabase
    .from('community_comment_likes')
    .insert({
      comment_id: commentId,
      user_id: user.id,
    });

  if (error) throw error;
  invalidateCommunityFeedCache();
  return { liked: true };
};

export const updateCommunityPost = async (
  postId: string,
  payload: { location: string; caption: string; imageUrl: string }
): Promise<CommunityPostRecord> => {
  const { data, error } = await supabase
    .from('community_posts')
    .update({
      location: payload.location,
      caption: payload.caption,
      image_url: payload.imageUrl,
    })
    .eq('id', postId)
    .select('*')
    .single();

  if (error) throw error;
  invalidateCommunityFeedCache();
  return data as CommunityPostRecord;
};

export const deleteCommunityPost = async (postId: string): Promise<void> => {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
  invalidateCommunityFeedCache();
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  return user?.id ?? null;
};

export const listCommunityNotifications = async (): Promise<CommunityNotificationRecord[]> => {
  const user = await getCurrentUserOrThrow();

  const { data, error } = await supabase
    .from('community_notifications')
    .select('*')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as CommunityNotificationRecord[];
};

export const markCommunityNotificationAsRead = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('community_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
};

const maybeCreatePostLikeNotification = async (postId: string, actor: User): Promise<void> => {
  const { data: post, error: postError } = await supabase
    .from('community_posts')
    .select('id,user_id')
    .eq('id', postId)
    .single();

  if (postError || !post || post.user_id === actor.id) return;

  const { authorName, authorAvatar } = getAuthorProfile(actor);
  await supabase.from('community_notifications').insert({
    recipient_id: post.user_id,
    actor_id: actor.id,
    actor_name: authorName,
    actor_avatar: authorAvatar,
    type: 'post_like',
    post_id: postId,
    message: `${authorName} le dio like a tu publicación.`,
  });
};

const maybeCreateReplyNotification = async (
  comment: CommunityCommentRecord,
  actor: User
): Promise<void> => {
  if (!comment.parent_comment_id) return;

  const { data: parentComment, error } = await supabase
    .from('community_comments')
    .select('id,user_id,post_id')
    .eq('id', comment.parent_comment_id)
    .single();

  if (error || !parentComment || parentComment.user_id === actor.id) return;

  const { authorName, authorAvatar } = getAuthorProfile(actor);
  await supabase.from('community_notifications').insert({
    recipient_id: parentComment.user_id,
    actor_id: actor.id,
    actor_name: authorName,
    actor_avatar: authorAvatar,
    type: 'comment_reply',
    post_id: parentComment.post_id,
    comment_id: comment.id,
    message: `${authorName} respondió tu comentario.`,
  });
};
