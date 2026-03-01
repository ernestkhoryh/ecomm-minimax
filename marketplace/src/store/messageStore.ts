import { create } from 'zustand';
import api from '@/lib/api';
import { useAuthStore } from './authStore';
import type { Conversation, ConversationWithDetails, Message } from '@/types/database';

interface MessageState {
  conversations: ConversationWithDetails[];
  currentConversation: ConversationWithDetails | null;
  messages: Message[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  fetchConversations: () => Promise<void>;
  fetchConversation: (conversationId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<{ success: boolean; error?: string }>;
  startConversation: (sellerId: string, listingId: string, initialMessage?: string) => Promise<{ success: boolean; conversationId?: string; error?: string }>;
  markAsRead: (conversationId: string) => Promise<void>;
  getUnreadCount: () => Promise<void>;
  subscribeToMessages: (conversationId: string) => () => void;
  subscribeToConversations: (userId: string) => () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  isLoading: false,

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const result = await api.getConversations({});

      if (result.error) {
        throw new Error(result.error);
      }

      set({ conversations: result.data?.conversations || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      set({ isLoading: false });
    }
  },

  fetchConversation: async (conversationId: string) => {
    try {
      const result = await api.getConversation(conversationId, {});

      if (result.error) {
        throw new Error(result.error);
      }

      set({ currentConversation: result.data?.conversation });
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  },

  fetchMessages: async (conversationId: string) => {
    set({ isLoading: true });
    try {
      const result = await api.getConversation(conversationId, {});

      if (result.error) {
        throw new Error(result.error);
      }

      set({ messages: result.data?.messages || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching messages:', error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (conversationId: string, content: string) => {
    try {
      const result = await api.sendMessage(conversationId, { content });

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Add to local state
      if (result.data?.message) {
        set({ messages: [...get().messages, result.data.message] });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: 'Failed to send message' };
    }
  },

  startConversation: async (sellerId: string, listingId: string, initialMessage?: string) => {
    try {
      const result = await api.createConversation({
        seller_id: sellerId,
        listing_id: listingId,
        initial_message: initialMessage,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, conversationId: result.data?.conversation?.id };
    } catch (error) {
      console.error('Error starting conversation:', error);
      return { success: false, error: 'Failed to start conversation' };
    }
  },

  markAsRead: async (conversationId: string) => {
    try {
      // Marking as read is handled by fetching the conversation
      await get().fetchConversation(conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  },

  getUnreadCount: async () => {
    try {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) return;

      const result = await api.getUnreadCount();

      if (result.error) {
        throw new Error(result.error);
      }

      set({ unreadCount: result.data?.unread_count || 0 });
    } catch (error) {
      console.error('Error getting unread count:', error);
    }
  },

  // Placeholder methods for real-time subscriptions (not implemented without Supabase Realtime)
  subscribeToMessages: () => {
    return () => {}; // No-op
  },

  subscribeToConversations: () => {
    return () => {}; // No-op
  },
}));

export default useMessageStore;
