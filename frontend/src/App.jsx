import { useEffect, useState } from 'react'
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

  // On page load, ask backend if we already have a valid session.
  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      try {
        const user = await api('/api/auth/userinfo', { method: 'GET' })
        if (cancelled) return
        const identity =
          (user && typeof user === 'object' && (user.email || user.username || user.name)) || ''
        setEmail(String(identity))
        setIsLoggedIn(true)
      } catch {
        if (cancelled) return
        setIsLoggedIn(false)
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

      // After login, fetch user details (so UI shows correct email/username).
      const user = await api('/api/auth/userinfo', { method: 'GET' })
      const identity =
        (user && typeof user === 'object' && (user.email || user.username || user.name)) ||
        email.trim()
      setEmail(String(identity))
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
        const user = await api('/api/auth/userinfo', { method: 'GET' })
        const identity =
          (user && typeof user === 'object' && (user.email || user.username || user.name)) ||
          email.trim()
        setEmail(String(identity))
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

  async function handleLogout() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } finally {
      setIsLoggedIn(false)
      setPassword('')
      setEmail('')
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
    <div className="App">
      <h1>Instant Messaging App</h1>
      <p>Logged in as <strong>{email}</strong></p>
      <button className="Button Secondary" type="button" onClick={handleLogout}>
        Log out
      </button>

      <div className="Card" style={{ marginTop: '1rem' }}>
        <p>Building in progress!</p>
      </div>
    </div>
  )
}


export default App
