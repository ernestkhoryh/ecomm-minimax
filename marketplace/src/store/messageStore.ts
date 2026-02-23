import { create } from 'zustand';
import type { ConversationWithDetails, Message } from '@/types/database';

interface MessageState {
  conversations: ConversationWithDetails[];
  currentConversation: ConversationWithDetails | null;
  messages: Message[];
  unreadCount: number;
  isLoading: boolean;
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

const notSupported = 'Messaging endpoints are not available in local backend API yet';

export const useMessageStore = create<MessageState>((set) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  isLoading: false,

  fetchConversations: async (_userId: string) => {
    set({ conversations: [] });
  },

  fetchConversation: async (_conversationId: string) => {
    set({ currentConversation: null });
  },

  fetchMessages: async (_conversationId: string) => {
    set({ messages: [] });
  },

  sendMessage: async (_conversationId: string, _senderId: string, _content: string) => {
    return { success: false, error: notSupported };
  },

  startConversation: async (_buyerId: string, _sellerId: string, _listingId: string, _initialMessage?: string) => {
    return { success: false, error: notSupported };
  },

  markAsRead: async (_conversationId: string, _userId: string) => {},

  subscribeToMessages: (_conversationId: string) => () => {},

  subscribeToConversations: (_userId: string) => () => {},

  getUnreadCount: async (_userId: string) => {
    set({ unreadCount: 0 });
  },
}));

export default useMessageStore;
