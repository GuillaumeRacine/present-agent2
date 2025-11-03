/**
 * JWT Token Service
 * Handles creation and verification of JWT tokens for 30-day sessions
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Use environment variable or generate a secret
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '30d'; // 30 days
const MAGIC_LINK_EXPIRES_IN = '15m'; // 15 minutes for magic link

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'session' | 'magic_link';
}

/**
 * Generate a session token (30 days)
 */
export function generateSessionToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
    type: 'session',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate a magic link token (15 minutes)
 */
export function generateMagicLinkToken(email: string): string {
  const payload: TokenPayload = {
    userId: '', // Will be assigned after verification
    email,
    type: 'magic_link',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: MAGIC_LINK_EXPIRES_IN,
  });
}

/**
 * Verify and decode a token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return false;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return true;
    }
    return true;
  }
}
