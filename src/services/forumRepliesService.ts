import { supabase } from '../lib/supabase';

export interface ForumReply {
  id: string;
  topic_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    first_name: string | null;
    last_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface CreateForumReplyInput {
  topicId: string;
  authorId: string;
  content: string;
}

export const forumRepliesService = {
  async listReplies(topicId: string): Promise<ForumReply[]> {
    const { data, error } = await supabase
      .from('forum_replies')
      .select(`
        id,
        topic_id,
        author_id,
        content,
        created_at,
        updated_at,
        users (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('topic_id', topicId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      topic_id: row.topic_id,
      author_id: row.author_id,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: row.users
        ? {
            first_name: row.users.first_name ?? null,
            last_name: row.users.last_name ?? null,
            avatar_url: row.users.avatar_url ?? null,
          }
        : null,
    }));
  },

  async createReply(input: CreateForumReplyInput): Promise<ForumReply> {
    const { data, error } = await supabase
      .from('forum_replies')
      .insert({
        topic_id: input.topicId,
        author_id: input.authorId,
        content: input.content,
      })
      .select(`
        id,
        topic_id,
        author_id,
        content,
        created_at,
        updated_at,
        users (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    const excerpt = input.content.length > 160 ? `${input.content.slice(0, 157)}…` : input.content;
    const rpcResponse = await supabase.rpc('increment_forum_topic_replies', {
      p_topic_id: input.topicId,
      p_last_excerpt: excerpt,
    });
    if (rpcResponse.error) {
      console.warn(
        '[forumRepliesService] Error actualizando métricas del foro:',
        rpcResponse.error
      );
    }

    return {
      id: data.id,
      topic_id: data.topic_id,
      author_id: data.author_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: data.users
        ? {
            first_name: data.users.first_name ?? null,
            last_name: data.users.last_name ?? null,
            avatar_url: data.users.avatar_url ?? null,
          }
        : null,
    };
  },

  async updateReply(replyId: string, content: string): Promise<ForumReply> {
    const { data, error } = await supabase
      .from('forum_replies')
      .update({ content })
      .eq('id', replyId)
      .select(`
        id,
        topic_id,
        author_id,
        content,
        created_at,
        updated_at,
        users (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    const rpcResponse = await supabase.rpc('refresh_forum_topic_metrics', {
      p_topic_id: data.topic_id,
    });
    if (rpcResponse.error) {
      console.warn(
        '[forumRepliesService] Error refrescando métricas del foro tras edición:',
        rpcResponse.error
      );
    }

    return {
      id: data.id,
      topic_id: data.topic_id,
      author_id: data.author_id,
      content: data.content,
      created_at: data.created_at,
      updated_at: data.updated_at,
      author: data.users
        ? {
            first_name: data.users.first_name ?? null,
            last_name: data.users.last_name ?? null,
            avatar_url: data.users.avatar_url ?? null,
          }
        : null,
    };
  },

  async deleteReply(replyId: string, topicId: string): Promise<void> {
    const { error } = await supabase
      .from('forum_replies')
      .delete()
      .eq('id', replyId);

    if (error) {
      throw error;
    }

    const rpcResponse = await supabase.rpc('refresh_forum_topic_metrics', {
      p_topic_id: topicId,
    });
    if (rpcResponse.error) {
      console.warn(
        '[forumRepliesService] Error refrescando métricas del foro tras eliminación:',
        rpcResponse.error
      );
    }
  },
};

