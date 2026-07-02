/**
 * Cryptographic utility functions for the PrintCare application.
 * Uses native Web Crypto API for secure SHA-256 hashing.
 */

/**
 * Generates a SHA-256 hash of a plaintext string.
 * This is a one-way cryptographic hash to protect passwords from being stored in cleartext.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) return '';
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies if a string is a valid SHA-256 hex hash.
 */
export function isSha256(str: string): boolean {
  return /^[a-f0-9]{64}$/i.test(str);
}
