import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { FileText, Send, Eye, Trash2, Edit2, DollarSign, Calendar, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function InvoicePanel({ isReadOnly = false, onFilteredCountChange, showInvoiceForm = false, setShowInvoiceForm = () => {}, renderButtonsOnly = false }) {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    booking_id: '',
    project_number: '',
    selected_project_id: '',
    customer_name: '',
    email: '',
    customer_company: '',
    service_of_interest: '',
    per_hour_rate: '',
    total_hours: '',
    discount: '',
    total_amount: '',
    created_date: new Date().toISOString().split('T')[0],
    payment_terms: 'Net 30',
    comments: '',
    status: 'draft',
  });

  useEffect(() => {
    loadInvoices();
    loadProjects();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invoices:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load invoices.',
      });
    } else {
      // Check for overdue invoices and update their status in the database
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const invoicesToUpdate = [];
      (data || []).forEach(invoice => {
        if (invoice.status === 'sent' && invoice.due_date) {
          const dueDate = new Date(invoice.due_date);
          dueDate.setHours(0, 0, 0, 0);

          if (today > dueDate) {
            invoicesToUpdate.push(invoice.id);
          }
        }
      });

      // Update overdue invoices in the database
      if (invoicesToUpdate.length > 0) {
        await supabase
          .from('Invoices')
          .update({ status: 'overdue' })
          .in('id', invoicesToUpdate);

        // Reload to get updated data
        const { data: updatedData } = await supabase
          .from('Invoices')
          .select('*')
          .order('created_at', { ascending: false });

        setInvoices(updatedData || []);
      } else {
        setInvoices(data || []);
      }
    }
    setLoading(false);
  };

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id, 
        project_number,
        name, 
        client_email, 
        service, 
        status, 
        hourly_rate, 
        total_hours,
        meeting_id,
        is_invoiced,
        meeting:meeting_id (company)
      `)
      .eq('status', 'completed')
      .eq('is_invoiced', false)
      .order('created_at', { ascending: false });

    if (!error) {
      setProjects(data || []);
    }
  };

  // Calculate due date based on payment terms
  const calculateDueDate = (paymentTerms, fromDate = new Date()) => {
    const date = new Date(fromDate);

    if (paymentTerms === 'Due on Receipt') {
      return date.toISOString().split('T')[0];
    }

    // Extract number of days from "Net X" format
    const match = paymentTerms.match(/Net (\d+)/);
    if (match) {
      const days = parseInt(match[1]);
      date.setDate(date.getDate() + days);
    }

    return date.toISOString().split('T')[0];
  };

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setFormData(prev => ({
        ...prev,
        selected_project_id: projectId,
        booking_id: project.meeting_id || '',
        project_number: project.project_number || '',
        customer_name: project.name || '',
        email: project.client_email || '',
        customer_company: project.meeting?.company || '',
        service_of_interest: project.service || '',
        per_hour_rate: project.hourly_rate || '',
        total_hours: project.total_hours || '',
      }));
    }
  };

  const calculateTotal = () => {
    const rate = parseFloat(formData.per_hour_rate) || 0;
    const hours = parseFloat(formData.total_hours) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const subtotal = rate * hours;
    const total = subtotal - discount;
    return Math.max(0, total).toFixed(2); // Ensure total doesn't go negative
  };

  useEffect(() => {
    if (formData.per_hour_rate && formData.total_hours) {
      setFormData(prev => ({
        ...prev,
        total_amount: calculateTotal(),
      }));
    }
  }, [formData.per_hour_rate, formData.total_hours, formData.discount]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'View-only access: creating invoices is disabled.',
      });
      return;
    }

    // Calculate due date based on payment terms
    const createdDate = new Date(formData.created_date);
    const calculatedDueDate = calculateDueDate(formData.payment_terms, createdDate);

    const invoiceData = {
      customer_name: formData.customer_name,
      email: formData.email,
      customer_company: formData.customer_company,
      service_of_interest: formData.service_of_interest,
      per_hour_rate: parseFloat(formData.per_hour_rate),
      total_hours: parseFloat(formData.total_hours),
      discount: formData.discount ? parseFloat(formData.discount) : 0,
      total_amount: parseFloat(formData.total_amount),
      payment_terms: formData.payment_terms,
      comments: formData.comments,
      status: formData.status,
      booking_id: formData.booking_id || null,
      project_number: formData.project_number || null,
      due_date: calculatedDueDate,
      created_at: formData.created_date ? `${formData.created_date}T00:00:00` : new Date().toISOString(),
    };

    if (editingInvoice) {
      // Update existing invoice
      const { error } = await supabase
        .from('Invoices')
        .update(invoiceData)
        .eq('id', editingInvoice.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update invoice.',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Invoice updated successfully!',
        });
        resetForm();
        loadInvoices();
      }
    } else {
      // Create new invoice
      const { error } = await supabase
        .from('Invoices')
        .insert([invoiceData]);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create invoice.',
        });
      } else {
        // Mark project as invoiced if it was selected from a project
        if (formData.selected_project_id) {
          await supabase
            .from('projects')
            .update({ is_invoiced: true })
            .eq('id', formData.selected_project_id);
        }

        toast({
          title: 'Success',
          description: 'Invoice created successfully!',
        });
        resetForm();
        loadInvoices();
        loadProjects(); // Refresh projects list to remove invoiced project
      }
    }
  };

  const resetForm = () => {
    setFormData({
      booking_id: '',
      project_number: '',
      selected_project_id: '',
      customer_name: '',
      email: '',
      customer_company: '',
      service_of_interest: '',
      per_hour_rate: '',
      total_hours: '',
      discount: '',
      total_amount: '',
      created_date: new Date().toISOString().split('T')[0],
      payment_terms: 'Net 30',
      comments: '',
      status: 'draft',
    });
    setEditingInvoice(null);
    setShowInvoiceForm(false);
  };

  const handleEdit = (invoice) => {
    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'View-only access: editing invoices is disabled.',
      });
      return;
    }

    setEditingInvoice(invoice);
    setFormData({
      booking_id: invoice.booking_id || '',
      project_number: invoice.project_number || '',
      selected_project_id: '',
      customer_name: invoice.customer_name,
      email: invoice.email,
      customer_company: invoice.customer_company || '',
      service_of_interest: invoice.service_of_interest || '',
      per_hour_rate: invoice.per_hour_rate.toString(),
      total_hours: invoice.total_hours.toString(),
      discount: invoice.discount ? invoice.discount.toString() : '',
      total_amount: invoice.total_amount.toString(),
      created_date: invoice.created_at ? new Date(invoice.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      payment_terms: invoice.payment_terms || 'Net 30',
      comments: invoice.comments || '',
      status: invoice.status,
    });
    setShowInvoiceForm(true);
  };

  const handleDelete = async (invoiceId) => {
    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'View-only access: deleting invoices is disabled.',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    const { error } = await supabase
      .from('Invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete invoice.',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully.',
      });
      loadInvoices();
    }
  };

  const handleVoid = async (invoiceId, invoiceNumber) => {
    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'View-only access: voiding invoices is disabled.',
      });
      return;
    }

    if (!confirm(`Are you sure you want to void invoice ${invoiceNumber}? This will move it to cancelled status.`)) {
      return;
    }

    const { error } = await supabase
      .from('Invoices')
      .update({ status: 'cancelled' })
      .eq('id', invoiceId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to void invoice.',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Invoice voided and moved to cancelled status.',
      });
      loadInvoices();
    }
  };

  const handleSendInvoice = async (invoice) => {
    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'View-only access: sending invoices is disabled.',
      });
      return;
    }

    if (!confirm(`Send invoice ${invoice.invoice_number} to ${invoice.email}?`)) {
      return;
    }

    toast({
      title: 'Sending...',
      description: 'Sending invoice email...',
    });

    const { data, error } = await supabase.functions.invoke('send-invoice', {
      body: { invoice_id: invoice.id }
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to send invoice: ${error.message}`,
      });
    } else {
      // Update invoice status to 'sent'
      await supabase
        .from('Invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      toast({
        title: 'Success',
        description: `Invoice sent to ${invoice.email}!`,
      });
      loadInvoices();
    }
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'View-only access: changing status is disabled.',
      });
      return;
    }

    const updateData = { status: newStatus };
    if (newStatus === 'paid') {
      updateData.paid_at = new Date().toISOString();
      updateData.payment_status = 'paid';
    }

    const { error } = await supabase
      .from('Invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update status.',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Status updated successfully.',
      });
      loadInvoices();
    }
  };

  // Calculate days overdue (returns 0 if not overdue)
  const getDaysOverdue = (invoice) => {
    if (!invoice.due_date) return 0;
    if (invoice.status === 'paid' || invoice.status === 'draft' || invoice.status === 'cancelled') return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);

    if (today > dueDate) {
      const diffTime = Math.abs(today - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  // Export invoices to CSV
  const exportToCSV = () => {
    if (filteredInvoices.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'No invoices to export.',
      });
      return;
    }

    const headers = [
      'Invoice Number',
      'Customer Name',
      'Email',
      'Company',
      'Service',
      'Rate (USD)',
      'Hours',
      'Total Amount (USD)',
      'Status',
      'Payment Status',
      'Payment Terms',
      'Due Date',
      'Created Date',
      'Sent Date',
      'Paid Date',
      'Comments'
    ];

    const rows = filteredInvoices.map(inv => [
      inv.invoice_number || '',
      inv.customer_name || '',
      inv.email || '',
      inv.customer_company || '',
      inv.service_of_interest || '',
      inv.per_hour_rate || '',
      inv.total_hours || '',
      inv.total_amount || '',
      inv.status || '',
      inv.payment_status || '',
      inv.payment_terms || '',
      inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
      inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '',
      inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : '',
      inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : '',
      inv.comments || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${statusFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Success',
      description: `Exported ${filteredInvoices.length} invoice(s) to CSV.`,
    });
  };

  // Export invoices to PDF
  const exportToPDF = () => {
    if (filteredInvoices.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data',
        description: 'No invoices to export.',
      });
      return;
    }

    // Create a printable HTML view
    const printWindow = window.open('', '_blank');
    const invoicesHTML = filteredInvoices.map(inv => `
      <div style="page-break-after: always; padding: 40px; font-family: Arial, sans-serif;">
        <div style="border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #667eea; margin: 0;">DATAVERSE DYNAMICS</h1>
          <p style="color: #666; margin: 5px 0 0 0;">Invoice</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h2 style="color: #333; margin: 0 0 10px 0;">${inv.invoice_number}</h2>
            <p style="margin: 5px 0; color: #666;"><strong>Status:</strong> ${inv.status.toUpperCase()}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Payment Status:</strong> ${inv.payment_status}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0; color: #666;"><strong>Created:</strong> ${new Date(inv.created_at).toLocaleDateString()}</p>
            ${inv.due_date ? `<p style="margin: 5px 0; color: #666;"><strong>Due Date:</strong> ${new Date(inv.due_date).toLocaleDateString()}</p>` : ''}
            <p style="margin: 5px 0; color: #666;"><strong>Payment Terms:</strong> ${inv.payment_terms}</p>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Bill To:</h3>
          <p style="margin: 5px 0; color: #333;"><strong>${inv.customer_name}</strong></p>
          <p style="margin: 5px 0; color: #666;">${inv.email}</p>
          ${inv.customer_company ? `<p style="margin: 5px 0; color: #666;">${inv.customer_company}</p>` : ''}
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Description</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Rate</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Hours</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #ddd;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border: 1px solid #ddd;">${inv.service_of_interest || 'Service'}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">$${inv.per_hour_rate}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${inv.total_hours}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">$${inv.total_amount}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #667eea; color: white; font-weight: bold;">
              <td colspan="3" style="padding: 12px; text-align: right; border: 1px solid #667eea;">Total Amount:</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #667eea;">$${inv.total_amount} USD</td>
            </tr>
          </tfoot>
        </table>

        ${inv.comments ? `<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #667eea;">
          <p style="margin: 0; color: #666;"><strong>Notes:</strong> ${inv.comments}</p>
        </div>` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p>Dataverse Dynamics | billing@dataversedynamics.org</p>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoices Export</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${invoicesHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    toast({
      title: 'Generating PDF',
      description: `Opening print dialog for ${filteredInvoices.length} invoice(s).`,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'paid': return 'bg-green-100 text-green-700 border-green-300';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-300';
      case 'cancelled': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getFilterButtonClass = (status, isSelected) => {
    const base = 'px-5 py-2 text-sm rounded-full border transition';
    if (isSelected) {
      if (status === 'draft') return `${base} border-yellow-400 bg-yellow-200 text-yellow-900`;
      if (status === 'sent') return `${base} border-blue-400 bg-blue-200 text-blue-900`;
      if (status === 'paid') return `${base} border-green-400 bg-green-200 text-green-900`;
      if (status === 'overdue') return `${base} border-red-400 bg-red-200 text-red-900`;
      if (status === 'cancelled') return `${base} border-orange-400 bg-orange-200 text-orange-900`;
      return `${base} border-slate-400 bg-slate-200 text-slate-900`;
    }
    if (status === 'draft') return `${base} border-yellow-300 bg-yellow-50 text-slate-900 hover:bg-yellow-100`;
    if (status === 'sent') return `${base} border-blue-300 bg-blue-50 text-slate-900 hover:bg-blue-100`;
    if (status === 'paid') return `${base} border-green-300 bg-green-50 text-slate-900 hover:bg-green-100`;
    if (status === 'overdue') return `${base} border-red-300 bg-red-50 text-slate-900 hover:bg-red-100`;
    if (status === 'cancelled') return `${base} border-orange-300 bg-orange-50 text-slate-900 hover:bg-orange-100`;
    return `${base} border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'overdue': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'all') return true;
    return inv.status === statusFilter;
  });

  // Notify parent when filtered count changes
  useEffect(() => {
    if (onFilteredCountChange) {
      onFilteredCountChange(filteredInvoices.length);
    }
  }, [filteredInvoices.length, onFilteredCountChange]);

  const renderButtons = () => (
    <div className="flex flex-row items-center justify-end gap-2">
      {filteredInvoices.length > 0 && (
        <>
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-1 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm border border-blue-400/50 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
            title="Export to CSV"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center justify-center gap-1 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm border border-blue-400/50 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
            title="Export to PDF"
          >
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </button>
        </>
      )}
      {!isReadOnly && (
        <button
          onClick={() => setShowInvoiceForm(!showInvoiceForm)}
          className="flex items-center justify-center gap-1 rounded-full px-3 sm:px-5 py-2 text-xs sm:text-sm border border-blue-400/50 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
        >
          {showInvoiceForm ? '✕' : '+'} <span className="whitespace-nowrap">{showInvoiceForm ? 'Cancel' : 'New Invoice'}</span>
        </button>
      )}
    </div>
  );

  if (renderButtonsOnly) {
    return renderButtons();
  }

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      {showInvoiceForm && !isReadOnly && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">
            {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Select from Completed Project */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select from Completed Project (Optional)
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Or enter manually --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project_number} - {project.name} - {project.client_email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Number (Read-only when selected) */}
              {formData.project_number && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={formData.project_number}
                    readOnly
                    className="w-full rounded-lg border border-blue-200 bg-blue-100 px-4 py-2.5 text-slate-600 cursor-not-allowed"
                  />
                </div>
              )}

              {/* Customer Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={formData.customer_company}
                  onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Acme Corp"
                />
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Service of Interest
                </label>
                <input
                  type="text"
                  value={formData.service_of_interest}
                  onChange={(e) => setFormData({ ...formData, service_of_interest: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Consulting Services"
                />
              </div>

              {/* Per Hour Rate */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Per Hour Rate (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.per_hour_rate}
                  onChange={(e) => setFormData({ ...formData, per_hour_rate: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="150.00"
                />
              </div>

              {/* Total Hours */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total Hours *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.total_hours}
                  onChange={(e) => setFormData({ ...formData, total_hours: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="40.00"
                />
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Discount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Total Amount (Auto-calculated) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Total Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  value={formData.total_amount}
                  className="w-full rounded-lg border border-blue-200 bg-blue-100 px-4 py-2.5 text-slate-600 cursor-not-allowed"
                  placeholder="Calculated automatically"
                />
              </div>

              {/* Created Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Created Date
                </label>
                <input
                  type="date"
                  value={formData.created_date}
                  onChange={(e) => setFormData({ ...formData, created_date: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Calculated Due Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Due Date (Auto-calculated)
                </label>
                <input
                  type="text"
                  readOnly
                  value={new Date(calculateDueDate(formData.payment_terms, new Date(formData.created_date))).toLocaleDateString()}
                  className="w-full rounded-lg border border-blue-200 bg-blue-100 px-4 py-2.5 text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Terms
                </label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Net 60">Net 60</option>
                  <option value="Net 90">Net 90</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Comments */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Comments
                </label>
                <textarea
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Additional notes or comments..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto rounded-full px-6 py-2.5 border border-blue-300 text-slate-700 hover:border-blue-400 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto rounded-full px-6 py-2.5 border border-blue-400/50 bg-blue-400/10 text-blue-600 transition hover:bg-blue-100"
              >
                {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status Filters */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 min-w-max border-b border-blue-200 pb-4">
          {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={getFilterButtonClass(status, statusFilter === status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-600">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-10 text-center text-slate-700">
            No invoices found. {!isReadOnly && 'Create your first invoice to get started!'}
          </div>
        ) : (
          filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="rounded-2xl border border-blue-200 bg-white p-6 hover:border-blue-400 shadow-sm transition"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <FileText className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-semibold text-slate-900">
                          {invoice.invoice_number}
                        </h3>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-slate-700 mt-1">{invoice.customer_name}</p>
                      <p className="text-slate-600 text-sm">{invoice.email}</p>
                      {invoice.customer_company && (
                        <p className="text-slate-600 text-sm">{invoice.customer_company}</p>
                      )}
                      {invoice.project_number && (
                        <p className="text-blue-600 text-sm font-medium mt-1">
                          📂 Project: {invoice.project_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Service</p>
                      <p className="text-slate-900">{invoice.service_of_interest || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Rate/Hour</p>
                      <p className="text-slate-900">${invoice.per_hour_rate}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Hours</p>
                      <p className="text-slate-900">{invoice.total_hours}</p>
                    </div>
                    {invoice.discount > 0 ? (
                      <>
                        <div>
                          <p className="text-slate-600">Subtotal</p>
                          <p className="text-slate-700">${(invoice.per_hour_rate * invoice.total_hours).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Discount</p>
                          <p className="text-orange-500 font-medium">-${parseFloat(invoice.discount).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Total Amount</p>
                          <p className="text-green-600 font-semibold text-lg">${invoice.total_amount}</p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-slate-600">Total Amount</p>
                        <p className="text-green-600 font-semibold text-lg">${invoice.total_amount}</p>
                      </div>
                    )}
                  </div>

                  {invoice.due_date && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                      <span className="text-slate-600">•</span>
                      <span>{invoice.payment_terms}</span>
                      {getDaysOverdue(invoice) > 0 && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="text-red-600 font-semibold">
                            {getDaysOverdue(invoice)} {getDaysOverdue(invoice) === 1 ? 'day' : 'days'} overdue
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {invoice.comments && (
                    <div className="mt-3 text-sm text-slate-600">
                      <p className="italic">"{invoice.comments}"</p>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-slate-600">
                    Created: {new Date(invoice.created_at).toLocaleString()}
                    {invoice.sent_at && (
                      <span> • Sent: {new Date(invoice.sent_at).toLocaleString()}</span>
                    )}
                    {invoice.paid_at && (
                      <span> • Paid: {new Date(invoice.paid_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  {invoice.status === 'draft' && !isReadOnly && (
                    <button
                      onClick={() => handleSendInvoice(invoice)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-green-500/50 bg-green-50 text-green-700 transition hover:bg-green-100"
                      title="Send invoice"
                    >
                      <Send className="h-4 w-4" />
                      <span className="sm:hidden">Send</span>
                    </button>
                  )}
                  {!isReadOnly && (
                    <>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-blue-400/50 bg-blue-50 text-blue-700 transition hover:border-blue-400"
                          title="Edit invoice"
                        >
                          <Edit2 className="h-4 w-4" />
                          <span className="sm:hidden">Edit</span>
                        </button>
                      )}
                      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange(invoice.id, 'paid')}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-green-500/50 bg-green-50 text-green-700 transition hover:border-green-500"
                          title="Mark as paid"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span className="sm:hidden">Paid</span>
                        </button>
                      )}
                      {(invoice.status === 'draft' || invoice.status === 'sent') && (
                        <button
                          onClick={() => handleStatusChange(invoice.id, 'overdue')}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-orange-500/50 bg-orange-50 text-orange-700 transition hover:border-orange-500"
                          title="Mark as overdue"
                        >
                          <Clock className="h-4 w-4" />
                          <span className="sm:hidden">Overdue</span>
                        </button>
                      )}
                      {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'overdue') && (
                        <button
                          onClick={() => handleVoid(invoice.id, invoice.invoice_number)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-orange-400/50 bg-orange-50 text-orange-700 transition hover:border-orange-400"
                          title="Void invoice"
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="sm:hidden">Void</span>
                        </button>
                      )}
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-red-500/50 bg-red-50 text-red-700 transition hover:border-red-500"
                          title="Delete invoice permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sm:hidden">Delete</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
