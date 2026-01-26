
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgendaService } from '../services/agendaService';
import { AgendaTask, TaskStatus } from '../types';

export const useAgendaTasks = (userId?: string, status?: string) => {
    return useQuery({
        queryKey: ['agenda', userId, status],
        queryFn: () => AgendaService.getTasks(userId, status),
        staleTime: 1000 * 60 * 2 // 2 mins
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (task: Partial<AgendaTask>) => AgendaService.createTask(task),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agenda'] });
        }
    });
};

export const useUpdateTaskStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status }: { id: string, status: TaskStatus }) => 
            AgendaService.updateTaskStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agenda'] });
        }
    });
};

export const useEntityActivity = (type: string, id: string) => {
    return useQuery({
        queryKey: ['activity', type, id],
        queryFn: () => AgendaService.getEntityActivity(type, id),
        enabled: !!id
    });
};
