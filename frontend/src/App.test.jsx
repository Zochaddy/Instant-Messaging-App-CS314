import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock socket.io - store handlers so we can trigger receiveMessage, connect, etc.
let mockSocketHandlers = {}
const mockSocket = {
  on: jest.fn((event, cb) => {
    mockSocketHandlers[event] = cb
    return mockSocket
  }),
  emit: jest.fn(),
  disconnect: jest.fn(),
  _trigger: (event, ...args) => mockSocketHandlers[event]?.(...args),
}
jest.mock('socket.io-client', () => ({
  io: () => mockSocket,
}))

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
}

function mockFetchLoggedOut() {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/auth/userinfo')) {
      return Promise.resolve({
        ok: false,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      })
    }
    return Promise.reject(new Error('Unexpected fetch'))
  })
}

function mockFetchLoggedIn(overrides = {}) {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/auth/userinfo')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockUser),
      })
    }
    if (url.includes('/api/auth/logout')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      })
    }
    if (url.includes('/api/contacts/get-contacts-for-list')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ contacts: overrides.contacts ?? [] }),
      })
    }
    if (url.includes('/api/contacts/search')) {
      const contacts = overrides.searchContacts ?? []
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ contacts }),
      })
    }
    if (url.includes('/api/contacts/delete-dm/')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      })
    }
    if (url.includes('/api/auth/update-profile')) {
      const response = overrides.updateProfileResponse ?? { user: { ...mockUser, firstName: 'Updated', lastName: 'Name' } }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(response),
      })
    }
    if (url.includes('/api/messages/get-messages')) {
      const messages = overrides.messages ?? []
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ messages }),
      })
    }
    return Promise.reject(new Error('Unexpected fetch: ' + url))
  })
}

function mockFetchForLogin() {
  let userinfoCalls = 0
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/auth/userinfo')) {
      userinfoCalls++
      if (userinfoCalls === 1) {
        return Promise.resolve({
          ok: false,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockUser),
      })
    }
    if (url.includes('/api/auth/login')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      })
    }
    if (url.includes('/api/contacts/get-contacts-for-list')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ contacts: [] }),
      })
    }
    return Promise.reject(new Error('Unexpected fetch: ' + url))
  })
}

function mockFetchForSignup() {
  let userinfoCalls = 0
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/auth/userinfo')) {
      userinfoCalls++
      if (userinfoCalls === 1) {
        return Promise.resolve({
          ok: false,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockUser),
      })
    }
    if (url.includes('/api/auth/signup')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({}),
      })
    }
    if (url.includes('/api/contacts/get-contacts-for-list')) {
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ contacts: [] }),
      })
    }
    return Promise.reject(new Error('Unexpected fetch: ' + url))
  })
}

describe('App', () => {
  beforeEach(() => {
    mockFetchLoggedOut()
  })

  it('shows login form when not authenticated', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
  })

  it('has Login and Register tabs', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument()
    })

    expect(screen.getAllByRole('button', { name: /Log in/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('shows signup fields when Register tab is selected', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Register/i }))

    expect(screen.getByLabelText(/First name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Last name/i)).toBeInTheDocument()
  })

  it('shows error when login submitted with empty fields', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    })

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Please enter an email and password/i)).toBeInTheDocument()
    })
  })

  it('displays Instant Messaging App title', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Instant Messaging App')).toBeInTheDocument()
    })
  })

  it('shows error when signup has password mismatch', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Register/i }))

    await userEvent.type(screen.getByLabelText(/First name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/Last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/Email/i), 'jane@example.com')
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'secret123')
    await userEvent.type(screen.getByLabelText(/Confirm password/i), 'different')

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('shows error when signup has missing first and last name', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Register/i }))
    await userEvent.type(screen.getByLabelText(/Email/i), 'jane@example.com')
    const passwordInputs = screen.getAllByLabelText(/Password/i)
    await userEvent.type(passwordInputs[0], 'secret123')
    const form = screen.getByRole('button', { name: /Create account/i }).closest('form')
    form.noValidate = true
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText(/Please enter your first and last name/i)).toBeInTheDocument()
    })
  })

  it('logs in successfully and shows inbox', async () => {
    mockFetchForLogin()

    render(<App />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    })

    await userEvent.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'password123')

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument()
    })
  })

  it('signs up successfully and shows inbox', async () => {
    mockFetchForSignup()

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Register/i }))

    await userEvent.type(screen.getByLabelText(/First name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/Last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/Email/i), 'jane@example.com')
    const passwordInputs = screen.getAllByLabelText(/Password/i)
    await userEvent.type(passwordInputs[0], 'secret123')
    await userEvent.type(screen.getByLabelText(/Confirm password/i), 'secret123')

    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument()
    })
  })
})

describe('App when logged in', () => {
  beforeEach(() => {
    mockFetchLoggedIn()
  })

  it('shows welcome screen and empty chat list with New chat button', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument()
    })

    expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument()
  })

  it('opens New chat modal when New chat is clicked', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /New chat/i }))

    expect(screen.getByRole('heading', { name: 'New chat' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Search/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Email or name/i)).toBeInTheDocument()
  })

  it('closes New chat modal when Close button is clicked', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /New chat/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'New chat' })).toBeInTheDocument()
    })

    const newChatModal = screen.getByRole('heading', { name: 'New chat' }).closest('.ProfileModal')
    fireEvent.click(within(newChatModal).getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'New chat' })).not.toBeInTheDocument()
    })
  })

  it('shows error when search returns no contacts', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /New chat/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Search/i)).toBeInTheDocument()
    })

    const newChatModal = screen.getByRole('heading', { name: 'New chat' }).closest('.ProfileModal')
    const searchInput = within(newChatModal).getByPlaceholderText(/Email or name/i)
    await userEvent.type(searchInput, 'nobody@example.com')
    fireEvent.click(within(newChatModal).getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(screen.getByText(/No user found with that email or name/i)).toBeInTheDocument()
    })
  })

  it('opens profile modal when profile button is clicked', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open profile/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }))

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByLabelText(/First name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Last name/i)).toBeInTheDocument()
  })

  it('shows validation error when profile save has empty name fields', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open profile/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    })

    const profileModal = screen.getByRole('heading', { name: 'Profile' }).closest('.ProfileModal')
    const firstNameInput = within(profileModal).getByLabelText(/First name/i)
    const lastNameInput = within(profileModal).getByLabelText(/Last name/i)
    await userEvent.clear(firstNameInput)
    await userEvent.clear(lastNameInput)
    fireEvent.click(within(profileModal).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(/First and last name are required/i)).toBeInTheDocument()
    })
  })

  it('closes profile modal when close button is clicked', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open profile/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Close profile/i }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument()
    })
  })

  it('logs out and returns to login form', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Log out/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Log out/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
    })
  })

  it('creates chat successfully when search finds a contact', async () => {
    const mockContact = {
      id: 'contact-1',
      _id: 'contact-1',
      email: 'friend@example.com',
      firstName: 'Friend',
      lastName: 'User',
    }
    mockFetchLoggedIn({ searchContacts: [mockContact] })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /New chat/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'New chat' })).toBeInTheDocument()
    })

    const newChatModal = screen.getByRole('heading', { name: 'New chat' }).closest('.ProfileModal')
    const searchInput = within(newChatModal).getByPlaceholderText(/Email or name/i)
    await userEvent.type(searchInput, 'friend@example.com')
    fireEvent.click(within(newChatModal).getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'New chat' })).not.toBeInTheDocument()
      expect(screen.getByText('Friend User')).toBeInTheDocument()
    })
  })

  it('shows chat list when contacts exist', async () => {
    const mockContacts = [
      { _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    ]
    mockFetchLoggedIn({ contacts: mockContacts })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })
  })

  it('selects a chat and loads messages', async () => {
    const mockContacts = [
      { _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    ]
    mockFetchLoggedIn({ contacts: mockContacts })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice Smith'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument()
    })
  })

  it('sends a message when chat is selected', async () => {
    const mockContacts = [
      { _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    ]
    mockFetchLoggedIn({ contacts: mockContacts })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice Smith'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument()
    })

    const messageInput = screen.getByPlaceholderText('Message...')
    await userEvent.type(messageInput, 'Hello!')
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })
  })

  it('deletes a chat and removes it from the list', async () => {
    const mockContacts = [
      { _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
    ]
    mockFetchLoggedIn({ contacts: mockContacts })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Delete chat/i }))

    await waitFor(() => {
      expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
      expect(screen.getByText('No conversations yet.')).toBeInTheDocument()
    })
  })

  it('saves profile successfully and closes modal', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Open profile/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    })

    const profileModal = screen.getByRole('heading', { name: 'Profile' }).closest('.ProfileModal')
    const firstNameInput = within(profileModal).getByLabelText(/First name/i)
    const lastNameInput = within(profileModal).getByLabelText(/Last name/i)
    await userEvent.clear(firstNameInput)
    await userEvent.type(firstNameInput, 'Updated')
    await userEvent.clear(lastNameInput)
    await userEvent.type(lastNameInput, 'Name')
    fireEvent.click(within(profileModal).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument()
    })
  })

  it('shows login error when login API fails', async () => {
    mockFetchForLogin()
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/auth/userinfo')) {
        return Promise.resolve({
          ok: false,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({}),
        })
      }
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({
          ok: false,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ message: 'Invalid credentials' }),
        })
      }
      return Promise.reject(new Error('Unexpected'))
    })

    render(<App />)
    await waitFor(() => expect(screen.getByLabelText(/Email/i)).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'wrong')
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => {
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('shows signup error when signup API fails', async () => {
    mockFetchForSignup()
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/auth/userinfo')) {
        return Promise.resolve({ ok: false, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
      }
      if (url.includes('/api/auth/signup')) {
        return Promise.resolve({
          ok: false,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ message: 'Email already exists' }),
        })
      }
      return Promise.reject(new Error('Unexpected'))
    })

    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Register/i }))
    await userEvent.type(screen.getByLabelText(/First name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/Last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/Email/i), 'jane@example.com')
    const pws = screen.getAllByLabelText(/Password/i)
    await userEvent.type(pws[0], 'secret123')
    await userEvent.type(screen.getByLabelText(/Confirm password/i), 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/Email already exists/i)).toBeInTheDocument()
    })
  })

  it('shows connection banner when socket disconnects', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument())
    await act(() => {
      mockSocket._trigger('disconnect')
    })
    await waitFor(() => {
      expect(screen.getByText(/Connection lost/i)).toBeInTheDocument()
    })
  })

  it('shows connection banner when socket has error', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument())
    await act(() => {
      mockSocket._trigger('connect_error')
    })
    await waitFor(() => {
      expect(screen.getByText(/Connection problem/i)).toBeInTheDocument()
    })
  })

  it('receives real-time message via socket and adds to chat', async () => {
    mockFetchLoggedIn({ contacts: [] })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument())

    await act(() => {
      mockSocket._trigger('receiveMessage', {
        id: 'msg-1',
        sender: { id: 'other-1', firstName: 'Other', lastName: 'User', email: 'other@example.com' },
        recipient: { id: 'user-1' },
        content: 'Hi from socket!',
        timestamp: new Date().toISOString(),
      })
    })

    await waitFor(() => expect(screen.getByText('Other User')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Other User'))
    await waitFor(() => {
      expect(screen.getByText('Hi from socket!')).toBeInTheDocument()
    })
  })

  it('shows messages error and Retry when load fails', async () => {
    let getMessagesCallCount = 0
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/auth/userinfo')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(mockUser) })
      }
      if (url.includes('/api/contacts/get-contacts-for-list')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ contacts: [{ _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }] }) })
      }
      if (url.includes('/api/messages/get-messages')) {
        getMessagesCallCount++
        if (getMessagesCallCount === 1) {
          return Promise.reject(new Error('Failed to fetch'))
        }
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ messages: [] }) })
      }
      if (url.includes('/api/auth/logout')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
      }
      return Promise.reject(new Error('Unexpected: ' + url))
    })

    render(<App />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alice Smith'))

    await waitFor(() => {
      expect(screen.getByText(/Connection problem/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument())
  })

  it('shows error when search returns contact missing id', async () => {
    mockFetchLoggedIn({ searchContacts: [{ firstName: 'No', lastName: 'Id', email: 'noid@test.com' }] })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /New chat/i }))
    const modal = screen.getByRole('heading', { name: 'New chat' }).closest('.ProfileModal')
    await userEvent.type(within(modal).getByPlaceholderText(/Email or name/i), 'noid@test.com')
    fireEvent.click(within(modal).getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(screen.getByText(/missing an id/i)).toBeInTheDocument()
    })
  })

  it('shows error when search API fails', async () => {
    mockFetchLoggedIn()
    const baseFetch = global.fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/contacts/search')) {
        return Promise.reject(new Error('Search failed'))
      }
      return baseFetch(url)
    })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /New chat/i }))
    const modal = screen.getByRole('heading', { name: 'New chat' }).closest('.ProfileModal')
    await userEvent.type(within(modal).getByPlaceholderText(/Email or name/i), 'someone@test.com')
    fireEvent.click(within(modal).getByRole('button', { name: 'Search' }))

    await waitFor(() => {
      expect(screen.getByText(/Search failed/i)).toBeInTheDocument()
    })
  })

  it('shows toast when delete chat fails', async () => {
    mockFetchLoggedIn({
      contacts: [{ _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }],
    })
    const baseFetch = global.fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/contacts/delete-dm/')) {
        return Promise.reject(new Error('Delete failed'))
      }
      return baseFetch(url)
    })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Delete chat/i }))

    await waitFor(() => {
      expect(screen.getByText(/Delete failed/i)).toBeInTheDocument()
    })
  })

  it('dismisses toast when Dismiss clicked', async () => {
    mockFetchLoggedIn({
      contacts: [{ _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }],
    })
    const baseFetch = global.fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/contacts/delete-dm/')) {
        return Promise.reject(new Error('Delete failed'))
      }
      return baseFetch(url)
    })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Delete chat/i }))
    await waitFor(() => expect(screen.getByText(/Delete failed/i)).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Dismiss/i }))
    await waitFor(() => expect(screen.queryByText(/Delete failed/i)).not.toBeInTheDocument())
  })

  it('displays messages with timestamps from API', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const messages = [
      {
        _id: 'm1',
        content: 'Today msg',
        sender: { id: 'user-1', firstName: 'Test', lastName: 'User' },
        timestamp: new Date().toISOString(),
      },
      {
        _id: 'm2',
        content: 'Yesterday msg',
        sender: { id: 'c1', firstName: 'Alice', lastName: 'Smith' },
        timestamp: yesterday.toISOString(),
      },
    ]
    mockFetchLoggedIn({
      contacts: [{ _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }],
      messages,
    })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alice Smith'))

    await waitFor(() => {
      expect(screen.getByText('Today msg')).toBeInTheDocument()
      expect(screen.getByText('Yesterday msg')).toBeInTheDocument()
    })
  })

  it('profile save handles non-object response', async () => {
    mockFetchLoggedIn({ updateProfileResponse: { user: null } })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Open profile/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }))
    const modal = screen.getByRole('heading', { name: 'Profile' }).closest('.ProfileModal')
    await userEvent.clear(within(modal).getByLabelText(/First name/i))
    await userEvent.type(within(modal).getByLabelText(/First name/i), 'NewFirst')
    await userEvent.clear(within(modal).getByLabelText(/Last name/i))
    await userEvent.type(within(modal).getByLabelText(/Last name/i), 'NewLast')
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Profile' })).not.toBeInTheDocument()
    })
  })

  it('profile save shows error when API fails', async () => {
    mockFetchLoggedIn()
    const baseFetch = global.fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/auth/update-profile')) {
        return Promise.reject(new Error('Profile update failed'))
      }
      return baseFetch(url)
    })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Open profile/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }))
    const modal = screen.getByRole('heading', { name: 'Profile' }).closest('.ProfileModal')
    await userEvent.clear(within(modal).getByLabelText(/First name/i))
    await userEvent.type(within(modal).getByLabelText(/First name/i), 'NewFirst')
    await userEvent.clear(within(modal).getByLabelText(/Last name/i))
    await userEvent.type(within(modal).getByLabelText(/Last name/i), 'NewLast')
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText(/Profile update failed/i)).toBeInTheDocument()
    })
  })

  it('opens sidebar when hamburger clicked', async () => {
    mockFetchLoggedIn()
    render(<App />)
    await waitFor(() => expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Close chat list/i }))
    await waitFor(() => expect(screen.queryByText('No conversations yet.')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Open chat list/i }))
    await waitFor(() => expect(screen.getByText('No conversations yet.')).toBeInTheDocument())
  })

  it('login with userinfo returning non-object uses email as fallback', async () => {
    let userinfoCalls = 0
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/auth/userinfo')) {
        userinfoCalls++
        if (userinfoCalls === 1) {
          return Promise.resolve({ ok: false, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(null),
        })
      }
      if (url.includes('/api/auth/login')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
      }
      if (url.includes('/api/contacts/get-contacts-for-list')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ contacts: [] }) })
      }
      return Promise.reject(new Error('Unexpected'))
    })

    render(<App />)
    await waitFor(() => expect(screen.getByLabelText(/Email/i)).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText(/Email/i), 'test@example.com')
    await userEvent.type(screen.getByLabelText(/^Password$/i), 'password123')
    fireEvent.submit(document.querySelector('form'))

    await waitFor(() => expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument())
  })

  it('signup falls back to login when userinfo fails after signup', async () => {
    let userinfoCalls = 0
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/auth/userinfo')) {
        userinfoCalls++
        if (userinfoCalls === 1) {
          return Promise.resolve({ ok: false, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
        }
        return Promise.reject(new Error('Session failed'))
      }
      if (url.includes('/api/auth/signup')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
      }
      return Promise.reject(new Error('Unexpected'))
    })

    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Register/i }))
    await userEvent.type(screen.getByLabelText(/First name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/Last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/Email/i), 'jane@example.com')
    const pws = screen.getAllByLabelText(/Password/i)
    await userEvent.type(pws[0], 'secret123')
    await userEvent.type(screen.getByLabelText(/Confirm password/i), 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Log in/i })).toBeInTheDocument()
    })
  })

  it('signup with userinfo returning non-object uses email as fallback', async () => {
    let userinfoCalls = 0
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/auth/userinfo')) {
        userinfoCalls++
        if (userinfoCalls === 1) {
          return Promise.resolve({ ok: false, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(null),
        })
      }
      if (url.includes('/api/auth/signup')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({}) })
      }
      if (url.includes('/api/contacts/get-contacts-for-list')) {
        return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve({ contacts: [] }) })
      }
      return Promise.reject(new Error('Unexpected'))
    })

    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Register/i }))
    await userEvent.type(screen.getByLabelText(/First name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/Last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/Email/i), 'jane@example.com')
    const pws = screen.getAllByLabelText(/Password/i)
    await userEvent.type(pws[0], 'secret123')
    await userEvent.type(screen.getByLabelText(/Confirm password/i), 'secret123')
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }))

    await waitFor(() => expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument())
  })

  it('selects chat without reloading when messages already loaded', async () => {
    const mockContacts = [
      { _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
      { _id: 'c2', firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' },
    ]
    let getMessagesCalls = 0
    mockFetchLoggedIn({
      contacts: mockContacts,
      messages: [{ _id: 'm1', content: 'Hi', sender: { id: 'c2' }, timestamp: new Date().toISOString() }],
    })
    const baseFetch = global.fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/messages/get-messages')) {
        getMessagesCalls++
        return baseFetch(url)
      }
      return baseFetch(url)
    })

    render(<App />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alice Smith'))
    await waitFor(() => expect(screen.getByText('Hi')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Bob Jones'))
    await waitFor(() => expect(screen.getByPlaceholderText('Message...')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alice Smith'))
    expect(getMessagesCalls).toBe(2)
  })

  it('merges socket chats with server chat list on user update', async () => {
    mockFetchLoggedIn({
      contacts: [{ _id: 'c1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }],
    })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    await act(() => {
      mockSocket._trigger('receiveMessage', {
        id: 'msg-1',
        sender: { id: 'other-1', firstName: 'Other', lastName: 'User', email: 'other@example.com' },
        recipient: { id: 'user-1' },
        content: 'Hi',
        timestamp: new Date().toISOString(),
      })
    })
    await waitFor(() => expect(screen.getByText('Other User')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Open profile/i }))
    const modal = screen.getByRole('heading', { name: 'Profile' }).closest('.ProfileModal')
    await userEvent.clear(within(modal).getByLabelText(/First name/i))
    await userEvent.type(within(modal).getByLabelText(/First name/i), 'Updated')
    await userEvent.clear(within(modal).getByLabelText(/Last name/i))
    await userEvent.type(within(modal).getByLabelText(/Last name/i), 'Name')
    fireEvent.click(within(modal).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    expect(screen.getByText('Other User')).toBeInTheDocument()
  })

  it('handles chat list load failure gracefully', async () => {
    mockFetchLoggedIn()
    const baseFetch = global.fetch
    global.fetch = jest.fn((url) => {
      if (url.includes('/api/contacts/get-contacts-for-list')) {
        return Promise.reject(new Error('Network error'))
      }
      return baseFetch(url)
    })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Welcome to your inbox')).toBeInTheDocument())
  })

  it('search for existing contact does not duplicate chat', async () => {
    mockFetchLoggedIn({
      contacts: [],
      searchContacts: [{ _id: 'other-1', id: 'other-1', firstName: 'Other', lastName: 'User', email: 'other@example.com' }],
    })
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: /New chat/i })).toBeInTheDocument())
    await act(() => {
      mockSocket._trigger('receiveMessage', {
        id: 'msg-1',
        sender: { id: 'other-1', firstName: 'Other', lastName: 'User', email: 'other@example.com' },
        recipient: { id: 'user-1' },
        content: 'Hi',
        timestamp: new Date().toISOString(),
      })
    })
    await waitFor(() => expect(screen.getByText('Other User')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /New chat/i }))
    const modal = screen.getByRole('heading', { name: 'New chat' }).closest('.ProfileModal')
    await userEvent.type(within(modal).getByPlaceholderText(/Email or name/i), 'other@example.com')
    fireEvent.click(within(modal).getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'New chat' })).not.toBeInTheDocument())
    expect(screen.getAllByText('Other User').length).toBe(1)
  })
})
