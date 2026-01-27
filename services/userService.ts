
import { supabase } from './supabase';
import { Profile, UserRole, Department } from '../types';

export const UserService = {
    // --- DEPARTMENTS ---

    getDepartments: async (): Promise<Department[]> => {
        if (!supabase) return [];
        
        // We select *, and join to profiles to get the head of department name
        const { data, error } = await supabase
            .from('departments')
            .select(`
                *,
                head_profile:head_of_department(full_name) 
            `)
            .order('name');
        
        if (error) {
            console.error('Error fetching departments:', error);
            return [];
        }
        
        // Count users in each department to update 'currentStaffCount'
        // Ideally this is a separate count query or a view, but for small scale this works client-side or via separate query
        const { data: users } = await supabase.from('profiles').select('department_id');
        const counts: Record<string, number> = {};
        users?.forEach((u: any) => {
            if (u.department_id) counts[u.department_id] = (counts[u.department_id] || 0) + 1;
        });

        return (data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            description: d.description,
            headOfDepartment: d.head_of_department, // The UUID
            headName: d.head_profile?.full_name, // The joined name mapped manually in UI or here
            maxStaff: d.max_staff,
            currentStaffCount: counts[d.id] || 0,
            parentDepartmentId: d.parent_department_id,
            isActive: d.is_active
        }));
    },

    saveDepartment: async (dept: Partial<Department>) => {
        if (!supabase) throw new Error("No DB connection");

        const payload = {
            name: dept.name,
            code: dept.code,
            description: dept.description,
            head_of_department: dept.headOfDepartment || null,
            max_staff: dept.maxStaff || 0,
            is_active: dept.isActive !== false,
            updated_at: new Date().toISOString()
        };

        if (dept.id) {
            const { error } = await supabase
                .from('departments')
                .update(payload)
                .eq('id', dept.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('departments')
                .insert(payload);
            if (error) throw error;
        }
    },

    deleteDepartment: async (id: string) => {
        if (!supabase) throw new Error("No DB connection");
        
        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
    },

    // --- PROFILES ---

    // Get all profiles (for assignment dropdowns and admin list)
    getAllProfiles: async (): Promise<Profile[]> => {
        if (!supabase) {
            console.warn("Supabase client not initialized.");
            return [];
        }
        
        try {
            // Query 'profiles' table (CORRECT TABLE)
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id,
                    email,
                    full_name,
                    role,
                    role_id,
                    department,
                    department_id,
                    phone,
                    avatar_url,
                    is_active,
                    created_at,
                    updated_at
                `)
                .order('full_name');
            
            if (error) {
                console.error("UserService: Error fetching profiles:", error);
                return [];
            }
            
            // Map columns from 'profiles' schema to app Profile type
            return (data || []).map((p: any) => ({
                id: p.id,
                email: p.email,
                fullName: p.full_name || 'Unknown User',
                role: (p.role || 'Viewer') as UserRole,
                roleId: p.role_id,
                department: p.department || '',
                departmentId: p.department_id,
                phone: p.phone || '',
                avatarUrl: p.avatar_url,
                isActive: p.is_active !== undefined ? p.is_active : true,
                createdAt: p.created_at || new Date().toISOString(),
                updatedAt: p.updated_at
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
        
        // Explicitly map inputs to DB columns for 'profiles' table
        if (updates.fullName !== undefined) payload.full_name = updates.fullName;
        if (updates.roleId !== undefined) payload.role_id = updates.roleId;
        if (updates.department !== undefined) payload.department = updates.department;
        if (updates.departmentId !== undefined) payload.department_id = updates.departmentId;
        if (updates.phone !== undefined) payload.phone = updates.phone;
        if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
        if (updates.isActive !== undefined) payload.is_active = updates.isActive;
        
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
            .from('profiles')  // CORRECT TABLE
            .update(payload)
            .eq('id', id);
            
        if (error) throw error;
    },

    // Delete user (Auth + Profile)
    deleteUser: async (userId: string) => {
        if (!supabase) return;
        
        // Call RPC function to delete from auth.users (requires setup in DB)
        const { error } = await supabase.rpc('delete_user_account', { user_id: userId });
        
        if (error) {
            console.error("Error deleting user:", error);
            throw new Error(error.message || "Failed to delete user. Check permissions.");
        }
    }
};
