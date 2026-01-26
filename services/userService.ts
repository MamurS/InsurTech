
import { supabase } from './supabase';
import { Profile, UserRole } from '../types';

export const UserService = {
    // Get all profiles (for assignment dropdowns and admin list)
    getAllProfiles: async (): Promise<Profile[]> => {
        if (!supabase) return [];
        
        // Query 'users' table (as defined in supabase_schema.sql)
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });
        
        if (error) {
            console.error("Error fetching users:", error);
            return [];
        }
        
        // Map DB columns to Profile interface
        // Handling both potential naming conventions (camelCase from schema vs snake_case standard)
        return (data || []).map((p: any) => ({
            id: p.id,
            email: p.email,
            fullName: p.name || p.full_name || 'Unknown',
            role: p.role as UserRole,
            department: p.department || '', // Will be empty if column missing until migration runs
            phone: p.phone || '',
            avatarUrl: p.avatarUrl || p.avatar_url, 
            isActive: p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true),
            createdAt: p.created_at
        }));
    },

    // Update profile data
    updateProfile: async (id: string, updates: Partial<Profile>) => {
        if (!supabase) return;
        
        const dbUpdates: any = {};
        if (updates.fullName) dbUpdates.name = updates.fullName;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.department) dbUpdates.department = updates.department;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.avatarUrl) dbUpdates["avatarUrl"] = updates.avatarUrl; // Quote for case-sensitive column if needed
        if (updates.isActive !== undefined) dbUpdates.isActive = updates.isActive;
        
        const { error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', id);
            
        if (error) throw error;
    }
};
