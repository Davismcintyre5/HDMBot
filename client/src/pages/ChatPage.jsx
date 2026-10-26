import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, UserPlus, Users, Phone, MessageSquare } from 'lucide-react'
import { getChats, getMessages, sendMessage } from '../api/chats'
import { listContacts } from '../api/contacts'
import ChatList from '../components/chat/ChatList'
import ChatWindow from '../components/chat/ChatWindow'
import ChatInput from '../components/chat/ChatInput'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import { useSocket } from '../hooks/useSocket'

export default function ChatPage() {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newChatMode, setNewChatMode] = useState('phone') // 'phone' | 'contacts'
  const [newPhone, setNewPhone] = useState('')
  const [newName, setNewName] = useState('')
  const [contacts, setContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const { toast } = useToast()
  const { connected } = useSocket()
  const location = useLocation()
  const contactFromNav = location.state

  useEffect(() => { loadChats() }, [])

  useEffect(() => {
    if (selectedChat) loadMessages(selectedChat.jid)
  }, [selectedChat])

  useEffect(() => {
    if (contactFromNav?.contactJid && chats.length > 0) {
      const jid = contactFromNav.contactJid
      const name = contactFromNav.contactName || jid.split('@')[0]
      const existing = chats.find(c => c.jid === jid)
      if (existing) {
        setSelectedChat(existing)
      } else {
        const newChat = { jid, name, last_message: '', timestamp: new Date().toISOString(), message_count: 0 }
        setChats(prev => [newChat, ...prev])
        setTimeout(() => setSelectedChat(newChat), 100)
        setMessages([])
      }
    }
  }, [contactFromNav, chats])

  const loadChats = useCallback(async () => {
    try {
      const { data } = await getChats()
      const chatData = data.data?.chats || data.chats || []
      setChats(Array.isArray(chatData) ? chatData : [])
    } catch {
      toast.error('Failed to load chats')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const loadMessages = async (jid) => {
    setMsgLoading(true)
    try {
      const { data } = await getMessages(jid)
      const msgData = data.data?.messages || data.messages || []
      setMessages(Array.isArray(msgData) ? msgData : [])
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setMsgLoading(false)
    }
  }

  const handleSend = async () => {
    if (!text.trim() || !selectedChat) return
    const msgText = text.trim()
    setText('')
    setMessages(prev => [...prev, {
      body: msgText,
      direction: 'out',
      timestamp: new Date().toISOString(),
      from: 'BOT'
    }])
    try {
      await sendMessage(selectedChat.jid, msgText)
    } catch {
      toast.error('Failed to send')
      loadMessages(selectedChat.jid)
    }
  }

  // ==================== START CHAT FROM PHONE ====================
  const startNewChat = () => {
    const phone = newPhone.replace(/[^0-9]/g, '')
    if (!phone || phone.length < 7) return toast.error('Enter a valid phone number')
    const jid = `${phone}@s.whatsapp.net`
    const name = newName || phone
    openChatWithJid(jid, name)
    setNewChatOpen(false)
    setNewPhone('')
    setNewName('')
  }

  // ==================== START CHAT FROM CONTACT ====================
  const startChatFromContact = (contact) => {
    const phone = contact.phoneNumber || contact.jid?.split('@')[0]
    const jid = contact.jid || `${phone}@s.whatsapp.net`
    const name = contact.pushName || contact.displayName || phone
    openChatWithJid(jid, name)
    setNewChatOpen(false)
  }

  const openChatWithJid = (jid, name) => {
    setChats(prev => {
      const exists = prev.find(c => c.jid === jid)
      if (exists) {
        setTimeout(() => setSelectedChat(exists), 100)
        return prev
      }
      const newChat = { jid, name, last_message: '', timestamp: new Date().toISOString(), message_count: 0 }
      setTimeout(() => setSelectedChat(newChat), 100)
      return [newChat, ...prev]
    })
    setMessages([])
    toast.success(`Chat with ${name} started!`)
  }

  // ==================== LOAD CONTACTS FOR PICKER ====================
  const openNewChatModal = async () => {
    setNewChatOpen(true)
    setNewChatMode('phone')
    try {
      const { data } = await listContacts()
      setContacts(data.data?.contacts || data.contacts || [])
    } catch {}
  }

  const filteredContacts = contacts.filter(c =>
    (c.pushName || c.phoneNumber || c.displayName || '').toLowerCase().includes(contactSearch.toLowerCase())
  )

  const filteredChats = chats.filter(c =>
    (c.name || c.jid || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-6">
      {/* Chat List Sidebar */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex gap-2">
          <Button variant="primary" size="sm" icon={Plus} onClick={openNewChatModal} className="flex-1">
            New Chat
          </Button>
        </div>
        <ChatList
          chats={filteredChats}
          selectedChat={selectedChat}
          onSelect={setSelectedChat}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        <ChatWindow
          chat={selectedChat}
          messages={messages}
          loading={msgLoading}
          connected={connected}
        />
        {selectedChat && (
          <ChatInput
            value={text}
            onChange={setText}
            onSend={handleSend}
            disabled={!connected}
          />
        )}
      </div>

      {/* New Chat Modal */}
      <Modal open={newChatOpen} onClose={() => setNewChatOpen(false)} title="New Chat" size="lg">
        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <Button 
            variant={newChatMode === 'phone' ? 'primary' : 'secondary'} 
            size="sm" 
            icon={Phone}
            onClick={() => setNewChatMode('phone')}
          >
            Phone Number
          </Button>
          <Button 
            variant={newChatMode === 'contacts' ? 'primary' : 'secondary'} 
            size="sm" 
            icon={Users}
            onClick={() => setNewChatMode('contacts')}
          >
            Contacts
          </Button>
        </div>

        {/* Phone Mode */}
        {newChatMode === 'phone' && (
          <div className="space-y-4">
            <div className="text-center text-gray-400 mb-2">
              <UserPlus size={48} className="mx-auto mb-2" />
              <p className="text-sm">Enter a phone number to start chatting</p>
            </div>
            <Input
              label="Phone Number *"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="254712345678"
            />
            <Input
              label="Name (optional)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="John Doe"
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setNewChatOpen(false)}>Cancel</Button>
              <Button icon={Plus} onClick={startNewChat}>Start Chat</Button>
            </div>
          </div>
        )}

        {/* Contacts Mode */}
        {newChatMode === 'contacts' && (
          <div className="space-y-3">
            <Input
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              icon={Users}
            />
            <div className="max-h-64 overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users size={32} className="mx-auto mb-2" />
                  <p className="text-sm">No contacts found</p>
                  <p className="text-xs">Add contacts from the Contacts page</p>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact._id || contact.jid}
                    onClick={() => startChatFromContact(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {(contact.pushName || contact.phoneNumber || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {contact.pushName || contact.displayName || contact.phoneNumber || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{contact.phoneNumber || contact.jid?.split('@')[0]}</p>
                    </div>
                    <MessageSquare size={16} className="text-primary-500 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setNewChatOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}