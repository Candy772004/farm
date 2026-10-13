import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/backendTypes.js';
import { db } from '../db/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'farm2trust-super-secret-jwt-key-2026';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function generateToken(payload: AuthUserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUserPayload;
  } catch (err) {
    return null;
  }
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
    return;
  }

  // Ensure user still exists
  const user = await db.users.findById(decoded.userId);
  if (!user) {
    res.status(401).json({ success: false, message: 'User account not found.' });
    return;
  }

  req.user = {
    userId: user._id,
    email: user.email,
    role: user.role,
    name: user.name
  };

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles. Your current role is '${req.user.role}'.`
      });
      return;
    }

    next();
  };
}

export async function requireApprovedFarmer(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  if (req.user.role !== 'farmer' && req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Only registered farmers can perform this action.' });
    return;
  }

  if (req.user.role === 'admin') {
    // Admins bypass farmer-only restriction for management
    next();
    return;
  }

  const profile = await db.farmerProfiles.findOne({ userId: req.user.userId });
  if (!profile) {
    res.status(403).json({
      success: false,
      message: 'Farmer profile not found. Please submit your verification application.'
    });
    return;
  }

  if (profile.verificationStatus !== 'approved') {
    res.status(403).json({
      success: false,
      verificationStatus: profile.verificationStatus,
      message: `Your farmer account is currently '${profile.verificationStatus}'. Only verified and approved farmers may create listings, manage inventory, or accept customer orders.`
    });
    return;
  }

  next();
}
