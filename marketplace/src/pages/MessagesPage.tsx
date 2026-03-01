import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMessageStore } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Image as ImageIcon,
  Search,
  MessageCircle,
  Check,
  CheckCheck,
} from 'lucide-react';
import { cn, formatRelativeTime, formatPrice } from '@/lib/utils';
import type { ConversationWithDetails, Message } from '@/types/database';

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    fetchConversations,
    fetchConversation,
    fetchMessages,
    sendMessage,
    markAsRead,
    subscribeToMessages,
    subscribeToConversations,
  } = useMessageStore();

  const [messageInput, setMessageInput] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchConversations();
      const unsubscribe = subscribeToConversations(user.id);
      return () => unsubscribe();
    }
  }, [isAuthenticated, user, navigate, fetchConversations, subscribeToConversations]);

  React.useEffect(() => {
    if (conversationId) {
      fetchConversation(conversationId);
      fetchMessages(conversationId);
      if (user) {
        markAsRead(conversationId);
      }
      const unsubscribe = subscribeToMessages(conversationId);
      return () => unsubscribe();
    }
  }, [conversationId, user, fetchConversation, fetchMessages, markAsRead, subscribeToMessages]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversationId || !user) return;

    const content = messageInput.trim();
    setMessageInput('');

    await sendMessage(conversationId, content);
  };

  const getOtherUser = (conv: ConversationWithDetails) => {
    if (!user) return null;
    return conv.buyer_id === user.id ? conv.seller : conv.buyer;
  };

  const getUnreadCount = (conv: ConversationWithDetails) => {
    if (!user) return 0;
    return conv.buyer_id === user.id ? conv.buyer_unread_count : conv.seller_unread_count;
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const otherUser = getOtherUser(conv);
    const searchLower = searchQuery.toLowerCase();
    return (
      otherUser?.display_name?.toLowerCase().includes(searchLower) ||
      otherUser?.username?.toLowerCase().includes(searchLower) ||
      conv.listing?.title?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-gray-50">
      {/* Conversations List */}
      <div
        className={cn(
          'w-full md:w-96 bg-white border-r border-gray-200 flex flex-col',
          conversationId ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-gray-300 transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500">No messages yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Start a conversation by contacting a seller
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherUser = getOtherUser(conv);
              const unreadCount = getUnreadCount(conv);
              const listingImage = conv.listing?.images?.find((img: { is_primary: boolean }) => img.is_primary)?.url ||
                conv.listing?.images?.[0]?.url;

              return (
                <Link
                  key={conv.id}
                  to={`/messages/${conv.id}`}
                  className={cn(
                    'flex items-center p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    conversationId === conv.id && 'bg-red-50 hover:bg-red-50'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {otherUser?.avatar_url ? (
                      <img
                        src={otherUser.avatar_url}
                        alt={otherUser.display_name || ''}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 ml-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900 truncate">
                        {otherUser?.display_name || otherUser?.username}
                      </p>
                      <span className="text-xs text-gray-500">
                        {conv.last_message_at && formatRelativeTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className={cn(
                      'text-sm truncate mt-0.5',
                      unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                    )}>
                      {conv.last_message_preview || 'No messages yet'}
                    </p>
                    {conv.listing && (
                      <div className="flex items-center space-x-2 mt-1">
                        {listingImage && (
                          <img
                            src={listingImage}
                            alt=""
                            className="w-6 h-6 rounded object-cover"
                          />
                        )}
                        <span className="text-xs text-gray-400 truncate">
                          {conv.listing.title}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {conversationId && currentConversation ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/messages')}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {(() => {
                const otherUser = getOtherUser(currentConversation);
                return (
                  <Link to={`/profile/${otherUser?.username}`} className="flex items-center space-x-3">
                    {otherUser?.avatar_url ? (
                      <img
                        src={otherUser.avatar_url}
                        alt={otherUser.display_name || ''}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {otherUser?.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {otherUser?.display_name || otherUser?.username}
                      </p>
                      <p className="text-sm text-gray-500">@{otherUser?.username}</p>
                    </div>
                  </Link>
                );
              })()}
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Listing Context */}
          {currentConversation.listing && (
            <Link
              to={`/listing/${currentConversation.listing.slug}`}
              className="flex items-center space-x-3 p-3 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {currentConversation.listing.images?.[0] && (
                <img
                  src={currentConversation.listing.images[0].url}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {currentConversation.listing.title}
                </p>
                <p className="text-red-600 font-semibold">
                  {formatPrice(currentConversation.listing.price)}
                </p>
              </div>
            </Link>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id === user?.id;
              const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== msg.sender_id);

              return (
                <div
                  key={msg.id}
                  className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                >
                  {!isOwn && showAvatar && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 mr-2" />
                  )}
                  {!isOwn && !showAvatar && <div className="w-8 mr-2" />}

                  <div
                    className={cn(
                      'max-w-[70%] px-4 py-2 rounded-2xl',
                      isOwn
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className={cn(
                      'flex items-center justify-end space-x-1 mt-1 text-xs',
                      isOwn ? 'text-white/70' : 'text-gray-500'
                    )}>
                      <span>{formatRelativeTime(msg.created_at)}</span>
                      {isOwn && (
                        msg.is_read ? (
                          <CheckCheck className="w-4 h-4" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <ImageIcon className="w-6 h-6" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-xl focus:bg-white focus:border-gray-300 transition-colors"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="p-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl hover:from-red-600 hover:to-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Messages</h2>
            <p className="text-gray-500">Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
