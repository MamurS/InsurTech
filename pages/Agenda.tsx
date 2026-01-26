
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAgendaTasks, useUpdateTaskStatus } from '../hooks/useAgenda';
import { formatDate } from '../utils/dateUtils';
import AssignTaskModal from '../components/AssignTaskModal';
import { 
    ClipboardList, Filter, Search, CheckCircle, Clock, 
    AlertCircle, Briefcase, Plus, MoreHorizontal, ArrowRight 
} from 'lucide-react';
import { TaskStatus } from '../types';

const Agenda: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('PENDING');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Fetch tasks (for current user only, unless admin - simple logic here: viewing own agenda)
    // To view TEAM agenda, we would pass undefined as userId. For now, let's focus on "My Agenda"
    const { data: tasks, isLoading } = useAgendaTasks(user?.id, statusFilter === 'ALL' ? undefined : statusFilter);
    const updateStatusMutation = useUpdateTaskStatus();

    const handleTaskClick = (task: any) => {
        if (task.entityType === 'POLICY' && task.entityId) {
            navigate(`/edit/${task.entityId}`);
        } else if (task.entityType === 'SLIP' && task.entityId) {
            navigate(`/slips/edit/${task.entityId}`);
        } else if (task.entityType === 'CLAIM' && task.entityId) {
            navigate(`/claims/${task.entityId}`);
        }
    };

    const handleComplete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        updateStatusMutation.mutate({ id, status: 'COMPLETED' });
    };

    const getPriorityColor = (p: string) => {
        switch(p) {
            case 'URGENT': return 'bg-red-100 text-red-700 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'MEDIUM': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    // Quick Stats
    const pendingCount = tasks?.filter(t => t.status === 'PENDING').length || 0;
    const overdueCount = tasks?.filter(t => t.isOverdue).length || 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ClipboardList className="text-blue-600"/> My Agenda
                    </h2>
                    <p className="text-gray-500 text-sm">Track your assigned cases and to-dos.</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-100">
                        <AlertCircle size={16}/> {overdueCount} Overdue
                    </div>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-all text-sm"
                    >
                        <Plus size={16}/> New Task
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex bg-gray-100 p-1 rounded-lg shrink-0 overflow-x-auto">
                    {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-all whitespace-nowrap ${
                                statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">Loading agenda...</div>
                ) : tasks?.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                        <CheckCircle size={48} className="mb-4 text-green-100"/>
                        <p className="text-lg font-medium text-gray-600">All caught up!</p>
                        <p className="text-sm">No tasks found for the selected filter.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {tasks?.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).map(task => (
                            <div 
                                key={task.id}
                                onClick={() => handleTaskClick(task)}
                                className="p-4 hover:bg-blue-50/30 transition-colors cursor-pointer group flex flex-col md:flex-row gap-4 items-start md:items-center"
                            >
                                {/* Priority Stripe */}
                                <div className={`w-1 self-stretch rounded-full ${
                                    task.priority === 'URGENT' ? 'bg-red-500' : 
                                    task.priority === 'HIGH' ? 'bg-orange-500' : 
                                    'bg-blue-300'
                                }`}></div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className={`font-bold text-gray-800 truncate ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
                                            {task.title}
                                        </h3>
                                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${getPriorityColor(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                        {task.isOverdue && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                <Clock size={10}/> OVERDUE
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                                        {task.policyNumber && (
                                            <span className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                                <Briefcase size={12}/> {task.policyNumber}
                                            </span>
                                        )}
                                        {task.dueDate && (
                                            <span>Due: <span className={`font-medium ${task.isOverdue ? 'text-red-600' : 'text-gray-700'}`}>{formatDate(task.dueDate)}</span></span>
                                        )}
                                        <span>Assigned by: {task.assignedByName || 'System'}</span>
                                    </div>
                                    {task.description && (
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">{task.description}</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {task.status !== 'COMPLETED' && (
                                        <button 
                                            onClick={(e) => handleComplete(e, task.id)}
                                            className="px-3 py-1.5 bg-white border border-green-200 text-green-700 hover:bg-green-50 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
                                        >
                                            <CheckCircle size={14}/> Done
                                        </button>
                                    )}
                                    <div className="text-gray-300">
                                        <ArrowRight size={18}/>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AssignTaskModal 
                isOpen={showCreateModal} 
                onClose={() => setShowCreateModal(false)}
                preSelectedUser={user?.id}
            />
        </div>
    );
};

export default Agenda;
