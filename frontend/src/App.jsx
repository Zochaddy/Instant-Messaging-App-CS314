import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import './App.css'

function App() {
  const API_BASE_URL = 'https://pretorial-portliest-vertie.ngrok-free.dev'

  // Avoid the ngrok warning page and allow cookie-based auth.
  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(options.headers || {}),
      },
      ...options,
    })

    const contentType = res.headers.get('content-type') || ''
    const data = contentType.includes('application/json') ? await res.json() : await res.text()

    if (!res.ok) {
      const message =
        (data && typeof data === 'object' && (data.message || data.error)) ||
        (typeof data === 'string' && data) ||
        'Request failed'
      throw new Error(message)
    }

    return data
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup'
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [error, setError] = useState('')
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [user, setUser] = useState(null)
  const [socket, setSocket] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [chats, setChats] = useState([])
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [messagesByChat, setMessagesByChat] = useState({})
  const [draftMessage, setDraftMessage] = useState('')

  // On page load, ask backend if we already have a valid session.
  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const userInfo = await api('/api/auth/userinfo', { method: 'GET' })
        if (cancelled) return
        if (userInfo && typeof userInfo === 'object') {
          setUser(userInfo)
          const identity =
            userInfo.email || userInfo.username || userInfo.name || userInfo.firstName
              ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() ||
                userInfo.email ||
                userInfo.username ||
                userInfo.name
              : ''
          setEmail(String(identity))
        }
        setIsLoggedIn(true)
      } catch {
        if (cancelled) return
        setIsLoggedIn(false)
        setUser(null)
      } finally {
        if (cancelled) return
        setIsCheckingSession(false)
      }
    }

    loadSession()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter an email and password.')
      return
    }

    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      // After login, fetch user details (so UI shows correct email/username and id).
      const userInfo = await api('/api/auth/userinfo', { method: 'GET' })
      if (userInfo && typeof userInfo === 'object') {
        setUser(userInfo)
        const identity =
          userInfo.email || userInfo.username || userInfo.name || userInfo.firstName
            ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() ||
              userInfo.email ||
              userInfo.username ||
              userInfo.name
            : email.trim()
        setEmail(String(identity))
      } else {
        setEmail(email.trim())
      }
      setIsLoggedIn(true)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter an email and password.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      // Most backends accept { email, password }. If yours needs extra fields,
      // the error message will tell us what to add.
      await api('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      // Common behavior: signup either creates an account only OR also logs you in.
      // We'll attempt to read userinfo; if it fails, we send you to the login form.
      try {
        const userInfo = await api('/api/auth/userinfo', { method: 'GET' })
        if (userInfo && typeof userInfo === 'object') {
          setUser(userInfo)
          const identity =
            userInfo.email || userInfo.username || userInfo.name || userInfo.firstName
              ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() ||
                userInfo.email ||
                userInfo.username ||
                userInfo.name
              : email.trim()
          setEmail(String(identity))
        } else {
          setEmail(email.trim())
        }
        setIsLoggedIn(true)
        setPassword('')
        setConfirmPassword('')
      } catch {
        setAuthMode('login')
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    }
  }

  // Socket.IO: keep a live connection for real-time DMs.
  useEffect(() => {
    if (!isLoggedIn || !user || !user.id) {
      return
    }

    const socketInstance = io(API_BASE_URL, {
      withCredentials: true,
      extraHeaders: {
        'ngrok-skip-browser-warning': 'true',
      },
    })

    function getUserId(value) {
      if (!value) return ''
      if (typeof value === 'string') return value
      if (typeof value === 'object') {
        return value.id || value._id || value.value || ''
      }
      return ''
    }

    socketInstance.on('receiveMessage', (message) => {
      const senderId = getUserId(message.sender)
      const recipientId = getUserId(message.recipient)
      if (!senderId || !recipientId) return

      const myId = user.id
      const fromMe = senderId === myId
      const otherId = fromMe ? recipientId : senderId

      const mapped = {
        id: message.id || message._id || String(Date.now() + Math.random()),
        sender: fromMe ? 'me' : 'them',
        text: message.content,
        timestamp: message.timestamp,
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [otherId]: [...(prev[otherId] || []), mapped],
      }))

      // Ensure the chat appears in the sidebar if it doesn't already.
      setChats((prev) => {
        if (prev.some((c) => c.id === otherId)) return prev

        const otherUser = fromMe ? message.recipient : message.sender
        const displayName =
          otherUser &&
          (otherUser.firstName || otherUser.lastName
            ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim()
            : '')
        const email = otherUser && otherUser.email
        const name = displayName || email || 'Unknown user'

        return [...prev, { id: otherId, name, email }]
      })
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
      setSocket(null)
    }
  }, [isLoggedIn, user?.id])

  // Load conversation list from server so inbox shows all DMs (including when someone messaged you first).
  useEffect(() => {
    if (!isLoggedIn || !user) return

    let cancelled = false

    async function loadChatList() {
      try {
        const result = await api('/api/contacts/get-contacts-for-list', { method: 'GET' })
        if (cancelled) return

        const list =
          result && typeof result === 'object' && Array.isArray(result.contacts)
            ? result.contacts
            : []

        const mapped = list
          .map((c) => {
            const id = c._id || c.id
            const name =
              (c.firstName || c.lastName
                ? `${c.firstName || ''} ${c.lastName || ''}`.trim()
                : '') || c.email || 'Unknown'
            return { id, name, email: c.email }
          })
          .filter((c) => c.id)

        setChats((prev) => {
          const serverIds = new Set(mapped.map((c) => c.id))
          const extra = prev.filter((c) => !serverIds.has(c.id))
          return [...mapped, ...extra]
        })
      } catch (err) {
        if (!cancelled) console.error('Failed to load chat list', err)
      }
    }

    loadChatList()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, user])

  async function handleLogout() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } finally {
      setIsLoggedIn(false)
      setPassword('')
      setEmail('')
      setUser(null)
      setChats([])
      setMessagesByChat({})
      setSelectedChatId(null)
      setDraftMessage('')
      setIsSidebarOpen(false)
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
    }
  }

  async function loadMessagesForContact(contactId) {
    if (!contactId || !user || !user.id) return
    try {
      const result = await api('/api/messages/get-messages', {
        method: 'POST',
        body: JSON.stringify({ id: contactId }),
      })

      const messages =
        result && typeof result === 'object' && Array.isArray(result.messages)
          ? result.messages
          : []

      setMessagesByChat((prev) => ({
        ...prev,
        [contactId]: messages.map((m) => {
          const senderId =
            typeof m.sender === 'string'
              ? m.sender
              : m.sender && typeof m.sender === 'object'
                ? m.sender.id || m.sender._id
                : ''
          const fromMe = senderId && user && senderId === user.id
          return {
            id: m._id || m.id || String(Date.now() + Math.random()),
            sender: fromMe ? 'me' : 'them',
            text: m.content,
            timestamp: m.timestamp,
          }
        }),
      }))
    } catch (err) {
      // For now, just log; UI still works without history.
      console.error('Failed to load messages', err)
    }
  }

  async function handleCreateChat() {
    const input = window.prompt('Enter the email (or name) of the person you want to chat with')
    if (!input) return
    const searchTerm = input.trim()
    if (!searchTerm) return

    try {
      const result = await api('/api/contacts/search', {
        method: 'POST',
        body: JSON.stringify({ searchTerm }),
      })

      const foundContacts =
        result && typeof result === 'object' && Array.isArray(result.contacts)
          ? result.contacts
          : []

      if (foundContacts.length === 0) {
        window.alert('No user found with that email or name.')
        return
      }

      const contact = foundContacts[0]
      const contactId = contact && (contact._id || contact.id)
      if (!contactId) {
        window.alert('Selected contact is missing an id.')
        return
      }

      const fullName =
        (contact.firstName || contact.lastName
          ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
          : '') || contact.email || 'Unknown user'

      const chat = { id: contactId, name: fullName, email: contact.email }

      setChats((prev) => {
        if (prev.some((c) => c.id === contactId)) return prev
        return [...prev, chat]
      })

      setSelectedChatId(contactId)
      await loadMessagesForContact(contactId)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to search for that contact.')
    }
  }

  async function handleSelectChat(id) {
    setSelectedChatId(id)
    if (!messagesByChat[id] || messagesByChat[id].length === 0) {
      await loadMessagesForContact(id)
    }
  }

  function handleSendMessage(e) {
    e.preventDefault()
    if (!selectedChatId || !draftMessage.trim() || !user) return
    const text = draftMessage.trim()

    const message = {
      id: String(Date.now() + Math.random()),
      sender: 'me',
      text,
      timestamp: new Date().toISOString(),
    }

    setMessagesByChat((prev) => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), message],
    }))
    setDraftMessage('')

    if (socket) {
      socket.emit('sendMessage', {
        sender: user.id,
        recipient: selectedChatId,
        content: text,
        messageType: 'text',
      })
    }
  }

  if (isCheckingSession) {
    return (
      <div className="App">
        <h1>Instant Messaging App</h1>
        <p>Checking session…</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="App">
        <h1>Instant Messaging App</h1>
        <div className="Card">
          <h2 className="AuthTitle">Welcome</h2>

          <div className="AuthBubble">
            <div className="AuthTabs">
              <button
                type="button"
                className={authMode === 'login' ? 'Tab active' : 'Tab'}
                onClick={() => {
                  setError('')
                  setPassword('')
                  setConfirmPassword('')
                  setAuthMode('login')
                }}
              >
                Log in
              </button>

              <button
                type="button"
                className={authMode === 'signup' ? 'Tab active' : 'Tab'}
                onClick={() => {
                  setError('')
                  setPassword('')
                  setConfirmPassword('')
                  setAuthMode('signup')
                }}
              >
                Register
              </button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="Form">
              <label className="Label">
                Email
                <input
                  className="Input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>

              <label className="Label">
                Password
                <input
                  className="Input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>

              {authMode === 'signup' ? (
                <label className="Label">
                  Confirm password
                  <input
                    className="Input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
              ) : null}

              {error ? <p className="Error">{error}</p> : null}

              <button className="Button" type="submit">
                {authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="App AppLoggedIn">
      <div className={`ChatLayout ${isSidebarOpen ? 'ChatLayout--sidebarOpen' : ''}`}>
        <header className="ChatHeader">
          <button
            type="button"
            className="IconButton IconButtonGhost"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open chat list"
          >
            ☰
          </button>

          <div className="ChatHeaderSpacer" />

          <div className="AppHeaderRight">
            <button className="Button Secondary" type="button" onClick={handleLogout}>
              Log out
            </button>
            <button
              type="button"
              className="ProfileButton"
              aria-label="Open profile"
              onClick={() => {}}
            >
              <span className="ProfileAvatar">
                {email ? String(email).charAt(0).toUpperCase() : '?'}
              </span>
            </button>
          </div>
        </header>

        <main className="ChatMain">
          <div className="ChatMessages">
            {!selectedChatId ? (
              <p className="ChatPlaceholder">Select a chat or create a new one.</p>
            ) : (messagesByChat[selectedChatId] || []).length === 0 ? (
              <p className="ChatPlaceholder">No messages yet. Say hi!</p>
            ) : (
              <ul className="MessageList">
                {(messagesByChat[selectedChatId] || []).map((message) => (
                  <li
                    key={message.id}
                    className={
                      message.sender === 'me'
                        ? 'Message Message--outgoing'
                        : 'Message Message--incoming'
                    }
                  >
                    <div className="MessageBubble">{message.text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="ChatInputBar" onSubmit={handleSendMessage}>
            <input
              className="ChatInput"
              type="text"
              placeholder={
                selectedChatId ? 'Message...' : 'Create or select a chat to start messaging'
              }
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              disabled={!selectedChatId}
            />
            <button
              className="Button ChatSendButton"
              type="submit"
              disabled={!selectedChatId || !draftMessage.trim()}
            >
              Send
            </button>
          </form>
        </main>

        {isSidebarOpen && (
          <aside className="SidebarOverlay">
            <div className="SidebarHeader">
              <h2 className="SidebarTitle">Chats</h2>
              <button
                type="button"
                className="IconButton"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Close chat list"
              >
                ✕
              </button>
            </div>
            <div className="SidebarContent">
              {chats.length === 0 ? (
                <div className="ChatListEmpty">
                  <p className="SidebarEmpty">No conversations yet.</p>
                  <button
                    type="button"
                    className="Button NewChatButton"
                    onClick={handleCreateChat}
                  >
                    New chat
                  </button>
                </div>
              ) : (
                <div className="ChatListWrapper">
                  <ul className="ChatList">
                    {chats.map((chat) => (
                      <li
                        key={chat.id}
                        className={
                          chat.id === selectedChatId
                            ? 'ChatListItem ChatListItem--active'
                            : 'ChatListItem'
                        }
                      >
                        <button
                          type="button"
                          className="ChatListItemButton"
                          onClick={() => handleSelectChat(chat.id)}
                        >
                          <span className="ChatListItemAvatar">
                            {chat.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="ChatListItemName">{chat.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="Button NewChatButton"
                    onClick={handleCreateChat}
                  >
                    New chat
                  </button>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}


export default App
