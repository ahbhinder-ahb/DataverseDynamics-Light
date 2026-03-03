import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export default function StartProjectSheet({ booking, isOpen, onClose, onProjectCreated }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [projectNumber, setProjectNumber] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service: '',
    client_email: '',
    company: '',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: '',
    hourly_rate: '',
  });

  // Generate project number and initialize form when modal opens
  useEffect(() => {
    if (isOpen && booking) {
      // Initialize form data with booking information
      setFormData({
        name: `${booking.service_of_interest || 'Project'} - ${booking.full_name || 'Client'}`,
        description: booking.service_of_interest || '',
        service: booking.service_of_interest || '',
        client_email: booking.email || '',
        company: booking.company || '',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget: '',
        hourly_rate: '',
      });

      const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const tempNumber = `PRJ-${currentMonth}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      setProjectNumber(tempNumber);
    }
  }, [isOpen, booking]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.client_email) {
      toast({
        title: 'Missing Fields',
        description: 'Project name and client email are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // Create the project
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          project_number: projectNumber,
          name: formData.name,
          description: formData.description,
          service: formData.service,
          client_email: formData.client_email,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          meeting_id: booking.id,
        });

      if (projectError) throw projectError;

      // Fetch the project by project_number to get the ID
      const { data: fetchedProject, error: fetchError } = await supabase
        .from('projects')
        .select('id')
        .eq('project_number', projectNumber)
        .single();

      if (fetchError) throw fetchError;

      if (fetchedProject) {
        // Update the booking with the project_id
        const { error: updateError } = await supabase
          .from('Contact Us Details')
          .update({ project_id: fetchedProject.id })
          .eq('id', booking.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Success',
        description: `Project "${formData.name}" created successfully!`,
      });

      // Reset form and close
      setFormData({
        name: `${booking?.service_of_interest || 'Project'} - ${booking?.full_name || 'Client'}`,
        description: booking?.service_of_interest || '',
        service: booking?.service_of_interest || '',
        client_email: booking?.email || '',
        company: booking?.company || '',
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        budget: '',
        hourly_rate: '',
      });

      onClose();
      onProjectCreated();
    } catch (err) {
      console.error('Error creating project:', err);
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-blue-200 shadow-2xl sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-blue-200 bg-blue-50 backdrop-blur p-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Start New Project</h2>
            <p className="text-sm text-slate-600 mt-1">From meeting: {booking.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 transition text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Meeting Details (Read-Only) */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Meeting Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Client:</span>
                <p className="text-slate-900 font-medium">{booking.full_name}</p>
              </div>
              <div>
                <span className="text-slate-600">Email:</span>
                <p className="text-slate-900 font-medium">{booking.email}</p>
              </div>
              {booking.company && (
                <div>
                  <span className="text-slate-600">Company:</span>
                  <p className="text-slate-900 font-medium">{booking.company}</p>
                </div>
              )}
              {booking.service_of_interest && (
                <div>
                  <span className="text-slate-600">Service:</span>
                  <p className="text-slate-900 font-medium">{booking.service_of_interest}</p>
                </div>
              )}
            </div>
          </div>

          {/* Project Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Project Information</h3>

            <div>
              <label className="block text-sm text-slate-700 mb-2">Project ID</label>
              <input
                type="text"
                value={projectNumber || 'Generating...'}
                disabled
                className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-slate-900 cursor-not-allowed font-semibold"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-900 mb-2">Project Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                placeholder="Enter project name"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-900 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                placeholder="Add project details or notes"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-900 mb-2">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 mb-2">End Date</label>
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
                <label className="block text-sm text-slate-900 mb-2">Status</label>
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
                <label className="block text-sm text-slate-900 mb-2">Budget</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 5000"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-900 mb-2">Hourly Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 75"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-end pt-4 border-t border-blue-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto rounded-lg px-5 py-2 text-sm border border-blue-300 bg-white text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto rounded-lg px-5 py-2 text-sm border border-orange-400/50 bg-orange-400/10 text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}