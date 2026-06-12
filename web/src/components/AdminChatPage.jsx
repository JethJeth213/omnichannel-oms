import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function AdminChatPage({ onBack }) {
  const [conversations, setConversations] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState({})
  const messagesEndRef = useRef(null)

  // Load all conversations
  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoading(true)
    
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select(`
        user_id,
        users:user_id (
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading conversations:', error)
      setLoading(false)
      return
    }

    if (messagesData) {
      const uniqueUsers = []
      const seenIds = new Set()
      
      for (const msg of messagesData) {
        if (msg.users && !seenIds.has(msg.users.id)) {
          seenIds.add(msg.users.id)
          
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('message_text, created_at')
            .eq('user_id', msg.users.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          // Get unread count
          const { count: unread } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', msg.users.id)
            .eq('is_read', false)
            .neq('sender_type', 'admin')
          
          uniqueUsers.push({
            id: msg.users.id,
            full_name: msg.users.full_name,
            email: msg.users.email,
            last_message: lastMsg?.message_text || 'No messages',
            last_message_time: lastMsg?.created_at,
            unread_count: unread || 0
          })
        }
      }
      setConversations(uniqueUsers)
      
      const counts = {}
      uniqueUsers.forEach(u => { counts[u.id] = u.unread_count })
      setUnreadCounts(counts)
    }
    setLoading(false)
  }

  // Load messages for selected user
  const loadMessages = async (userId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error loading messages:', error)
    } else {
      setMessages(data || [])
      
      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .neq('sender_type', 'admin')
      
      setUnreadCounts(prev => ({ ...prev, [userId]: 0 }))
    }
  }

  const selectUser = (user) => {
    setSelectedUser(user)
    loadMessages(user.id)
  }

  // Update conversation last message without reloading everything
  const updateConversationLastMessage = (userId, messageText) => {
    setConversations(prev => prev.map(conv => 
      conv.id === userId 
        ? { ...conv, last_message: messageText, last_message_time: new Date().toISOString() }
        : conv
    ))
  }

  // Send message (NO PAGE RELOAD)
  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedUser) return

    setSending(true)
    
    // Create optimistic message (shows immediately)
    const optimisticMessage = {
      id: Date.now(),
      user_id: selectedUser.id,
      sender_type: 'admin',
      message_text: newMessage.trim(),
      created_at: new Date().toISOString(),
      is_read: true
    }
    
    // Add to messages immediately (optimistic update)
    setMessages(prev => [...prev, optimisticMessage])
    
    // Update conversation list
    updateConversationLastMessage(selectedUser.id, newMessage.trim())
    
    // Clear input
    setNewMessage('')
    
    // Send to database
    const { error } = await supabase
      .from('messages')
      .insert([{
        user_id: selectedUser.id,
        sender_type: 'admin',
        message_text: optimisticMessage.message_text,
        is_read: true
      }])

    if (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
    }
    
    setSending(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription for new messages (NO PAGE RELOAD)
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMsg = payload.new
          
          // Only process customer messages (not from admin)
          if (newMsg.sender_type !== 'admin') {
            // If this message is for the currently selected user, add to messages
            if (selectedUser && newMsg.user_id === selectedUser.id) {
              setMessages(prev => [...prev, newMsg])
              // Auto-scroll
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            }
            
            // Update conversation list with new message
            setConversations(prev => prev.map(conv => 
              conv.id === newMsg.user_id 
                ? { ...conv, last_message: newMsg.message_text, last_message_time: newMsg.created_at, unread_count: (conv.unread_count || 0) + 1 }
                : conv
            ))
            
            // Update unread count
            setUnreadCounts(prev => ({
              ...prev,
              [newMsg.user_id]: (prev[newMsg.user_id] || 0) + 1
            }))
            
            // Show notification
            toast.success(`📩 New message from customer`, {
              duration: 3000,
              position: 'top-right',
              icon: '💬',
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedUser])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow p-4 flex justify-between">
          <h1 className="text-xl font-bold text-orange-600">💬 Admin Chat</h1>
          <button onClick={onBack} className="bg-gray-500 text-white px-4 py-2 rounded">← Back</button>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-orange-600">💬 Admin Chat</h1>
            <p className="text-sm text-gray-500">Manage customer conversations</p>
          </div>
          <button
            onClick={onBack}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex h-[70vh] bg-white rounded-lg shadow overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 border-r flex flex-col">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-semibold">All Conversations</h3>
              <p className="text-sm text-gray-500">{conversations.length} customers</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No conversations yet</div>
              ) : (
                conversations.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => selectUser(user)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                      selectedUser?.id === user.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold">{user.full_name || user.email.split('@')[0]}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-sm text-gray-600 truncate mt-1">{user.last_message}</p>
                      </div>
                      {unreadCounts[user.id] > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-2 animate-bounce">
                          {unreadCounts[user.id]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {user.last_message_time ? new Date(user.last_message_time).toLocaleString() : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedUser ? (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="font-semibold text-lg">{selectedUser.full_name || selectedUser.email}</p>
                </div>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>

              {/* Messages - Real-time updates */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-gray-100">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'} animate-slideUp`}
                      style={{ animationDelay: `${index * 0.02}s` }}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-xl ${
                          msg.sender_type === 'admin'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-gray-200 text-gray-800 shadow-md'
                        }`}
                      >
                        <div className="text-sm break-words">{msg.message_text}</div>
                        <div className="text-xs opacity-50 mt-1 text-right">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all duration-200"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-orange-600 text-white px-6 py-2 rounded-xl hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending
                      </>
                    ) : (
                      <>
                        Send
                        <span>➤</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">💬</div>
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}