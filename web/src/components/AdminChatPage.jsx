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
  const messagesEndRef = useRef(null)

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
          uniqueUsers.push({
            id: msg.users.id,
            full_name: msg.users.full_name,
            email: msg.users.email
          })
        }
      }
      setConversations(uniqueUsers)
    }
    setLoading(false)
  }

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
    }
  }

  const selectUser = (user) => {
    setSelectedUser(user)
    loadMessages(user.id)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedUser) return

    setSending(true)
    
    const { error } = await supabase
      .from('messages')
      .insert([{
        user_id: selectedUser.id,
        sender_type: 'admin',
        message_text: newMessage.trim(),
        is_read: true
      }])

    if (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } else {
      setNewMessage('')
      // Refresh messages after sending
      if (selectedUser) {
        loadMessages(selectedUser.id)
      }
    }
    setSending(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (selectedUser && payload.new.user_id === selectedUser.id) {
          setMessages(prev => [...prev, payload.new])
        }
        // Refresh conversation list
        loadConversations()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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
                    <p className="font-semibold">{user.full_name || user.email.split('@')[0]}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedUser ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 bg-gray-50 border-b">
                <p className="font-semibold text-lg">{selectedUser.full_name || selectedUser.email}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender_type === 'admin' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        <div className="text-sm break-words">{msg.message_text}</div>
                        <div className="text-xs opacity-50 mt-1">{new Date(msg.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your reply..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  )
}