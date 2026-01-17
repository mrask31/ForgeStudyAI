import crypto from 'crypto'

const PIN_LENGTH = 4
const HASH_KEY_LENGTH = 64

export function validatePin(pin: string) {
  return /^\d{4}$/.test(pin)
}

export function hashPin(pin: string) {
  if (!validatePin(pin)) {
    throw new Error(`PIN must be ${PIN_LENGTH} digits`)
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(pin, salt, HASH_KEY_LENGTH)

  return {
    salt,
    hash: derivedKey.toString('hex'),
  }
}

export function verifyPin(pin: string, salt: string, hash: string) {
  if (!validatePin(pin)) {
    return false
  }

  const derivedKey = crypto.scryptSync(pin, salt, HASH_KEY_LENGTH)
  const storedKey = Buffer.from(hash, 'hex')

  if (storedKey.length !== derivedKey.length) {
    return false
  }

  return crypto.timingSafeEqual(storedKey, derivedKey)
}
