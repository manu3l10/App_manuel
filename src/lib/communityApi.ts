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

const buildDefaultAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;

const buildAuthorName = (email?: string | null) => {
  if (!email) return 'viajero';
  const left = email.split('@')[0] ?? 'viajero';
  return left.replace(/[^a-zA-Z0-9_]/g, '_');
};

export const listCommunityPosts = async (): Promise<CommunityPostRecord[]> => {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CommunityPostRecord[];
};

export const createCommunityPost = async (payload: {
  location: string;
  caption: string;
  imageUrl: string;
}): Promise<CommunityPostRecord> => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const user = userData.user;
  if (!user) {
    throw new Error('Debes iniciar sesión para crear una publicación.');
  }

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

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      user_id: user.id,
      author_name: String(authorName),
      author_avatar: String(authorAvatar),
      location: payload.location,
      caption: payload.caption,
      image_url: payload.imageUrl,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as CommunityPostRecord;
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
  return data as CommunityPostRecord;
};

export const deleteCommunityPost = async (postId: string): Promise<void> => {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
};

export const getCurrentUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
};
