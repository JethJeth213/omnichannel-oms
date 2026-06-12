import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ChatBox({ userId, userName, userRole, orderId = null }) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)

  // Load messages
  useEffect(() => {
    if (!userId) {
      console.log('No userId provided to ChatBox')
      return
    }

    const loadMessages = async () => {
      setLoading(true)
      
      let query = supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      const { data, error } = await query

      if (error) {
        console.error('Error loading messages:', error)
        toast.error('Failed to load messages')
      } else {
        console.log('Messages loaded:', data?.length || 0)
        setMessages(data || [])
      }
      setLoading(false)
    }

    loadMessages()
  }, [userId])

  // Load unread count
  useEffect(() => {
    if (!userId) return

    const loadUnreadCount = async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('sender_type', 'admin')
      
      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    loadUnreadCount()
  }, [userId, messages])

  // Real-time subscription
  useEffect(() => {
    if (!userId) return

    console.log('Setting up realtime subscription for user:', userId)

    const channel = supabase
      .channel(`chat-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New message received:', payload.new)
          setMessages(prev => [...prev, payload.new])

          // Only count admin messages as unread
          if (payload.new.sender_type === 'admin' && !isOpen) {
            setUnreadCount(prev => prev + 1)
            // Show toast notification
            toast.success('📩 New message from Support', {
              duration: 4000,
              position: 'top-right',
              icon: '💬',
            })
          }

          // Auto-scroll if chat is open
          if (isOpen) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, 100)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, isOpen])

  // Auto-scroll when messages change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Mark messages as read when chat opens
  const openChat = async () => {
    setIsOpen(true)
    
    if (unreadCount > 0) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('sender_type', 'admin')
      setUnreadCount(0)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) {
      console.log('Cannot send: empty message or already sending')
      return
    }

    if (!userId) {
      console.error('Cannot send: No userId')
      toast.error('User ID not found')
      return
    }

    setSending(true)
    
    const messageData = {
      user_id: userId,
      order_id: orderId || null,
      sender_type: 'customer',
      message_text: newMessage.trim(),
      is_read: false
    }

    console.log('Sending message:', messageData)

    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select()

    if (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message: ' + error.message)
    } else {
      console.log('Message sent successfully:', data)
      setNewMessage('')
      // Message will appear via realtime subscription
    }
    setSending(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Don't show chat for admins (they have chat in dashboard)
  if (userRole === 'admin') {
    return null
  }

  if (!userId) {
    return null
  }

  // Chat button (floating) with notification dot and animations
  if (!isOpen) {
    return (
      <button
        onClick={openChat}
        className="fixed bottom-20 md:bottom-24 right-4 md:right-6 bg-orange-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:bg-orange-700 transition-all duration-300 transform hover:scale-110 active:scale-95 z-50 group"
      >
        <span className="text-xl md:text-2xl group-hover:rotate-12 transition-transform duration-300">💬</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    )
  }

  // Chat window with animations
  return (
    <div className="fixed bottom-20 md:bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 h-[70vh] md:h-96 bg-white rounded-xl shadow-2xl flex flex-col z-50 border overflow-hidden animate-slideUp">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white p-3 md:p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <div>
            <h3 className="font-semibold text-sm md:text-base">Customer Support</h3>
            <p className="text-xs opacity-90">Online</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-200 transition-transform hover:rotate-90 duration-300 text-xl"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100">
        {loading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8 animate-fadeIn">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'admin' ? 'justify-start' : 'justify-end'} animate-slideUp`}
              style={{ animationDelay: `${index * 0.02}s` }}
            >
              <div
                className={`max-w-[80%] p-2 md:p-3 rounded-xl ${
                  msg.sender_type === 'admin'
                    ? 'bg-white text-gray-800 shadow-md'
                    : 'bg-orange-500 text-white shadow-md'
                }`}
              >
                <div className="text-xs opacity-75 mb-1">
                  {msg.sender_type === 'admin' ? '🛡️ Support' : `👤 ${userName || 'You'}`}
                </div>
                <div className="text-sm md:text-base break-words">{msg.message_text}</div>
                <div className="text-xs opacity-50 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator (Optional) */}
      {sending && (
        <div className="px-3 md:px-4 py-1">
          <div className="typing-indicator flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 md:p-4 border-t bg-white">
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none transition-all duration-200 text-sm md:text-base"
            rows="2"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="bg-orange-600 text-white px-4 md:px-6 py-2 rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <span>➤</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}