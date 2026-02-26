import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Conversation, ConversationWithDetails, Message } from '@/types/database';

interface MessageState {
  conversations: ConversationWithDetails[];
  currentConversation: ConversationWithDetails | null;
  messages: Message[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  fetchConversations: (userId: string) => Promise<void>;
  fetchConversation: (conversationId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  startConversation: (buyerId: string, sellerId: string, listingId: string, initialMessage?: string) => Promise<{ success: boolean; conversationId?: string; error?: string }>;
  markAsRead: (conversationId: string, userId: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => () => void;
  subscribeToConversations: (userId: string) => () => void;
  getUnreadCount: (userId: string) => Promise<void>;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  isLoading: false,

  fetchConversations: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          buyer:users!buyer_id(id, username, display_name, avatar_url),
          seller:users!seller_id(id, username, display_name, avatar_url),
          listing:listings!listing_id(id, title, slug, price, images:listing_images(url, is_primary))
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      set({ conversations: data || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({ isLoading: false });
    }
  },

  fetchConversation: async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          buyer:users!buyer_id(id, username, display_name, avatar_url),
          seller:users!seller_id(id, username, display_name, avatar_url),
          listing:listings!listing_id(id, title, slug, price, status, images:listing_images(url, is_primary))
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      set({ currentConversation: data });
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({ messages: data || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId: string, senderId: string, content: string) => {
    try {
      // Insert message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          is_read: false,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Get conversation to determine recipient
      const { data: conversation } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversationId)
        .single();

      if (conversation) {
        const isBuyer = senderId === conversation.buyer_id;

        // Update conversation with last message info
        await supabase
          .from('conversations')
          .update({
            last_message_id: message.id,
            last_message_at: message.created_at,
            last_message_preview: content.substring(0, 100),
            ...(isBuyer
              ? { seller_unread_count: supabase.rpc('increment', { x: 1 }) }
              : { buyer_unread_count: supabase.rpc('increment', { x: 1 }) }),
          })
          .eq('id', conversationId);
      }

      // Add to local state
      set({ messages: [...get().messages, message] });

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  },

  startConversation: async (buyerId: string, sellerId: string, listingId: string, initialMessage?: string) => {
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', buyerId)
        .eq('seller_id', sellerId)
        .eq('listing_id', listingId)
        .single();

      if (existing) {
        return { success: true, conversationId: existing.id };
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          buyer_id: buyerId,
          seller_id: sellerId,
          listing_id: listingId,
          is_active: true,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Send initial message if provided
      if (initialMessage) {
        await get().sendMessage(conversation.id, buyerId, initialMessage);
      }

      return { success: true, conversationId: conversation.id };
    } catch (error) {
      console.error('Error starting conversation:', error);
      return { success: false, error: 'Failed to start conversation' };
    }
  },

  markAsRead: async (conversationId: string, userId: string) => {
    try {
      // Get conversation to determine if user is buyer or seller
      const { data: conversation } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversationId)
        .single();

      if (!conversation) return;

      const isBuyer = userId === conversation.buyer_id;

      // Update unread count
      await supabase
        .from('conversations')
        .update(isBuyer ? { buyer_unread_count: 0 } : { seller_unread_count: 0 })
        .eq('id', conversationId);

      // Mark all messages as read
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      // Update local state
      set({
        messages: get().messages.map((m) =>
          m.sender_id !== userId ? { ...m, is_read: true } : m
        ),
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  },

  subscribeToMessages: (conversationId: string) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          set({ messages: [...get().messages, newMessage] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToConversations: (userId: string) => {
    const channel = supabase
      .channel(`conversations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // Refetch conversations on any change
          get().fetchConversations(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  getUnreadCount: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id, buyer_unread_count, seller_unread_count')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

      if (error) throw error;

      const totalUnread = (data || []).reduce((sum, conv) => {
        if (conv.buyer_id === userId) {
          return sum + (conv.buyer_unread_count || 0);
        } else {
          return sum + (conv.seller_unread_count || 0);
        }
      }, 0);

      set({ unreadCount: totalUnread });
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
  },
}));

export default useMessageStore;
