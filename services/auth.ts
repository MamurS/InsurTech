
import { supabase } from './supabase';
import { User, UserRole, DEFAULT_PERMISSIONS, UserPermissions } from '../types';
import { DB } from './db';

const USER_STORAGE_KEY = 'insurtech_user_session';

export const AuthService = {
  /**
   * Attempts to get the current session.
   * Checks Supabase first, then falls back to local storage session.
   */
  getSession: async (): Promise<User | null> => {
    // 1. Check Supabase Real Auth
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Map Supabase user metadata to our User type
        const role = (session.user.user_metadata.role as UserRole) || 'Underwriter';
        return {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata.full_name || 'Supabase User',
          role: role, 
          avatarUrl: session.user.user_metadata.avatar_url,
          lastLogin: session.user.last_sign_in_at,
          permissions: (session.user.user_metadata.permissions as UserPermissions) || DEFAULT_PERMISSIONS[role]
        };
      }
    }

    // 2. Fallback to Local Mock Storage
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    return null;
  },

  /**
   * Performs authentication. 
   * In production, this would redirect to an OAuth provider or exchange credentials.
   */
  login: async (email: string, password?: string): Promise<User | null> => {
    // 1. Supabase Logic (Placeholder for real implementation)
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
      if (error || !data.session) throw error;
      
      // Map user
      const role = (data.user.user_metadata.role as UserRole) || 'Underwriter';
      return {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata.full_name || 'User',
          role: role,
          avatarUrl: data.user.user_metadata.avatar_url,
          lastLogin: new Date().toISOString(),
          permissions: (data.user.user_metadata.permissions as UserPermissions) || DEFAULT_PERMISSIONS[role]
      };
    }

    // 2. Persistent Local Storage Logic (Replaces Mock IdP)
    const users = await DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      // Basic check - In a real app this would be a hash comparison (bcrypt)
      if (user.password === password) {
          // Ensure permissions exist even if loaded from old local storage data
          const safeUser = {
             ...user,
             lastLogin: new Date().toISOString(),
             permissions: user.permissions || DEFAULT_PERMISSIONS[user.role]
          };

          // Don't store password in session storage
          const { password: _, ...sessionUser } = safeUser;
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
          return sessionUser as User;
      } else {
          throw new Error('Invalid credentials');
      }
    }
    
    throw new Error('User not found.');
  },

  logout: async (): Promise<void> => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  /**
   * Returns all available users for admin management.
   */
  getUsers: async () => {
      return await DB.getUsers();
  }
};
