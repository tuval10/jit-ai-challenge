// Global test setup
import { mkdir } from 'fs/promises'

beforeAll(async () => {
  // Ensure test temp directory exists
  await mkdir('/tmp/claude', { recursive: true })
})

// Mock console.log to reduce test output noise
const originalLog = console.log
const originalError = console.error

beforeEach(() => {
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn()
    console.error = jest.fn()
  }
})

afterEach(() => {
  if (process.env.NODE_ENV === 'test') {
    console.log = originalLog
    console.error = originalError
  }
})