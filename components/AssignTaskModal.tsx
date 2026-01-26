
import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, User, Briefcase } from 'lucide-react';
import { useCreateTask } from '../hooks/useAgenda';
import { useProfiles } from '../hooks/useUsers';
import { TaskPriority, EntityType } from '../types';

interface AssignTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Pre-filled entity info if triggered from a detail page
    entityType?: EntityType;
    entityId?: string;
    entityReference?: string; // Policy Number, etc.
    preSelectedUser?: string;
}

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({ 
    isOpen, onClose, entityType, entityId, entityReference, preSelectedUser 
}) => {
    const createTaskMutation = useCreateTask();
    const { data: profiles, isLoading: loadingProfiles } = useProfiles();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [assignedTo, setAssignedTo] = useState(preSelectedUser || '');

    // Reset when opening
    useEffect(() => {
        if (isOpen) {
            setTitle(entityReference ? `Review: ${entityReference}` : '');
            setDescription('');
            setPriority('MEDIUM');
            setDueDate('');
            setAssignedTo(preSelectedUser || '');
        }
    }, [isOpen, entityReference, preSelectedUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !assignedTo) return;

        createTaskMutation.mutate({
            title,
            description,
            priority,
            dueDate: dueDate || undefined,
            assignedTo,
            entityType: entityType || 'OTHER',
            entityId,
            policyNumber: entityType === 'POLICY' ? entityReference : undefined
        }, {
            onSuccess: () => {
                onClose();
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-gray-800 text-lg">Create New Task</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {entityReference && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-center gap-2">
                            <Briefcase size={16}/>
                            Linked to: <strong>{entityReference}</strong>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Task Title <span className="text-red-500">*</span></label>
                        <input 
                            required
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g., Review slip conditions"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Assign To <span className="text-red-500">*</span></label>
                        {loadingProfiles ? (
                            <div className="text-gray-500 text-sm"><Loader2 className="animate-spin inline mr-2"/> Loading users...</div>
                        ) : (
                            <select 
                                required
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={assignedTo}
                                onChange={e => setAssignedTo(e.target.value)}
                            >
                                <option value="">Select User...</option>
                                {profiles?.map(p => (
                                    <option key={p.id} value={p.id}>{p.fullName} ({p.role})</option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
                            <select 
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                value={priority}
                                onChange={e => setPriority(e.target.value as TaskPriority)}
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Due Date</label>
                            <input 
                                type="date"
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                        <textarea 
                            rows={3}
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add details here..."
                        />
                    </div>

                    <div className="pt-4 border-t flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={createTaskMutation.isPending || !title || !assignedTo}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            {createTaskMutation.isPending && <Loader2 size={16} className="animate-spin"/>}
                            Assign Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssignTaskModal;
