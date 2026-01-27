
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
            
            // Robust Mapping
            return (data || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                fullName: p.name || p.full_name || p.fullName || 'Unknown User',
                role: (p.role || 'Viewer') as UserRole,
                roleId: p.role_id,
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
        
        const payload: any = {};
        
        // Explicitly map inputs to DB columns
        if (updates.fullName !== undefined) payload.name = updates.fullName; // DB column is 'name'
        if (updates.roleId !== undefined) payload.role_id = updates.roleId;
        if (updates.department !== undefined) payload.department = updates.department;
        if (updates.phone !== undefined) payload.phone = updates.phone;
        if (updates.avatarUrl !== undefined) payload["avatarUrl"] = updates.avatarUrl;
        if (updates.isActive !== undefined) payload["isActive"] = updates.isActive;
        
        // Sync Legacy Role Field for backward compatibility
        if (updates.roleId) {
            const { data: roleData } = await supabase
                .from('roles')
                .select('name')
                .eq('id', updates.roleId)
                .single();
            
            if (roleData) {
                payload.role = roleData.name;
            }
        } else if (updates.role) {
            payload.role = updates.role;
        }
        
        const { error } = await supabase
            .from('users')
            .update(payload)
            .eq('id', id);
            
        if (error) throw error;
    }
};