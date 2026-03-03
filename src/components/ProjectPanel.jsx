import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export default function ProjectPanel({ isReadOnly = false, onFilteredCountChange, showProjectForm = false, setShowProjectForm = () => {} }) {
  const { toast } = useToast();
  const readOnlyMessage = 'View-only access: changes are disabled.';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service: '',
    client_email: '',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: '',
    hourly_rate: '',
    total_hours: '',
  });

  // State for completion modal
  const [completionModal, setCompletionModal] = useState({
    isOpen: false,
    projectId: null,
    hours: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast({
        title: 'Error',
        description: 'Failed to load projects. Make sure the Projects table exists.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isReadOnly) {
      toast({
        title: 'Read-Only',
        description: readOnlyMessage,
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name || !formData.client_email) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            description: formData.description,
            service: formData.service,
            client_email: formData.client_email,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date,
            budget: formData.budget ? parseFloat(formData.budget) : null,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
            total_hours: formData.total_hours ? parseFloat(formData.total_hours) : null,
          })
          .eq('id', editingProject.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Project updated successfully.',
        });
      } else {
        const { error } = await supabase.from('projects').insert([
          {
            name: formData.name,
            description: formData.description,
            service: formData.service,
            client_email: formData.client_email,
            status: formData.status,
            start_date: formData.start_date,
            end_date: formData.end_date,
            budget: formData.budget ? parseFloat(formData.budget) : null,
            hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
            total_hours: formData.total_hours ? parseFloat(formData.total_hours) : null,
          },
        ]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Project created successfully.',
        });
      }

      setFormData({
        name: '',
        description: '',
        client_email: '',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget: '',
        hourly_rate: '',
        total_hours: '',
      });
      setEditingProject(null);
      setShowProjectForm(false);
      fetchProjects();
    } catch (err) {
      console.error('Error saving project:', err);
      toast({
        title: 'Error',
        description: 'Failed to save project.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (project) => {
    if (isReadOnly) {
      toast({
        title: 'Read-Only',
        description: readOnlyMessage,
        variant: 'destructive',
      });
      return;
    }

    if (project.is_invoiced) {
      toast({
        title: 'Cannot Edit',
        description: 'This project has been invoiced and cannot be edited.',
        variant: 'destructive',
      });
      return;
    }
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      client_email: project.client_email,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date || '',
      budget: project.budget || '',
      hourly_rate: project.hourly_rate || '',
      total_hours: project.total_hours || '',
    });
    setShowProjectForm(true);
  };

  const handleDelete = async (projectId) => {
    if (isReadOnly) {
      toast({
        title: 'Read-Only',
        description: readOnlyMessage,
        variant: 'destructive',
      });
      return;
    }

    const project = projects.find(p => p.id === projectId);
    if (project?.is_invoiced) {
      toast({
        title: 'Cannot Delete',
        description: 'This project has been invoiced and cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Project deleted successfully.',
      });
      fetchProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete project.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusUpdate = async (projectId, newStatus) => {
    if (isReadOnly) {
      toast({
        title: 'Read-Only',
        description: readOnlyMessage,
        variant: 'destructive',
      });
      return;
    }

    try {
      // If changing to completed status, show modal for hours input
      if (newStatus === 'completed') {
        setCompletionModal({
          isOpen: true,
          projectId: projectId,
          hours: '',
        });
        return;
      }

      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) throw error;
      toast({
        title: 'Success',
        description: `Project marked as ${newStatus}.`,
      });
      fetchProjects();
    } catch (err) {
      console.error('Error updating project status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update project status.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteWithHours = async () => {
    if (isReadOnly) {
      toast({
        title: 'Read-Only',
        description: readOnlyMessage,
        variant: 'destructive',
      });
      return;
    }

    try {
      const hours = parseFloat(completionModal.hours);

      if (!completionModal.hours || hours <= 0) {
        toast({
          title: 'Missing Hours',
          description: 'Please enter valid total working hours (greater than 0).',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('projects')
        .update({
          status: 'completed',
          total_hours: hours
        })
        .eq('id', completionModal.projectId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Project marked as completed with ${hours} hours.`,
      });

      setCompletionModal({
        isOpen: false,
        projectId: null,
        hours: '',
      });

      fetchProjects();
    } catch (err) {
      console.error('Error completing project:', err);
      toast({
        title: 'Error',
        description: 'Failed to complete project.',
        variant: 'destructive',
      });
    }
  };

  const filteredProjects = projects.filter(
    (p) => filterStatus === 'all' || p.status === filterStatus
  );

  // Notify parent when filtered count changes
  useEffect(() => {
    if (onFilteredCountChange) {
      onFilteredCountChange(filteredProjects.length);
    }
  }, [filteredProjects.length, onFilteredCountChange]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-400';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-400';
      case 'on-hold':
        return 'bg-orange-100 text-orange-700 border-orange-400';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-400';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-400';
    }
  };

  const getFilterButtonClass = (status, isSelected) => {
    const base = 'px-5 py-2 text-sm rounded-full border transition';
    if (isSelected) {
      if (status === 'active') return `${base} border-green-400 bg-green-200 text-green-900`;
      if (status === 'completed') return `${base} border-blue-400 bg-blue-200 text-blue-900`;
      if (status === 'on-hold') return `${base} border-orange-400 bg-orange-200 text-orange-900`;
      if (status === 'cancelled') return `${base} border-red-400 bg-red-200 text-red-900`;
      return `${base} border-slate-400 bg-slate-200 text-slate-900`;
    }
    if (status === 'active') return `${base} border-green-300 bg-green-50 text-slate-900 hover:bg-green-100`;
    if (status === 'completed') return `${base} border-blue-300 bg-blue-50 text-slate-900 hover:bg-blue-100`;
    if (status === 'on-hold') return `${base} border-orange-300 bg-orange-50 text-slate-900 hover:bg-orange-100`;
    if (status === 'cancelled') return `${base} border-red-300 bg-red-50 text-slate-900 hover:bg-red-100`;
    return `${base} border-blue-300 bg-blue-50 text-slate-900 hover:bg-blue-100`;
  };

  return (
    <div className="space-y-6">
      {/* Project Form */}
      {showProjectForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {editingProject ? 'Edit Project' : 'Create New Project'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Client Email *</label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-1">Service</label>
              <input
                type="text"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Web Development, Consulting"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="Project description"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Budget</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-700 mb-1">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 75"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-700 mb-1">Total Hours</label>
              <input
                type="number"
                step="0.01"
                value={formData.total_hours}
                onChange={(e) => setFormData({ ...formData, total_hours: e.target.value })}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g., 40"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowProjectForm(false);
                  setEditingProject(null);
                }}
                className="w-full sm:w-auto rounded-lg px-4 py-2 text-sm border border-slate-300 bg-slate-100 text-slate-700 transition hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto rounded-lg px-4 py-2 text-sm border border-blue-500 bg-blue-500 text-white transition hover:bg-blue-600"
              >
                {editingProject ? 'Update' : 'Create'} Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Stats */}
      <div className="overflow-x-auto scrollbar-hide bg-white rounded-lg p-3">
        <div className="flex gap-3 min-w-max">
          {['all', 'active', 'on-hold', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={getFilterButtonClass(status, filterStatus === status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="text-slate-600 text-center py-8">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-slate-600 text-center py-8">No projects found</div>
      ) : (
        <div className="grid gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-xl border border-blue-200 bg-white p-4 hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-slate-900">{project.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    {project.is_invoiced && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium border border-emerald-400 bg-emerald-400/10 text-emerald-400">
                        💰 Invoiced
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-600 mb-2">{project.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Client:</span>
                      <p className="text-slate-900">{project.client_email}</p>
                    </div>
                    {project.service && (
                      <div>
                        <span className="text-slate-600">Service:</span>
                        <p className="text-slate-900">{project.service}</p>
                      </div>
                    )}
                    {project.start_date && (
                      <div>
                        <span className="text-slate-600">Start:</span>
                        <p className="text-slate-900">{new Date(project.start_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {project.end_date && (
                      <div>
                        <span className="text-slate-600">End:</span>
                        <p className="text-slate-900">{new Date(project.end_date).toLocaleDateString()}</p>
                      </div>
                    )}
                    {project.budget && (
                      <div>
                        <span className="text-slate-600">Budget:</span>
                        <p className="text-slate-900">${parseFloat(project.budget).toFixed(2)}</p>
                      </div>
                    )}
                    {project.hourly_rate && (
                      <div>
                        <span className="text-slate-600">Rate:</span>
                        <p className="text-slate-900">${parseFloat(project.hourly_rate).toFixed(2)}/hr</p>
                      </div>
                    )}
                    {project.total_hours && (
                      <div>
                        <span className="text-slate-600">Hours:</span>
                        <p className="text-slate-900">{parseFloat(project.total_hours).toFixed(2)}h</p>
                      </div>
                    )}
                    {project.total_hours && project.hourly_rate && (
                      <div>
                        <span className="text-slate-600">Total Value:</span>
                        <p className="text-orange-600 font-semibold">${(parseFloat(project.total_hours) * parseFloat(project.hourly_rate)).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  {!isReadOnly && !project.is_invoiced && (
                    <button
                      onClick={() => handleEdit(project)}
                      className="w-full rounded-full px-3 sm:px-0 py-2.5 sm:py-0 sm:w-10 sm:h-10 h-10 flex items-center justify-center border border-blue-400 bg-blue-50 text-blue-600 transition hover:border-blue-500 hover:bg-blue-100"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  )}
                  {!isReadOnly && (project.status === 'active' || project.status === 'on-hold') && (
                    <>
                      {project.status === 'active' ? (
                        <button
                          onClick={() => handleStatusUpdate(project.id, 'on-hold')}
                          className="w-full rounded-full px-3 sm:px-0 py-2.5 sm:py-0 sm:w-10 sm:h-10 h-10 flex items-center justify-center border border-orange-400 bg-orange-50 text-orange-600 transition hover:border-orange-500 hover:bg-orange-100"
                          title="On Hold"
                        >
                          ⏸️
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusUpdate(project.id, 'active')}
                          className="w-full rounded-full px-3 sm:px-0 py-2.5 sm:py-0 sm:w-10 sm:h-10 h-10 flex items-center justify-center border border-green-600 bg-green-50 text-green-600 transition hover:border-green-700 hover:bg-green-100"
                          title="Resume to Active"
                        >
                          ▶️
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusUpdate(project.id, 'completed')}
                        className="w-full rounded-full px-3 sm:px-0 py-2.5 sm:py-0 sm:w-10 sm:h-10 h-10 flex items-center justify-center border border-blue-600 bg-blue-50 text-blue-600 transition hover:border-blue-700 hover:bg-blue-100"
                        title="Completed"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(project.id, 'cancelled')}
                        className="w-full rounded-full px-3 sm:px-0 py-2.5 sm:py-0 sm:w-10 sm:h-10 h-10 flex items-center justify-center border border-slate-400 bg-slate-100 text-slate-600 transition hover:border-slate-500 hover:bg-slate-200"
                        title="Cancelled"
                      >
                        ✕
                      </button>
                    </>
                  )}
                  {!isReadOnly && !project.is_invoiced && (
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="w-full rounded-full px-3 sm:px-0 py-2.5 sm:py-0 sm:w-10 sm:h-10 h-10 flex items-center justify-center border border-red-400 bg-red-50 text-red-600 transition hover:border-red-500 hover:bg-red-100"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hours Input Modal */}
      {completionModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-blue-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              Mark Project as Completed
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              Please enter the total working hours for this project.
            </p>

            <div className="mb-6">
              <label className="block text-sm text-slate-700 mb-2">Total Hours *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={completionModal.hours}
                onChange={(e) => setCompletionModal({ ...completionModal, hours: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCompleteWithHours();
                  }
                }}
                className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter hours (e.g., 40)"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => setCompletionModal({ isOpen: false, projectId: null, hours: '' })}
                className="w-full sm:w-auto rounded-lg px-4 py-2.5 text-sm border border-slate-300 bg-slate-100 text-slate-700 transition hover:border-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteWithHours}
                className="w-full sm:w-auto rounded-lg px-4 py-2.5 text-sm border border-green-600 bg-green-600 text-white transition hover:bg-green-700"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
