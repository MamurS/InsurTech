
import { supabase } from './supabase';
import { Profile, UserRole } from '../types';

export const UserService = {
    // Get all profiles (for assignment dropdowns and admin list)
    getAllProfiles: async (): Promise<Profile[]> => {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });
        
        if (error) {
            console.error("Error fetching profiles:", error);
            return [];
        }
        
        // Map snake_case to camelCase
        return (data || []).map((p: any) => ({
            id: p.id,
            email: p.email,
            fullName: p.full_name,
            role: p.role as UserRole,
            department: p.department,
            phone: p.phone,
            avatarUrl: p.avatar_url,
            isActive: p.is_active,
            createdAt: p.created_at
        }));
    },

    // Create a new profile (usually tied to auth sign up, but can be managed here for metadata)
    updateProfile: async (id: string, updates: Partial<Profile>) => {
        if (!supabase) return;
        
        const dbUpdates: any = {};
        if (updates.fullName) dbUpdates.full_name = updates.fullName;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.department) dbUpdates.department = updates.department;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
        
        const { error } = await supabase
            .from('profiles')
            .update({ ...dbUpdates, updated_at: new Date().toISOString() })
            .eq('id', id);
            
        if (error) throw error;
    }
};
