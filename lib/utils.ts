import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// AES-GCM crypto storage utility for sensitive client-side cache
// Derives a key from a passphrase using PBKDF2, stores IV per entry
export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptToBase64(key: CryptoKey, data: Uint8Array): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptFromBase64(key: CryptoKey, payloadB64: string): Promise<Uint8Array> {
  const binary = atob(payloadB64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)
  const iv = buffer.slice(0, 12)
  const data = buffer.slice(12)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new Uint8Array(plaintext)
}

export async function secureLocalSet(keyName: string, value: unknown, passphrase: string): Promise<void> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(passphrase, salt)
  const plaintext = enc.encode(JSON.stringify(value))
  const payload = await encryptToBase64(key, plaintext)
  localStorage.setItem(keyName, JSON.stringify({ s: Array.from(salt), p: payload }))
}

export async function secureLocalGet<T = unknown>(keyName: string, passphrase: string): Promise<T | null> {
  const raw = localStorage.getItem(keyName)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { s: number[]; p: string }
    const salt = new Uint8Array(parsed.s)
    const key = await deriveKey(passphrase, salt)
    const bytes = await decryptFromBase64(key, parsed.p)
    const dec = new TextDecoder()
    return JSON.parse(dec.decode(bytes)) as T
  } catch {
    return null
  }
}
