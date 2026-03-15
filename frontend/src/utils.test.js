import { getDisplayName, formatMessageTime, getUserFriendlyError } from './utils'

describe('getDisplayName', () => {
  it('returns empty string for null/undefined', () => {
    expect(getDisplayName(null)).toBe('')
    expect(getDisplayName(undefined)).toBe('')
  })

  it('returns firstName + lastName when both exist', () => {
    expect(getDisplayName({ firstName: 'John', lastName: 'Doe' })).toBe('John Doe')
  })

  it('returns email when name is empty', () => {
    expect(getDisplayName({ email: 'john@example.com' })).toBe('john@example.com')
  })

  it('returns username when name and email empty', () => {
    expect(getDisplayName({ username: 'johndoe' })).toBe('johndoe')
  })

  it('returns name when other fields empty', () => {
    expect(getDisplayName({ name: 'John' })).toBe('John')
  })
})

describe('formatMessageTime', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatMessageTime(null)).toBe('')
    expect(formatMessageTime(undefined)).toBe('')
  })

  it('returns empty string for invalid date', () => {
    expect(formatMessageTime('invalid')).toBe('')
    expect(formatMessageTime(NaN)).toBe('')
  })

  it('formats today as time only', () => {
    const now = new Date()
    const result = formatMessageTime(now.toISOString())
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)?/i)
  })

  it('formats yesterday with Yesterday prefix', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = formatMessageTime(yesterday.toISOString())
    expect(result).toMatch(/Yesterday/i)
  })

  it('formats older dates with month and day', () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 7)
    const result = formatMessageTime(oldDate.toISOString())
    expect(result).toMatch(/\w+\s+\d+/)
  })

  it('handles numeric timestamp', () => {
    const ts = Date.now() - 86400000
    const result = formatMessageTime(ts)
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('getUserFriendlyError', () => {
  it('returns default message for null/undefined', () => {
    expect(getUserFriendlyError(null)).toBe('Something went wrong.')
    expect(getUserFriendlyError(undefined)).toBe('Something went wrong.')
  })

  it('returns connection message for Failed to fetch', () => {
    expect(getUserFriendlyError(new Error('Failed to fetch'))).toBe(
      'Connection problem. Please check your network and try again.'
    )
  })

  it('returns connection message for NetworkError', () => {
    expect(getUserFriendlyError(new Error('NetworkError'))).toBe(
      'Connection problem. Please check your network and try again.'
    )
  })

  it('returns error message for other Error', () => {
    expect(getUserFriendlyError(new Error('Custom error'))).toBe('Custom error')
  })

  it('converts non-Error to string', () => {
    expect(getUserFriendlyError('string error')).toBe('string error')
  })
})
