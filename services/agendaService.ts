
import { supabase } from './supabase';
import { AgendaTask, TaskStatus, EntityType, ActivityLogEntry } from '../types';

export const AgendaService = {
    // Fetch tasks using RPC for joined data
    getTasks: async (userId?: string, status?: string): Promise<AgendaTask[]> => {
        if (!supabase) return [];
        
        const { data, error } = await supabase.rpc('get_agenda_tasks', {
            p_user_id: userId || null,
            p_status: status === 'ALL' ? null : status
        });

        if (error) {
            console.error("Error fetching tasks:", error);
            return [];
        }

        return (data || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.due_date,
            assignedTo: t.assigned_to,
            assignedToName: t.assigned_to_name,
            assignedByName: t.assigned_by_name,
            assignedAt: t.assigned_at,
            entityType: t.entity_type,
            entityId: t.entity_id,
            policyNumber: t.policy_number,
            insuredName: t.insured_name,
            brokerName: t.broker_name,
            createdAt: t.created_at,
            isOverdue: t.is_overdue
        }));
    },

    createTask: async (task: Partial<AgendaTask>) => {
        if (!supabase) return;
        
        const { data: userData } = await supabase.auth.getUser();
        
        const payload = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: 'PENDING',
            due_date: task.dueDate,
            assigned_to: task.assignedTo,
            assigned_by: userData.user?.id,
            entity_type: task.entityType,
            entity_id: task.entityId,
            policy_number: task.policyNumber,
            insured_name: task.insuredName,
            broker_name: task.brokerName,
            created_by: userData.user?.id
        };

        const { error } = await supabase.from('agenda_tasks').insert(payload);
        if (error) throw error;
    },

    updateTaskStatus: async (taskId: string, status: TaskStatus) => {
        if (!supabase) return;
        
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'COMPLETED') {
            const { data } = await supabase.auth.getUser();
            updates.completed_at = new Date().toISOString();
            updates.completed_by = data.user?.id;
        }

        const { error } = await supabase.from('agenda_tasks').update(updates).eq('id', taskId);
        if (error) throw error;
    },

    logActivity: async (log: Partial<ActivityLogEntry>) => {
        if (!supabase) return;
        
        const { data } = await supabase.auth.getUser();
        // Fetch user name from profiles if not provided, but usually we log from client context
        
        const { error } = await supabase.from('activity_log').insert({
            user_id: data.user?.id,
            user_name: log.userName || 'System',
            action: log.action,
            action_description: log.actionDescription,
            entity_type: log.entityType,
            entity_id: log.entityId,
            entity_reference: log.entityReference,
            old_values: log.oldValues,
            new_values: log.newValues
        });
        
        if (error) console.error("Failed to log activity:", error);
    },

    getEntityActivity: async (entityType: string, entityId: string): Promise<ActivityLogEntry[]> => {
        if (!supabase) return [];
        
        const { data, error } = await supabase
            .from('activity_log')
            .select('*')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .order('created_at', { ascending: false });

        if (error) return [];

        return (data || []).map((l: any) => ({
            id: l.id,
            userId: l.user_id,
            userName: l.user_name,
            action: l.action,
            actionDescription: l.action_description,
            entityType: l.entity_type,
            entityId: l.entity_id,
            createdAt: l.created_at,
            oldValues: l.old_values,
            newValues: l.new_values
        }));
    }
};
