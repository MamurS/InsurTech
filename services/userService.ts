
import { supabase } from './supabase';
import { Profile, UserRole } from '../types';

export const UserService = {
    // Get all profiles (for assignment dropdowns and admin list)
    getAllProfiles: async (): Promise<Profile[]> => {
        if (!supabase) return [];
        
        // Query 'users' table
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('email', { ascending: true }); // Order by email is safer if names are null
        
        if (error) {
            console.error("Error fetching users:", error);
            return [];
        }
        
        // Robust Mapping: Handles snake_case, camelCase, and missing fields
        return (data || []).map((p: any) => ({
            id: p.id,
            email: p.email,
            // Try all possible name fields
            fullName: p.name || p.full_name || p.fullName || 'Unknown User',
            role: (p.role || 'Viewer') as UserRole,
            department: p.department || '',
            phone: p.phone || '',
            // Handle quoted "avatarUrl" vs snake_case avatar_url
            avatarUrl: p.avatarUrl || p.avatar_url || p.avatar_url, 
            // Handle quoted "isActive" vs snake_case is_active
            isActive: p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true),
            createdAt: p.created_at || new Date().toISOString()
        }));
    },

    // Update profile data
    updateProfile: async (id: string, updates: Partial<Profile>) => {
        if (!supabase) return;
        
        const dbUpdates: any = {};
        
        // Map App Types -> DB Columns
        if (updates.fullName) dbUpdates.name = updates.fullName;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.department) dbUpdates.department = updates.department;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.avatarUrl) dbUpdates["avatarUrl"] = updates.avatarUrl; // Quote for legacy camelCase column
        if (updates.isActive !== undefined) dbUpdates["isActive"] = updates.isActive; // Quote for legacy camelCase column
        
        const { error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', id);
            
        if (error) throw error;
    }
};
