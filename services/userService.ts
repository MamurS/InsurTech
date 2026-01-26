
import { supabase } from './supabase';
import { Profile, UserRole } from '../types';

export const UserService = {
    // Get all profiles (for assignment dropdowns and admin list)
    getAllProfiles: async (): Promise<Profile[]> => {
        if (!supabase) {
            console.warn("Supabase client not initialized.");
            return [];
        }
        
        try {
            // Query 'users' table
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('email', { ascending: true });
            
            if (error) {
                console.error("UserService: Error fetching users:", error);
                return [];
            }
            
            console.log(`UserService: Successfully fetched ${data?.length || 0} users.`);

            // Robust Mapping
            return (data || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                fullName: p.name || p.full_name || p.fullName || 'Unknown User',
                role: (p.role || 'Viewer') as UserRole,
                department: p.department || '',
                phone: p.phone || '',
                avatarUrl: p.avatarUrl || p.avatar_url || p.avatar_url, 
                isActive: p.isActive !== undefined ? p.isActive : (p.is_active !== undefined ? p.is_active : true),
                createdAt: p.created_at || new Date().toISOString()
            }));
        } catch (err) {
            console.error("UserService: Unexpected error:", err);
            return [];
        }
    },

    // Update profile data
    updateProfile: async (id: string, updates: Partial<Profile>) => {
        if (!supabase) return;
        
        const dbUpdates: any = {};
        
        if (updates.fullName) dbUpdates.name = updates.fullName;
        if (updates.role) dbUpdates.role = updates.role;
        if (updates.department) dbUpdates.department = updates.department;
        if (updates.phone) dbUpdates.phone = updates.phone;
        if (updates.avatarUrl) dbUpdates["avatarUrl"] = updates.avatarUrl;
        if (updates.isActive !== undefined) dbUpdates["isActive"] = updates.isActive;
        
        const { error } = await supabase
            .from('users')
            .update(dbUpdates)
            .eq('id', id);
            
        if (error) throw error;
    }
};
