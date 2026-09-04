import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from './firebaseAdmin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Reusable Express authentication middleware enforcing Firebase ID Token validation.
 * Rejects requests without a valid Bearer token.
 * Attaches verified user context to req.user.
 * Rejects client-supplied userId/uid spoofing attempts.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    res.status(401).json({ error: 'Unauthorized: Missing Authorization header.' });
    return;
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Unauthorized: Invalid Authorization scheme. Expected Bearer token.' });
    return;
  }

  const token = parts[1]?.trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty token provided.' });
    return;
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    // Attach typed authenticated user context strictly derived from verified token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (error: any) {
    // Sanitize log: log code or generic message, never log raw token
    const errCode = error?.code || 'auth/invalid-token';
    console.warn(`[AuthMiddleware] Token verification failed: ${errCode}`);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token.' });
    return;
  }
}
