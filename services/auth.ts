
import { supabase } from './supabase';
import { User, UserRole, DEFAULT_PERMISSIONS, UserPermissions } from '../types';
import { DB } from './db';

const USER_STORAGE_KEY = 'insurtech_user_session';

// Helper to check if we should use Supabase
const isSupabaseEnabled = () => {
    return !!supabase;
};

export const AuthService = {
  /**
   * Attempts to get the current session.
   * Checks Supabase first, merging Auth state with Public Profile data.
   */
  getSession: async (): Promise<User | null> => {
    // 1. Check Supabase Real Auth (Only if enabled)
    if (isSupabaseEnabled()) {
      const { data: { session } } = await supabase!.auth.getSession();
      if (session?.user) {
        
        // Fetch Profile from public.users to get the Role
        const { data: profile } = await supabase!
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // Default Role if no profile found (e.g. first login)
        const role: UserRole = profile?.role || 'Underwriter';
        const permissions: UserPermissions = profile?.permissions || DEFAULT_PERMISSIONS[role];

        return {
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.user_metadata.full_name || 'User',
          role: role, 
          avatarUrl: profile?.avatarUrl || session.user.user_metadata.avatar_url || 'U',
          lastLogin: session.user.last_sign_in_at,
          permissions: permissions
        };
      }
    }

    // 2. Fallback to Local Mock Storage (Only if Supabase is NOT configured at all)
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }

    return null;
  },

  /**
   * Performs authentication. 
   */
  login: async (email: string, password?: string): Promise<User | null> => {
    // 1. Supabase Logic
    if (isSupabaseEnabled()) {
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password: password || '' });
      if (error || !data.session) throw error;
      
      // Fetch Profile to get Role
      const { data: profile } = await supabase!
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Fallback if profile row is missing
      const role: UserRole = profile?.role || 'Underwriter';
      const permissions: UserPermissions = profile?.permissions || DEFAULT_PERMISSIONS[role];

      return {
          id: data.user.id,
          email: data.user.email || '',
          name: profile?.name || data.user.user_metadata.full_name || 'User',
          role: role,
          avatarUrl: profile?.avatarUrl || data.user.user_metadata.avatar_url || 'U',
          lastLogin: new Date().toISOString(),
          permissions: permissions
      };
    }

    // 2. Persistent Local Storage Logic (Fallback for Dev without Supabase)
    const users = await DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      if (user.password === password) {
          const safeUser = {
             ...user,
             lastLogin: new Date().toISOString(),
             permissions: user.permissions || DEFAULT_PERMISSIONS[user.role]
          };
          const { password: _, ...sessionUser } = safeUser;
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
          return sessionUser as User;
      } else {
          throw new Error('Invalid credentials');
      }
    }
    
    throw new Error('User not found in local database.');
  },

  /**
   * Registers a new user (Supabase Only)
   */
  register: async (
    email: string, 
    password?: string, 
    name?: string, 
    role?: UserRole, 
    permissions?: UserPermissions
  ): Promise<User | null> => {
    if (!isSupabaseEnabled()) {
      throw new Error("Registration is only available when connected to a database.");
    }

    // 1. Create Auth User
    const { data, error } = await supabase!.auth.signUp({
      email,
      password: password || '',
      options: {
        data: {
          full_name: name,
          avatar_url: name ? name.substring(0, 2).toUpperCase() : 'NU'
        }
      }
    });

    if (error) throw error;
    if (!data.user) return null;

    // 2. Determine Role
    // If a role is passed (from Admin Console), use it.
    // If no role passed (Login page registration), default to 'Super Admin' for the first user.
    const finalRole = role || 'Super Admin';
    const finalPermissions = permissions || DEFAULT_PERMISSIONS[finalRole];

    // 3. Create Public Profile
    const newUserProfile = {
      id: data.user.id,
      email: email,
      name: name || 'New User',
      role: finalRole,
      avatarUrl: name ? name.substring(0, 2).toUpperCase() : 'NU',
      permissions: finalPermissions,
      lastLogin: new Date().toISOString()
    };

    const { error: profileError } = await supabase!
      .from('users')
      .insert(newUserProfile);

    if (profileError) {
      console.error("Profile creation failed", profileError);
    }

    return {
        ...newUserProfile,
        role: newUserProfile.role as UserRole
    };
  },

  logout: async (): Promise<void> => {
    if (isSupabaseEnabled()) {
      await supabase!.auth.signOut();
    }
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  getUsers: async () => {
      return await DB.getUsers();
  }
};
