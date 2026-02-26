import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /conversations - Get all conversations for current user
router.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select(`
        *,
        listing:listings(id, title, slug, price, images:listing_images(url, is_primary)),
        buyer:users!conversations_buyer_id_fkey(id, username, display_name, avatar_url),
        seller:users!conversations_seller_id_fkey(id, username, display_name, avatar_url)
      `)
      .or(`buyer_id.eq.${req.user!.id},seller_id.eq.${req.user!.id}`)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('Conversations error:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    // Filter out deleted conversations for the user
    const filtered = (conversations || []).filter((conv: any) => {
      if (req.user!.id === conv.buyer_id && conv.buyer_deleted) return false;
      if (req.user!.id === conv.seller_id && conv.seller_deleted) return false;
      return true;
    });

    res.json({ conversations: filtered });
  } catch (error) {
    console.error('Conversations error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /conversations/:id - Get messages in a conversation
router.get('/conversations/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Check if user is part of the conversation
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .or(`buyer_id.eq.${req.user!.id},seller_id.eq.${req.user!.id}`)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('conversation_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('Messages error:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Mark messages as read
    await supabaseAdmin
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .neq('sender_id', req.user!.id)
      .eq('is_read', false);

    // Update unread count
    const isBuyer = conversation.buyer_id === req.user!.id;
    await supabaseAdmin
      .from('conversations')
      .update({
        buyer_unread_count: isBuyer ? 0 : conversation.buyer_unread_count,
        seller_unread_count: !isBuyer ? 0 : conversation.seller_unread_count,
      })
      .eq('id', id);

    res.json({
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// POST /conversations - Start a new conversation
router.post('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { listing_id, seller_id, initial_message } = req.body;

    if (!listing_id || !seller_id) {
      return res.status(400).json({ error: 'Listing ID and seller ID are required' });
    }

    // Can't message yourself
    if (seller_id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Check if conversation already exists
    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('listing_id', listing_id)
      .eq('buyer_id', req.user!.id)
      .eq('seller_id', seller_id)
      .single();

    if (existing) {
      // Send message to existing conversation
      const { data: message } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: existing.id,
          sender_id: req.user!.id,
          content: initial_message,
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url)
        `)
        .single();

      // Update conversation
      await supabaseAdmin
        .from('conversations')
        .update({
          last_message_id: message.id,
          last_message_at: new Date().toISOString(),
          last_message_preview: initial_message?.substring(0, 100),
          seller_unread_count: existing.seller_unread_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      return res.json({ conversation: existing, message });
    }

    // Create new conversation
    const { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        listing_id,
        buyer_id: req.user!.id,
        seller_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Create conversation error:', error);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }

    // Send initial message if provided
    let message = null;
    if (initial_message) {
      const { data: newMessage } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: req.user!.id,
          content: initial_message,
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url)
        `)
        .single();

      message = newMessage;

      // Update conversation with last message
      await supabaseAdmin
        .from('conversations')
        .update({
          last_message_id: newMessage.id,
          last_message_at: new Date().toISOString(),
          last_message_preview: initial_message.substring(0, 100),
          seller_unread_count: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);
    }

    res.status(201).json({ conversation, message });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// POST /conversations/:id/messages - Send a message
router.post('/conversations/:id/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content, attachment_url, attachment_type } = req.body;

    if (!content && !attachment_url) {
      return res.status(400).json({ error: 'Message content or attachment is required' });
    }

    // Check if user is part of the conversation
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .or(`buyer_id.eq.${req.user!.id},seller_id.eq.${req.user!.id}`)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Create message
    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: req.user!.id,
        content,
        attachment_url,
        attachment_type,
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url)
      `)
      .single();

    if (error) {
      console.error('Send message error:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    // Update conversation
    const isBuyer = conversation.buyer_id === req.user!.id;
    await supabaseAdmin
      .from('conversations')
      .update({
        last_message_id: message.id,
        last_message_at: new Date().toISOString(),
        last_message_preview: content?.substring(0, 100),
        buyer_unread_count: isBuyer ? conversation.buyer_unread_count : conversation.buyer_unread_count + 1,
        seller_unread_count: !isBuyer ? conversation.seller_unread_count : conversation.seller_unread_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Update listing message count
    if (conversation.listing_id) {
      await supabaseAdmin
        .from('listings')
        .update({ messages_count: supabaseAdmin.raw('messages_count + 1') })
        .eq('id', conversation.listing_id);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// DELETE /conversations/:id - Delete (hide) conversation
router.delete('/conversations/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is part of the conversation
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .or(`buyer_id.eq.${req.user!.id},seller_id.eq.${req.user!.id}`)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isBuyer = conversation.buyer_id === req.user!.id;

    // Mark as deleted for this user
    const updateField = isBuyer ? 'buyer_deleted' : 'seller_deleted';
    await supabaseAdmin
      .from('conversations')
      .update({ [updateField]: true })
      .eq('id', id);

    // If both users deleted, mark conversation inactive
    const { data: updated } = await supabaseAdmin
      .from('conversations')
      .select('buyer_deleted, seller_deleted')
      .eq('id', id)
      .single();

    if (updated?.buyer_deleted && updated?.seller_deleted) {
      await supabaseAdmin
        .from('conversations')
        .update({ is_active: false })
        .eq('id', id);
    }

    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /conversations/unread/count - Get unread message count
router.get('/conversations/unread/count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('buyer_unread_count, seller_unread_count')
      .or(`buyer_id.eq.${req.user!.id},seller_id.eq.${req.user!.id}`)
      .eq('is_active', true);

    let totalUnread = 0;
    (conversations || []).forEach((conv: any) => {
      if (conv.buyer_id === req.user!.id) {
        totalUnread += conv.buyer_unread_count || 0;
      } else {
        totalUnread += conv.seller_unread_count || 0;
      }
    });

    res.json({ unread_count: totalUnread });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

export { router as messagesRouter };
