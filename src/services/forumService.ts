import { supabase } from '@/lib/supabase';

export interface ForumTopic {
  id: string;
  title: string;
  description?: string | null;
  course_id?: number | null;
  created_by?: string | null;
  reply_count: number;
  last_message_excerpt?: string | null;
  last_message_at?: string | null;
  created_at?: string;
  updated_at?: string;
  courses?: {
    title: string;
  } | null;
}

export interface CreateForumTopicInput {
  title: string;
  description?: string | null;
  courseId?: number;
  createdBy: string;
}

export const forumService = {
  async listTopics(): Promise<ForumTopic[]> {
    const { data, error } = await supabase
      .from('forum_topics')
      .select(
        `
        id,
        title,
        description,
        reply_count,
        last_message_excerpt,
        last_message_at,
        course_id,
        created_by,
        created_at,
        updated_at,
        courses ( title )
      `
      )
      .order('last_message_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return (data || []) as unknown as ForumTopic[];
  },

  async createTopic(input: CreateForumTopicInput): Promise<ForumTopic> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('forum_topics')
      .insert({
        title: input.title,
        description: input.description ?? null,
        course_id: input.courseId ?? null,
        created_by: input.createdBy,
        reply_count: 0,
        last_message_excerpt: input.description ? input.description.slice(0, 160) : null,
        last_message_at: now,
      })
      .select(
        `
        id,
        title,
        description,
        reply_count,
        last_message_excerpt,
        last_message_at,
        course_id,
        created_by,
        created_at,
        updated_at,
        courses ( title )
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return data as unknown as ForumTopic;
  },

  async getTopic(topicId: string): Promise<ForumTopic | null> {
    const { data, error } = await supabase
      .from('forum_topics')
      .select(
        `
        id,
        title,
        description,
        reply_count,
        last_message_excerpt,
        last_message_at,
        course_id,
        created_by,
        created_at,
        updated_at,
        courses ( title )
      `
      )
      .eq('id', topicId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data ?? null) as unknown as ForumTopic | null;
  },
};
