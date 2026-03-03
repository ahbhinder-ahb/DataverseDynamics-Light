import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, LogOut, ShieldCheck, Briefcase, FileText } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';
import { seoMetadata } from '@/config/seoMetadata';
import AdminBlockedSlotsPanel from '@/components/AdminBlockedSlotsPanel';
import InvoicePanel from '@/components/InvoicePanel';
import ProjectPanel from '@/components/ProjectPanel';
import StartProjectSheet from '@/components/StartProjectSheet';
import ChatConversationsPanel from '@/components/ChatConversationsPanel';
import LogoSVG from '@/components/LogoSVG';
import { adminPWA } from '@/lib/adminPWAManager';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Up Coming' },
  { id: 'tentative', label: 'Tentative' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'attended', label: 'Attended' },
  { id: 'missed', label: 'Missed' },
  { id: 'noshow', label: 'No Show' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [bookingMessages, setBookingMessages] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [earlyReminderPendingBookingId, setEarlyReminderPendingBookingId] = useState(null);
  const [startProjectSheetOpen, setStartProjectSheetOpen] = useState(false);
  const [selectedBookingForProject, setSelectedBookingForProject] = useState(null);
  const [activeTab, setActiveTab] = useState('blocked-slots'); // 'bookings' | 'blocked-slots' | 'analytics' | 'projects' | 'invoices' | 'chatbot'
  const [trendRangeStart, setTrendRangeStart] = useState(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().split('T')[0];
  });
  const [trendRangeEnd, setTrendRangeEnd] = useState(() => {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    end.setHours(0, 0, 0, 0);
    return end.toISOString().split('T')[0];
  });
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState('');
  const [trendData, setTrendData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  // Invoice Analytics state
  const [invoiceAnalyticsRangeStart, setInvoiceAnalyticsRangeStart] = useState(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().split('T')[0];
  });
  const [invoiceAnalyticsRangeEnd, setInvoiceAnalyticsRangeEnd] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end.toISOString().split('T')[0];
  });
  const [invoiceRevenueData, setInvoiceRevenueData] = useState([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState({
    totalRevenue: 0,
    totalInvoices: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    overdueAmount: 0,
    cancelledAmount: 0,
    draftCount: 0,
    paidCount: 0,
    unpaidCount: 0,
    overdueCount: 0,
    cancelledCount: 0
  });
  const [invoiceAnalyticsLoading, setInvoiceAnalyticsLoading] = useState(false);
  const [invoiceAnalyticsError, setInvoiceAnalyticsError] = useState(null);
  const [totalInvoiceCount, setTotalInvoiceCount] = useState(0);
  const [filteredInvoiceCount, setFilteredInvoiceCount] = useState(0);
  const [filteredProjectCount, setFilteredProjectCount] = useState(0);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  // Project Analytics state
  const [projectsRangeStart, setProjectsRangeStart] = useState(() => {
    const start = new Date();
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);
    return start.toISOString().split('T')[0];
  });
  const [projectsRangeEnd, setProjectsRangeEnd] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end.toISOString().split('T')[0];
  });
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [projectsStatusData, setProjectsStatusData] = useState([]);
  const [projectsDateData, setProjectsDateData] = useState([]);
  const [projectsSummary, setProjectsSummary] = useState({
    totalProjects: 0,
    activeCount: 0,
    completedCount: 0,
    onHoldCount: 0,
    cancelledCount: 0,
    totalBudget: 0
  });
  const [meetingSummary, setMeetingSummary] = useState({
    totalMeetings: 0,
    confirmedCount: 0,
    tentativeCount: 0,
    attendedCount: 0,
    missedCount: 0,
    noShowCount: 0,
    cancelledCount: 0
  });

  useSEO(seoMetadata['/admin']);

  const isReadOnlyAdmin = user?.app_metadata?.role === 'admin_view';
  const readOnlyMessage = 'View-only access: changes are disabled.';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login');
      return;
    }

    // Require explicit admin or admin_view role
    if (!loading && user) {
      const userRole = user?.app_metadata?.role;
      if (userRole !== 'admin' && userRole !== 'admin_view') {
        console.warn('Access denied: User does not have valid admin role');
        signOut();
        navigate('/admin/login');
      }
    }
  }, [loading, user, navigate, signOut]);

  // Initialize Admin PWA
  useEffect(() => {
    // Listen for service worker updates
    const handleUpdate = (data) => {
      // Optionally show a toast notification for update
    };

    const handleOnlineStatusChange = (data) => {
      console.error('Online status changed:', data.online);
    };

    const handleStatusChange = (status) => {
      setPwaInstalled(status.isInstalled || false);
    };

    adminPWA.on('serviceWorkerUpdate', handleUpdate);
    adminPWA.on('onlineStatusChange', handleOnlineStatusChange);
    adminPWA.on('statusChange', handleStatusChange);

    // Set initial PWA status
    const initialStatus = adminPWA.getStatus();
    setPwaInstalled(initialStatus.isInstalled || false);

    return () => {
      adminPWA.off('serviceWorkerUpdate', handleUpdate);
      adminPWA.off('onlineStatusChange', handleOnlineStatusChange);
      adminPWA.off('statusChange', handleStatusChange);
    };
  }, []);

  const setBookingMessage = (bookingId, message, isPersistent = false) => {
    setBookingMessages(prev => ({ ...prev, [bookingId]: message }));
    if (!isPersistent) {
      setTimeout(() => {
        setBookingMessages(prev => {
          const updated = { ...prev };
          delete updated[bookingId];
          return updated;
        });
      }, 5000);
    }
  };

  const loadBookings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('Contact Us Details')
      .select('id, full_name, email, company, phone_number, service_of_interest, preferred_date, preferred_time, status, created_at, meet_link, reminder_sent')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error loading bookings:', error);
      setBookings([]);
      return;
    }

    // Fetch projects for each booking
    if (data) {
      const bookingsWithProjects = await Promise.all(
        data.map(async (booking) => {
          const { data: projects } = await supabase
            .from('projects')
            .select('project_number')
            .eq('meeting_id', booking.id);

          return {
            ...booking,
            projects: projects || []
          };
        })
      );
      setBookings(bookingsWithProjects);
    } else {
      setBookings([]);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [user]);

  // Fetch total invoice count for invoices tab
  useEffect(() => {
    if (activeTab !== 'invoices') return;
    
    const fetchInvoiceCount = async () => {
      try {
        const { count, error } = await supabase
          .from('Invoices')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error('Error fetching invoice count:', error);
          setTotalInvoiceCount(0);
        } else {
          setTotalInvoiceCount(count || 0);
        }
      } catch (err) {
        console.error('Error fetching invoice count:', err);
        setTotalInvoiceCount(0);
      }
    };
    
    fetchInvoiceCount();
  }, [activeTab]);

  const normalizeStatusForChart = (status) => {
    const value = (status || '').toLowerCase();
    if (value.includes('cancel')) return 'Cancelled';
    if (value === 'confirmed') return 'Confirmed';
    if (value === 'meet link generated') return 'Tentative';
    if (value === 'attended') return 'Attended';
    if (value === 'missed') return 'Missed';
    if (value === 'no show') return 'No Show';
    return null;
  };

  const fetchTrendData = async () => {
    if (!trendRangeStart || !trendRangeEnd) return;
    setTrendLoading(true);
    setTrendError('');

    try {
      const { data: trendRows, error: trendError } = await supabase
        .from('Contact Us Details')
        .select('preferred_date')
        .gte('preferred_date', trendRangeStart)
        .lte('preferred_date', trendRangeEnd)
        .not('preferred_date', 'is', null)
        .order('preferred_date', { ascending: true })
        .range(0, 2000);

      const { data: statusRows, error: statusError } = await supabase
        .from('Contact Us Details')
        .select('status, preferred_date, created_at')
        .gte('created_at', `${trendRangeStart}T00:00:00`)
        .lte('created_at', `${trendRangeEnd}T23:59:59`)
        .order('created_at', { ascending: true })
        .range(0, 2000);

      if (trendError || statusError) {
        setTrendError('Failed to load trend data.');
        setTrendData([]);
        setStatusData([]);
        return;
      }

      const dateCounts = {};
      const statusCounts = {};

      (trendRows || []).forEach((row) => {
        if (row.preferred_date) {
          dateCounts[row.preferred_date] = (dateCounts[row.preferred_date] || 0) + 1;
        }
      });

      (statusRows || []).forEach((row) => {
        const statusKey = normalizeStatusForChart(row.status);
        if (statusKey) {
          statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
        }
      });

      const nextTrendData = Object.keys(dateCounts)
        .sort()
        .map((date) => ({ date, count: dateCounts[date] }));

      const statusOrder = [
        'Confirmed',
        'Tentative',
        'Attended',
        'Missed',
        'No Show',
        'Cancelled',
      ];

      const nextStatusData = statusOrder.map((key) => ({
        status: key,
        count: statusCounts[key] || 0,
      }));

      setTrendData(nextTrendData);
      setStatusData(nextStatusData);
      
      // Calculate meeting summary
      const totalMeetings = nextStatusData.reduce((sum, item) => sum + item.count, 0);
      setMeetingSummary({
        totalMeetings: totalMeetings,
        confirmedCount: statusCounts['Confirmed'] || 0,
        tentativeCount: statusCounts['Tentative'] || 0,
        attendedCount: statusCounts['Attended'] || 0,
        missedCount: statusCounts['Missed'] || 0,
        noShowCount: statusCounts['No Show'] || 0,
        cancelledCount: statusCounts['Cancelled'] || 0
      });
    } catch (err) {
      setTrendError('Failed to load trend data.');
      setTrendData([]);
      setStatusData([]);
      setMeetingSummary({
        totalMeetings: 0,
        confirmedCount: 0,
        tentativeCount: 0,
        attendedCount: 0,
        missedCount: 0,
        noShowCount: 0,
        cancelledCount: 0
      });
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    if (trendRangeStart && trendRangeEnd && trendRangeStart <= trendRangeEnd) {
      fetchTrendData();
    }
  }, [activeTab, trendRangeStart, trendRangeEnd]);

  // Fetch Invoice Analytics
  const fetchInvoiceAnalytics = async () => {
    setInvoiceAnalyticsLoading(true);
    setInvoiceAnalyticsError(null);

    try {
      // Fetch invoices with created_at timestamp filtering
      const { data: invoices, error } = await supabase
        .from('Invoices')
        .select('*')
        .gte('created_at', `${invoiceAnalyticsRangeStart}T00:00:00`)
        .lte('created_at', `${invoiceAnalyticsRangeEnd}T23:59:59`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Invoice analytics error:', error);
        // Check if table doesn't exist
        if (error.code === '42P01' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
          setInvoiceAnalyticsError('⚠️ Invoices table not found. Please run database/create-invoices-table.sql in Supabase SQL Editor to set up the invoices system.');
        } else {
          setInvoiceAnalyticsError(`Failed to load invoice analytics: ${error.message || 'Unknown error'}`);
        }
        setInvoiceRevenueData([]);
        setInvoiceStatusData([]);
        setInvoiceSummary({ totalRevenue: 0, totalInvoices: 0, paidAmount: 0, unpaidAmount: 0, overdueAmount: 0, cancelledAmount: 0, draftCount: 0, paidCount: 0, unpaidCount: 0, overdueCount: 0, cancelledCount: 0 });
        return;
      }

      // Calculate revenue by date
      const dateCounts = {};
      (invoices || []).forEach((inv) => {
        const date = inv.created_at?.split('T')[0];
        if (date) {
          if (!dateCounts[date]) {
            dateCounts[date] = { date, revenue: 0 };
          }
          dateCounts[date].revenue += parseFloat(inv.total_amount || 0);
        }
      });

      const revenueData = Object.values(dateCounts).sort((a, b) => a.date.localeCompare(b.date));

      // Calculate status distribution
      const statusCounts = {
        draft: { count: 0, amount: 0 },
        sent: { count: 0, amount: 0 },
        paid: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
      };

      (invoices || []).forEach((inv) => {
        // Normalize status to lowercase and default to 'draft' if missing
        const status = (inv.status || 'draft').toLowerCase().trim();
        if (statusCounts[status]) {
          statusCounts[status].count += 1;
          statusCounts[status].amount += parseFloat(inv.total_amount || 0);
        } else {
          // If status doesn't match expected values, treat as draft
          statusCounts.draft.count += 1;
          statusCounts.draft.amount += parseFloat(inv.total_amount || 0);
        }
      });

      // Create status data in fixed order but only include statuses with at least 1 invoice
      const statusOrder = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
      const statusData = statusOrder
        .map((status) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count: statusCounts[status].count,
          amount: statusCounts[status].amount,
        }))
        .filter((item) => item.count > 0); // Only show statuses that have invoices

      // Calculate summary
      const totalRevenue = (invoices || []).reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
      const totalInvoices = (invoices || []).length;
      const paidAmount = statusCounts.paid.amount;
      const unpaidAmount = statusCounts.draft.amount + statusCounts.sent.amount + statusCounts.overdue.amount;
      const overdueAmount = statusCounts.overdue.amount;
      const cancelledAmount = statusCounts.cancelled.amount;
      const draftCount = statusCounts.draft.count;
      const paidCount = statusCounts.paid.count;
      const unpaidCount = statusCounts.draft.count + statusCounts.sent.count + statusCounts.overdue.count;
      const overdueCount = statusCounts.overdue.count;
      const cancelledCount = statusCounts.cancelled.count;

      setInvoiceRevenueData(revenueData);
      setInvoiceStatusData(statusData);
      setInvoiceSummary({ totalRevenue, totalInvoices, paidAmount, unpaidAmount, overdueAmount, cancelledAmount, draftCount, paidCount, unpaidCount, overdueCount, cancelledCount });
    } catch (err) {
      console.error('Invoice analytics error:', err);
      if (err.message?.includes('relation') || err.message?.includes('does not exist')) {
        setInvoiceAnalyticsError('⚠️ Invoices table not found. Please run database/create-invoices-table.sql in Supabase SQL Editor to set up the invoices system.');
      } else {
        setInvoiceAnalyticsError(`Failed to load invoice analytics: ${err.message || 'Unknown error'}`);
      }
      setInvoiceRevenueData([]);
      setInvoiceStatusData([]);
      setInvoiceSummary({ totalRevenue: 0, totalInvoices: 0, paidAmount: 0, unpaidAmount: 0, overdueAmount: 0, cancelledAmount: 0, draftCount: 0, paidCount: 0, unpaidCount: 0, overdueCount: 0, cancelledCount: 0 });
    } finally {
      setInvoiceAnalyticsLoading(false);
    }
  };

  // Fetch Projects Analytics
  const fetchProjectsAnalytics = async () => {
    setProjectsLoading(true);
    setProjectsError(null);

    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .gte('created_at', `${projectsRangeStart}T00:00:00`)
        .lte('created_at', `${projectsRangeEnd}T23:59:59`);

      if (error) {
        console.error('Projects analytics error:', error);
        setProjectsError(`Failed to load projects analytics: ${error.message || 'Unknown error'}`);
        setProjectsStatusData([]);
        setProjectsDateData([]);
        setProjectsSummary({ totalProjects: 0, activeCount: 0, completedCount: 0, onHoldCount: 0, cancelledCount: 0, totalBudget: 0 });
        return;
      }

      // Calculate status distribution and date distribution
      const statusCounts = {
        active: 0,
        completed: 0,
        'on-hold': 0,
        cancelled: 0,
      };

      const dateCounts = {};
      let totalBudget = 0;

      (projects || []).forEach((proj) => {
        const status = (proj.status || 'active').toLowerCase().trim();
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status] += 1;
        } else {
          statusCounts.active += 1;
        }
        totalBudget += parseFloat(proj.budget || 0);

        // Count by date
        if (proj.start_date) {
          const date = proj.start_date.split('T')[0];
          dateCounts[date] = (dateCounts[date] || 0) + 1;
        }
      });

      // Create date data
      const dateData = Object.keys(dateCounts)
        .sort()
        .map((date) => ({ date, count: dateCounts[date] }));

      // Create status data in fixed order
      const statusOrder = ['active', 'on-hold', 'completed', 'cancelled'];
      const statusData = statusOrder
        .map((status) => ({
          status: status === 'on-hold' ? 'On Hold' : status.charAt(0).toUpperCase() + status.slice(1),
          count: statusCounts[status],
        }))
        .filter((item) => item.count > 0);

      setProjectsStatusData(statusData);
      setProjectsDateData(dateData);
      setProjectsSummary({
        totalProjects: (projects || []).length,
        activeCount: statusCounts.active,
        completedCount: statusCounts.completed,
        onHoldCount: statusCounts['on-hold'],
        cancelledCount: statusCounts.cancelled,
        totalBudget: totalBudget,
      });
    } catch (err) {
      console.error('Projects analytics error:', err);
      setProjectsError(`Failed to load projects analytics: ${err.message || 'Unknown error'}`);
      setProjectsStatusData([]);
      setProjectsDateData([]);
      setProjectsSummary({ totalProjects: 0, activeCount: 0, completedCount: 0, onHoldCount: 0, cancelledCount: 0, totalBudget: 0 });
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    if (projectsRangeStart && projectsRangeEnd && projectsRangeStart <= projectsRangeEnd) {
      fetchProjectsAnalytics();
    }
  }, [activeTab, projectsRangeStart, projectsRangeEnd]);

  useEffect(() => {
    if (activeTab !== 'analytics') return;
    if (invoiceAnalyticsRangeStart && invoiceAnalyticsRangeEnd && invoiceAnalyticsRangeStart <= invoiceAnalyticsRangeEnd) {
      fetchInvoiceAnalytics();
    }
  }, [activeTab, invoiceAnalyticsRangeStart, invoiceAnalyticsRangeEnd]);

  const filteredBookings = useMemo(() => {
    const normalizeStatus = (status) => (status || '').toLowerCase();
    const isCancelled = (status) => normalizeStatus(status).includes('cancel');
    const isConfirmed = (status) => normalizeStatus(status) === 'confirmed';
    const isTentative = (status) => normalizeStatus(status) === 'meet link generated';
    const isAttended = (status) => normalizeStatus(status) === 'attended';
    const isMissed = (status) => normalizeStatus(status) === 'missed';
    const isNoShow = (status) => normalizeStatus(status) === 'no show';

    let filtered = bookings;
    if (statusFilter === 'upcoming') {
      filtered = bookings.filter((item) => isConfirmed(item.status));
    }
    if (statusFilter === 'tentative') {
      filtered = bookings.filter((item) => isTentative(item.status));
    }
    if (statusFilter === 'attended') {
      filtered = bookings.filter((item) => isAttended(item.status));
    }
    if (statusFilter === 'missed') {
      filtered = bookings.filter((item) => isMissed(item.status));
    }
    if (statusFilter === 'noshow') {
      filtered = bookings.filter((item) => isNoShow(item.status));
    }
    if (statusFilter === 'cancelled') {
      filtered = bookings.filter((item) => isCancelled(item.status));
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.preferred_date}T${a.preferred_time || '00:00'}`);
      const dateB = new Date(`${b.preferred_date}T${b.preferred_time || '00:00'}`);
      return dateA - dateB;
    });
  }, [bookings, statusFilter]);

  const statusColorMap = {
    Confirmed: '#22c55e',
    Tentative: '#f97316',
    Attended: '#a855f7',
    Missed: '#ef4444',
    'No Show': '#fbbf24',
    Cancelled: '#ec4899',
  };
  const isStatusEmpty = statusData.length === 0 || statusData.every((item) => item.count === 0);
  const totalStatusCount = statusData.reduce((sum, item) => sum + (item.count || 0), 0);
  const statusLegendGradient = {
    backgroundImage: 'linear-gradient(90deg, #22d3ee, #fbbf24, #34d399, #f87171, #fb923c, #ef4444)',
  };

  const isActionButtonEnabled = (preferredDate, preferredTime) => {
    if (!preferredDate || !preferredTime) {
      return false;
    }

    const meetingDateTime = new Date(`${preferredDate}T${preferredTime}`);
    const enableTime = new Date(meetingDateTime.getTime() + 30 * 60 * 1000);
    const now = new Date();

    return now >= enableTime;
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    if (isReadOnlyAdmin) {
      setBookingMessage(bookingId, readOnlyMessage);
      return;
    }

    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return;
    }

    if (!isActionButtonEnabled(booking.preferred_date, booking.preferred_time)) {
      const meetingDateTime = new Date(`${booking.preferred_date}T${booking.preferred_time}`);
      const enableTime = new Date(meetingDateTime.getTime() + 30 * 60 * 1000);
      setBookingMessage(bookingId, `This action will be available 30 minutes after the meeting time (${enableTime.toLocaleTimeString()})`);
      return;
    }

    try {
      const { error } = await supabase
        .from('Contact Us Details')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) {
        setBookingMessage(bookingId, '❌ Failed to update meeting status. Please try again.');
        return;
      }

      await loadBookings();
    } catch (err) {
      setBookingMessage(bookingId, '❌ An unexpected error occurred. Please try again.');
    }
  };

  const handleCancelMeeting = async (bookingId) => {
    if (isReadOnlyAdmin) {
      setBookingMessage(bookingId, readOnlyMessage);
      return;
    }

    try {
      const { error: functionError } = await supabase.functions.invoke('confirm-meeting', {
        body: { action: 'cancel', id: bookingId, source: 'admin' }
      });

      if (functionError) {
        console.error('Cancel email failed:', functionError);
        setBookingMessage(bookingId, '❌ Unable to send cancellation emails. Please try again.');
        return;
      }

      const { error } = await supabase
        .from('Contact Us Details')
        .update({
          status: 'Cancelled by Admin',
          cancelled_reason: 'Cancelled by Admin',
          preferred_date: null,
          preferred_time: null,
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Error cancelling booking:', error);
        setBookingMessage(bookingId, '❌ Error cancelling booking. Please try again.');
        return;
      }

      setBookingMessage(bookingId, '✅ Meeting cancelled successfully!');
      await loadBookings();
    } catch (err) {
      console.error('Unexpected error:', err);
      setBookingMessage(bookingId, '❌ An unexpected error occurred.');
    }
  };

  const openCancelSheet = (booking) => {
    setCancelTarget(booking);
  };

  const closeCancelSheet = () => {
    setCancelTarget(null);
  };

  const handleSendReminderForBooking = async (booking) => {
    if (isReadOnlyAdmin) {
      setBookingMessage(booking.id, readOnlyMessage);
      return;
    }

    // Check if reminder already sent - ONLY check this
    if (booking.reminder_sent) {
      setBookingMessage(booking.id, '✅ Reminder already sent for this booking.');
      return;
    }

    // Send reminder email without time window restrictions
    try {
      const { error } = await supabase.functions.invoke('send-admin-reminder', {
        body: { booking_id: booking.id }
      });

      if (error) {
        setBookingMessage(booking.id, `❌ Failed to send reminder: ${error.message}`);
        return;
      }

      setBookingMessage(booking.id, `✅ Reminder email sent successfully to ${booking.full_name}!`);

      // Reload bookings to reflect reminder_sent flag update
      await loadBookings();
    } catch (err) {
      console.error('Error sending reminder:', err);
      setBookingMessage(booking.id, '❌ An unexpected error occurred while sending the reminder.');
    }
  };

  const handleSendEarlyReminder = async (booking) => {
    if (isReadOnlyAdmin) {
      setBookingMessage(booking.id, readOnlyMessage);
      return;
    }

    setEarlyReminderPendingBookingId(null);

    // Send reminder email directly without additional checks
    try {
      console.log(`🚀 Invoking send-admin-reminder with booking_id:`, booking.id);
      console.log(`📤 Request body:`, { booking_id: booking.id });

      const { data, error } = await supabase.functions.invoke('send-admin-reminder', {
        body: { booking_id: booking.id }
      });

      console.log(`📥 Response - Data:`, data, `Error:`, error);

      if (error) {
        console.error(`❌ Function error:`, error);
        setBookingMessage(booking.id, `❌ Failed to send reminder: ${error.message}`);
        return;
      }

      setBookingMessage(booking.id, `✅ Reminder email sent successfully to ${booking.full_name}!`);

      // Reload bookings to reflect reminder_sent flag update
      await loadBookings();
    } catch (err) {
      console.error('Error sending reminder:', err);
      setBookingMessage(booking.id, '❌ An unexpected error occurred while sending the reminder.');
    }
  };

  const confirmCancelMeeting = async () => {
    if (!cancelTarget) return;
    if (isReadOnlyAdmin) {
      setBookingMessage(cancelTarget.id, readOnlyMessage);
      return;
    }
    closeCancelSheet();
    await handleCancelMeeting(cancelTarget.id);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Company', 'Phone', 'Service', 'Date', 'Time', 'Status', 'Created At'];
    const rows = filteredBookings.map(booking => [
      booking.full_name || '',
      booking.email || '',
      booking.company || '',
      booking.phone_number || '',
      booking.service_of_interest || '',
      booking.preferred_date || '',
      booking.preferred_time || '',
      booking.status || '',
      booking.created_at ? new Date(booking.created_at).toLocaleString() : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meetings-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const headers = ['Name', 'Email', 'Company', 'Phone', 'Service', 'Date', 'Time', 'Status'];
    const rows = filteredBookings.map(booking => [
      booking.full_name || '',
      booking.email || '',
      booking.company || '',
      booking.phone_number || '',
      booking.service_of_interest || '',
      booking.preferred_date || '',
      booking.preferred_time || '',
      booking.status || ''
    ]);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Meetings Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #333;
            background: white;
          }
          h1 {
            color: #1a202c;
            margin-bottom: 10px;
            font-size: 24px;
          }
          .header-info {
            margin-bottom: 30px;
            color: #666;
            font-size: 13px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #2d3748;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #ccc;
            font-size: 13px;
          }
          td {
            border: 1px solid #ddd;
            padding: 10px;
            font-size: 12px;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
            color: #999;
            font-size: 11px;
          }
          @media print {
            body { padding: 20px; }
            h1 { page-break-after: avoid; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Meetings Report</h1>
        <div class="header-info">
          <p><strong>Filter:</strong> ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Records:</strong> ${filteredBookings.length}</p>
        </div>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>This report was generated by Dataverse Dynamics CRM</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', 'print-window', 'height=600,width=900');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } else {
      alert('Please disable pop-up blockers to export PDF');
    }
  };

  const getFilterClass = (filterId, isSelected) => {
    const base = 'rounded-full px-5 py-2 text-sm border transition';
    if (isSelected) {
      if (filterId === 'upcoming') return `${base} border-green-400 bg-green-200 text-green-900`;
      if (filterId === 'tentative') return `${base} border-orange-400 bg-orange-200 text-orange-900`;
      if (filterId === 'attended') return `${base} border-purple-400 bg-purple-200 text-purple-900`;
      if (filterId === 'missed') return `${base} border-red-400 bg-red-200 text-red-900`;
      if (filterId === 'noshow') return `${base} border-amber-400 bg-amber-200 text-amber-900`;
      if (filterId === 'cancelled') return `${base} border-pink-400 bg-pink-200 text-pink-900`;
      return `${base} border-blue-400 bg-blue-200 text-blue-900`;
    }

    if (filterId === 'upcoming') {
      return `${base} border-green-300 bg-green-50 text-slate-900 hover:bg-green-100`;
    }
    if (filterId === 'tentative') {
      return `${base} border-orange-300 bg-orange-50 text-slate-900 hover:bg-orange-100`;
    }
    if (filterId === 'attended') {
      return `${base} border-purple-300 bg-purple-50 text-slate-900 hover:bg-purple-100`;
    }
    if (filterId === 'missed') {
      return `${base} border-red-300 bg-red-50 text-slate-900 hover:bg-red-100`;
    }
    if (filterId === 'noshow') {
      return `${base} border-amber-300 bg-amber-50 text-slate-900 hover:bg-amber-100`;
    }
    if (filterId === 'cancelled') {
      return `${base} border-pink-300 bg-pink-50 text-slate-900 hover:bg-pink-100`;
    }
    return `${base} border-blue-300 bg-blue-50 text-slate-900 hover:bg-blue-100`;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-slate-900 flex items-center justify-center font-display">
        <div className="text-slate-500">Loading admin session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-slate-900 font-display">
      <div className="relative overflow-hidden">
        <div className="absolute -top-40 left-20 h-96 w-96 rounded-full bg-blue-300/10 blur-[140px]" />
        <div className="absolute -bottom-40 right-10 h-96 w-96 rounded-full bg-orange-300/10 blur-[140px]" />
      </div>

      <div className="relative z-10 px-6 py-4 max-w-6xl mx-auto">
        <header className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div className="flex items-center gap-4">
              <LogoSVG className="h-20 sm:h-24 md:h-28 w-auto" />
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
                CRM
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center w-full sm:w-auto">
            {!pwaInstalled && (
              <button
                onClick={async () => {
                  const status = adminPWA.getStatus();
                  console.log('[AdminDashboard] Download clicked. Status:', status);
                  console.log('[AdminDashboard] deferredPrompt available:', !!adminPWA.deferredPrompt);

                  // Try native browser install prompt first
                  if (adminPWA.deferredPrompt) {
                    console.log('[AdminDashboard] Using native browser install prompt...');
                    adminPWA.deferredPrompt.prompt();
                    const { outcome } = await adminPWA.deferredPrompt.userChoice;
                    console.log(`[AdminDashboard] User response: ${outcome}`);
                  }
                  // If criteria are met, show manual installation instructions
                  else if (status.isInstallable) {
                    console.log('[AdminDashboard] Browser install prompt not available, showing manual instructions...');
                    const ua = navigator.userAgent;
                    let instructions = '';

                    if (/Chrome/.test(ua) && !/Edge/.test(ua)) {
                      instructions = `📱 Chrome Desktop Installation:\n1. Click the ⬇️ icon in the address bar\n2. Click "Install"\n\n📱 Chrome Mobile:\n1. Tap the menu (⋮)\n2. Tap "Install app"\n3. Tap "Install"`;
                    } else if (/Edge/.test(ua)) {
                      instructions = `📱 Microsoft Edge Installation:\n1. Click the ⬇️ icon in the address bar\n2. Click "Install this site as an app"\n3. Click "Install"`;
                    } else if (/Firefox/.test(ua)) {
                      instructions = `📱 Firefox Installation:\n1. Click the menu (≡)\n2. Tap "Install"\n3. Confirm installation`;
                    } else if (/Safari/.test(ua)) {
                      instructions = `📱 Safari Installation (iOS):\n1. Tap Share (⬆️ in box)\n2. Tap "Add to Home Screen"\n3. Tap "Add"\n\n📱 Safari (Mac):\n1. Click File menu\n2. Click "Add to Dock"\n3. Click "Add"`;
                    } else {
                      instructions = `Your browser supports PWA installation!\nLook for a download or install icon in your address bar or browser menu.`;
                    }

                    alert(instructions);
                  }
                  else {
                    console.log('[AdminDashboard] PWA criteria not met:', status);
                    alert('App installation is not available. Check:\n✓ Browser supports PWAs\n✓ Using HTTPS or localhost\n✓ All PWA files are served correctly\n\nRun in console: runManifestDiagnostic()');
                  }
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 sm:py-2 border border-blue-300 text-slate-900 bg-blue-50 hover:bg-blue-100 transition-all whitespace-nowrap"
                title="Install the Admin Panel as an app on your device for faster access and offline support."
              >
                <Download className="h-4 w-4 flex-shrink-0" />
                <span>Download App</span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 sm:py-2 border border-red-300 text-slate-900 bg-red-50 hover:bg-red-100 transition-all whitespace-nowrap"
              title="Sign out"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
          </div>

          <p className="text-slate-600 max-w-2xl underline">
            One stop solution for managing your CRM & admin tasks efficiently.
          </p>

          <style>{`
            .legend-swatch-animate {
              background-size: 200% 200%;
              animation: legendShift 3s linear infinite;
            }

            @keyframes legendShift {
              0% { background-position: 0% 50%; }
              100% { background-position: 200% 50%; }
            }

            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }

            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </header>

        {isReadOnlyAdmin && (
          <div className="mt-6 rounded-2xl border border-orange-300 bg-orange-50 px-6 py-4 text-orange-900">
            View-only access enabled. Editing, cancellations, reminders, and calendar changes are disabled.
          </div>
        )}

        <section className="mt-2">
          {/* Tab Navigation */}
          <div className="overflow-x-auto scrollbar-hide border-b border-blue-200 mb-8">
            <div className="flex gap-4 min-w-max">
              <button
                onClick={() => setActiveTab('blocked-slots')}
                className={`pb-3 px-2 font-medium transition-all whitespace-nowrap ${activeTab === 'blocked-slots'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-700'
                  }`}
              >
                ⏱️ Admin Calendar
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`pb-3 px-2 font-medium transition-all whitespace-nowrap ${activeTab === 'bookings'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-700'
                  }`}
              >
                📅 Meetings
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`pb-3 px-2 font-medium transition-all whitespace-nowrap ${activeTab === 'projects'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-700'
                  }`}
              >
                📂 Projects
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`pb-3 px-2 font-medium transition-all whitespace-nowrap ${activeTab === 'invoices'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-700'
                  }`}
              >
                💰 Invoices
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`pb-3 px-2 font-medium transition-all whitespace-nowrap ${activeTab === 'analytics'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-700'
                  }`}
              >
                📊 Analytics
              </button>
              <button
                onClick={() => setActiveTab('chatbot')}
                className={`pb-3 px-2 font-medium transition-all whitespace-nowrap ${activeTab === 'chatbot'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-700'
                  }`}
              >
                💬 Chatbot
              </button>
            </div>
          </div>

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="bg-white rounded-2xl border border-blue-200 p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Calendar className="h-7 w-7 text-blue-600" />
                    Meeting Schedule
                  </h2>
                  <div className="text-sm text-slate-600">
                    {filteredBookings.length} meeting{filteredBookings.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {filteredBookings.length > 0 && (
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-2">
                    <button
                      onClick={exportToCSV}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-blue-300 bg-blue-50 text-slate-900 transition hover:bg-blue-100"
                      title="Export to CSV"
                    >
                      <Download className="h-4 w-4" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm border border-blue-300 bg-blue-50 text-slate-900 transition hover:bg-blue-100"
                      title="Export to PDF"
                    >
                      <Download className="h-4 w-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex flex-wrap gap-3 min-w-max">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      className={`whitespace-nowrap ${getFilterClass(filter.id, statusFilter === filter.id)}`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {filteredBookings.length === 0 && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-6 py-10 text-center text-slate-600">
                    No bookings found for this filter.
                  </div>
                )}

                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-blue-200 bg-white p-6 backdrop-blur"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {booking.full_name || 'Unnamed Client'}
                        </h3>
                        <p className="text-slate-600">{booking.email}</p>
                        <p className="text-slate-700 text-sm">{booking.company || 'No company provided'}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-slate-900">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <span>
                            {booking.preferred_date && booking.preferred_time
                              ? `${booking.preferred_date} at ${booking.preferred_time}`
                              : 'No slot (cancelled)'}
                          </span>
                        </div>
                        {statusFilter === 'upcoming' && booking.meet_link && booking.status && booking.status.toLowerCase() === 'confirmed' && (
                          <a
                            href={`/meeting-room/${booking.id}?source=admin`}
                            className="rounded-full px-5 py-2 text-sm border border-blue-300 bg-blue-50 text-slate-900 transition hover:bg-blue-100 flex items-center gap-2"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Join Meeting
                          </a>
                        )}
                        {statusFilter === 'upcoming' && booking.meet_link && (!booking.status || booking.status.toLowerCase() !== 'confirmed') && (
                          <div className="rounded-full px-4 py-2 text-xs border border-orange-300 bg-orange-50 text-orange-700">
                            Confirm first to enable Join Meeting
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3 text-sm text-slate-700">
                      <div>
                        <p className="text-slate-600">Service</p>
                        <p className="text-slate-900">{booking.service_of_interest || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Phone</p>
                        <p className="text-slate-900">{booking.phone_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Status</p>
                        <p className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${booking.status && booking.status.toLowerCase().includes('cancel')
                            ? 'bg-pink-100 text-pink-700'
                            : booking.status && booking.status.toLowerCase() === 'meet link generated'
                              ? 'bg-orange-100 text-orange-700'
                              : booking.status && booking.status.toLowerCase() === 'attended'
                                ? 'bg-purple-100 text-purple-700'
                                : booking.status && booking.status.toLowerCase() === 'missed'
                                  ? 'bg-red-100 text-red-700'
                                  : booking.status && booking.status.toLowerCase() === 'no show'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-green-100 text-green-700'
                          }`}>
                          {booking.status && booking.status.toLowerCase() === 'meet link generated'
                            ? 'Tentative'
                            : booking.status || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {booking.projects && booking.projects.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-slate-600 mb-2">Projects:</p>
                        <div className="flex flex-wrap gap-2">
                          {booking.projects.map((project, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300"
                            >
                              {project.project_number}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-slate-600">
                      Created: {booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}
                    </div>

                    {statusFilter === 'upcoming' && !isReadOnlyAdmin && (
                      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-2">
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'Attended')}
                          className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-green-300 bg-green-50 text-green-700 transition hover:bg-green-100"
                        >
                          Attended
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'Missed')}
                          className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-red-300 bg-red-50 text-red-700 transition hover:bg-red-100"
                        >
                          Missed
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'No Show')}
                          className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-orange-300 bg-orange-50 text-orange-700 transition hover:bg-orange-100"
                        >
                          No Show
                        </button>
                        <button
                          onClick={() => handleSendReminderForBooking(booking)}
                          className={`w-full sm:w-auto rounded-full px-5 py-2 text-sm border transition ${booking.reminder_sent
                              ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                              : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                        >
                          Reminder
                        </button>
                        <button
                          onClick={() => openCancelSheet(booking)}
                          className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-slate-300 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {statusFilter === 'tentative' && !isReadOnlyAdmin && (
                      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-2">
                        <button
                          onClick={() => handleSendReminderForBooking(booking)}
                          className={`w-full sm:w-auto rounded-full px-5 py-2 text-sm border transition ${booking.reminder_sent
                              ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                              : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                        >
                          Reminder
                        </button>
                        <button
                          onClick={() => openCancelSheet(booking)}
                          className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-slate-300 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {booking.status && booking.status.toLowerCase() === 'attended' && !isReadOnlyAdmin && (
                      <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingForProject(booking);
                            setStartProjectSheetOpen(true);
                          }}
                          className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-purple-300 bg-purple-50 text-purple-700 transition hover:bg-purple-100"
                        >
                          Start Project
                        </button>
                      </div>
                    )}
                    {bookingMessages[booking.id] && (
                      <div className="mt-4 flex items-start gap-3">
                        <div className={`flex-1 rounded-2xl border px-4 py-3 text-sm ${bookingMessages[booking.id].includes('Reminder already sent')
                            ? 'border-purple-300 bg-purple-50 text-purple-700'
                            : 'border-blue-300 bg-blue-50 text-blue-700'
                          }`}>
                          {bookingMessages[booking.id]}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked Slots Tab */}
          {activeTab === 'blocked-slots' && (
            <div className="bg-white rounded-2xl border border-blue-200 p-6">
              <AdminBlockedSlotsPanel isReadOnly={isReadOnlyAdmin} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-2xl border border-blue-200 p-6 space-y-8">
              {/* Meeting Analytics Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>📊</span> Meeting Analytics
                </h2>
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-700">Start date</label>
                    <input
                      type="date"
                      value={trendRangeStart}
                      onChange={(e) => setTrendRangeStart(e.target.value)}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-700">End date</label>
                    <input
                      type="date"
                      value={trendRangeEnd}
                      onChange={(e) => setTrendRangeEnd(e.target.value)}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchTrendData}
                    disabled={trendLoading || !trendRangeStart || !trendRangeEnd || trendRangeStart > trendRangeEnd}
                    className="rounded-full px-5 py-2 text-sm border border-blue-300 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {trendLoading ? 'Loading...' : 'Refresh Meeting Data'}
                  </button>
                </div>

                {trendError && (
                  <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {trendError}
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
                  <div className="rounded-lg border border-blue-300 bg-blue-50 p-3">
                    <div className="text-xs text-blue-700 mb-1">Total Meetings</div>
                    <div className="text-lg font-bold text-slate-900">{meetingSummary.totalMeetings}</div>
                    <div className="text-xs text-blue-600 mt-0.5 line-clamp-1">All statuses</div>
                  </div>
                  <div className="rounded-lg border border-green-300 bg-green-50 p-3">
                    <div className="text-xs text-green-700 mb-1">Confirmed</div>
                    <div className="text-lg font-bold text-slate-900">{meetingSummary.confirmedCount}</div>
                    <div className="text-xs text-green-600 mt-0.5 line-clamp-1">Accepted</div>
                  </div>
                  <div className="rounded-lg border border-orange-300 bg-orange-50 p-3">
                    <div className="text-xs text-orange-700 mb-1">Tentative</div>
                    <div className="text-lg font-bold text-slate-900">{meetingSummary.tentativeCount}</div>
                    <div className="text-xs text-orange-600 mt-0.5 line-clamp-1">May attend</div>
                  </div>
                  <div className="rounded-lg border border-purple-300 bg-purple-50 p-3">
                    <div className="text-xs text-purple-700 mb-1">Attended</div>
                    <div className="text-lg font-bold text-slate-900">{meetingSummary.attendedCount}</div>
                    <div className="text-xs text-purple-600 mt-0.5 line-clamp-1">Completed</div>
                  </div>
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                    <div className="text-xs text-red-700 mb-1">Missed</div>
                    <div className="text-lg font-bold text-slate-900">{meetingSummary.missedCount}</div>
                    <div className="text-xs text-red-600 mt-0.5 line-clamp-1">Did not attend</div>
                  </div>
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <div className="text-xs text-amber-700 mb-1">No Show</div>
                    <div className="text-lg font-bold text-slate-900">{meetingSummary.noShowCount}</div>
                    <div className="text-xs text-amber-600 mt-0.5 line-clamp-1">No notification</div>
                  </div>
                  <div className="rounded-lg border border-pink-300 bg-pink-50 p-3">
                    <div className="text-xs text-pink-700 mb-1">Cancelled</div>
                    <div className="text-lg font-bold text-slate-900">{meetingSummary.cancelledCount}</div>
                    <div className="text-xs text-pink-600 mt-0.5 line-clamp-1">Not happening</div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-blue-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Meetings by date</h3>
                    {trendLoading ? (
                      <div className="text-slate-600 text-sm">Loading trend data...</div>
                    ) : trendData.length === 0 ? (
                      <div className="text-slate-700 text-sm">No meetings in this range.</div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendData} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              tickFormatter={(value) => String(value).slice(5)}
                            />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937', borderRadius: '8px' }}
                              labelStyle={{ color: '#1f2937' }}
                              itemStyle={{ color: '#1f2937' }}
                              cursor={{ fill: 'transparent' }}
                            />
                            <Legend wrapperStyle={{ color: '#1f2937' }} />
                            <Bar dataKey="count" name="Meetings" fill="#3b82f6" radius={[6, 6, 0, 0]} activeBar={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">📈 <span className="font-medium">Summary:</span> Shows meeting volume trends over time. Peak days indicate high demand periods for consultations.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Meetings by status</h3>
                    {trendLoading ? (
                      <div className="text-slate-600 text-sm">Loading status data...</div>
                    ) : isStatusEmpty ? (
                      <div className="text-slate-700 text-sm">No status data in this range.</div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={statusData} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="status" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937', borderRadius: '8px' }}
                              labelStyle={{ color: '#1f2937' }}
                              itemStyle={{ color: '#1f2937' }}
                              cursor={{ fill: 'transparent' }}
                            />
                            <Legend
                              wrapperStyle={{ color: '#1f2937' }}
                              content={() => (
                                <div className="flex items-center justify-center gap-2 text-sm text-slate-900">
                                  <span
                                    className="legend-swatch-animate inline-flex h-3.5 w-3.5 rounded-sm"
                                    style={statusLegendGradient}
                                  />
                                  <span>Meetings</span>
                                  <span className="text-slate-600">({totalStatusCount})</span>
                                </div>
                              )}
                            />
                            <Bar dataKey="count" name="Meetings" radius={[6, 6, 0, 0]} activeBar={false}>
                              {statusData.map((entry) => (
                                <Cell
                                  key={entry.status}
                                  fill={statusColorMap[entry.status] || '#94a3b8'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">📊 <span className="font-medium">Summary:</span> Breakdown of meeting statuses. Accepted meetings indicate confirmed business, while pending meetings need follow-up action.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-blue-200"></div>

              {/* Projects Analytics Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>📂</span> Projects Analytics
                </h2>
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-700">Start date</label>
                    <input
                      type="date"
                      value={projectsRangeStart}
                      onChange={(e) => setProjectsRangeStart(e.target.value)}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-700">End date</label>
                    <input
                      type="date"
                      value={projectsRangeEnd}
                      onChange={(e) => setProjectsRangeEnd(e.target.value)}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchProjectsAnalytics}
                    disabled={projectsLoading || !projectsRangeStart || !projectsRangeEnd || projectsRangeStart > projectsRangeEnd}
                    className="rounded-full px-5 py-2 text-sm border border-blue-300 bg-blue-50 text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {projectsLoading ? 'Loading...' : 'Refresh Projects Data'}
                  </button>
                </div>

                {projectsError && (
                  <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {projectsError}
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-xl border border-blue-300 bg-blue-50 p-4">
                    <div className="text-sm text-blue-700 mb-1">Total Projects</div>
                    <div className="text-2xl font-bold text-slate-900">{projectsSummary.totalProjects}</div>
                    <div className="text-xs text-blue-600 mt-1">All time</div>
                  </div>
                  <div className="rounded-xl border border-green-300 bg-green-50 p-4">
                    <div className="text-sm text-green-700 mb-1">Active</div>
                    <div className="text-2xl font-bold text-slate-900">{projectsSummary.activeCount}</div>
                    <div className="text-xs text-green-600 mt-1">In progress</div>
                  </div>
                  <div className="rounded-xl border border-blue-300 bg-blue-50 p-4">
                    <div className="text-sm text-blue-700 mb-1">On Hold</div>
                    <div className="text-2xl font-bold text-slate-900">{projectsSummary.onHoldCount}</div>
                    <div className="text-xs text-blue-600 mt-1">Paused</div>
                  </div>
                  <div className="rounded-xl border border-green-300 bg-green-50 p-4">
                    <div className="text-sm text-green-700 mb-1">Completed</div>
                    <div className="text-2xl font-bold text-slate-900">{projectsSummary.completedCount}</div>
                    <div className="text-xs text-green-600 mt-1">Finished</div>
                  </div>
                  <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                    <div className="text-sm text-red-700 mb-1">Cancelled</div>
                    <div className="text-2xl font-bold text-slate-900">{projectsSummary.cancelledCount}</div>
                    <div className="text-xs text-red-600 mt-1">Stopped</div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-blue-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Projects by date</h3>
                    {projectsLoading ? (
                      <div className="text-slate-600 text-sm">Loading project data...</div>
                    ) : projectsDateData.length === 0 ? (
                      <div className="text-slate-700 text-sm">No projects in this range.</div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={projectsDateData} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              tickFormatter={(value) => String(value).slice(5)}
                            />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937', borderRadius: '8px' }}
                              labelStyle={{ color: '#1f2937' }}
                              itemStyle={{ color: '#1f2937' }}
                              cursor={{ fill: 'transparent' }}
                            />
                            <Legend wrapperStyle={{ color: '#1f2937' }} />
                            <Bar dataKey="count" name="Projects" fill="#3b82f6" radius={[6, 6, 0, 0]} activeBar={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">📅 <span className="font-medium">Summary:</span> Project creation activity by date. Regular projects indicate steady workflow, with spikes showing periods of high project intake.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Projects by Status</h3>
                    {projectsLoading ? (
                      <div className="text-slate-600 text-sm">Loading project data...</div>
                    ) : projectsStatusData.length === 0 ? (
                      <div className="text-slate-700 text-sm">No projects in this range.</div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={projectsStatusData} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="status" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937', borderRadius: '8px' }}
                              labelStyle={{ color: '#1f2937' }}
                              itemStyle={{ color: '#1f2937' }}
                              cursor={{ fill: 'transparent' }}
                            />
                            <Legend wrapperStyle={{ color: '#1f2937' }} />
                            <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]} activeBar={false}>
                              {projectsStatusData.map((entry) => {
                                const colors = {
                                  Active: '#3b82f6',
                                  'On Hold': '#3b82f6',
                                  Completed: '#10b981',
                                  Cancelled: '#ef4444',
                                };
                                return <Cell key={entry.status} fill={colors[entry.status] || '#94a3b8'} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">🏗️ <span className="font-medium">Summary:</span> Project status distribution. Active projects show current workload, while completed projects track delivery rate and overall productivity.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-blue-200"></div>

              {/* Invoice Analytics Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span>📈</span> Invoice Analytics
                </h2>
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-700">Start date</label>
                    <input
                      type="date"
                      value={invoiceAnalyticsRangeStart}
                      onChange={(e) => setInvoiceAnalyticsRangeStart(e.target.value)}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-slate-700">End date</label>
                    <input
                      type="date"
                      value={invoiceAnalyticsRangeEnd}
                      onChange={(e) => setInvoiceAnalyticsRangeEnd(e.target.value)}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchInvoiceAnalytics}
                    disabled={invoiceAnalyticsLoading || !invoiceAnalyticsRangeStart || !invoiceAnalyticsRangeEnd || invoiceAnalyticsRangeStart > invoiceAnalyticsRangeEnd}
                    className="rounded-full px-5 py-2 text-sm border border-purple-300 bg-purple-50 text-purple-700 transition hover:bg-purple-100 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {invoiceAnalyticsLoading ? 'Loading...' : 'Refresh Invoice Data'}
                  </button>
                </div>

                {invoiceAnalyticsError && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">⚠️</div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-amber-200 mb-1">Setup Required</div>
                        <div className="text-sm text-amber-100/90 leading-relaxed">
                          {invoiceAnalyticsError}
                        </div>
                        {invoiceAnalyticsError.includes('table not found') && (
                          <div className="mt-3 text-xs text-amber-200/80">
                            📖 See <span className="font-semibold">INVOICE_SETUP_GUIDE.md</span> for complete setup instructions.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-purple-400/20 bg-purple-500/10 p-4">
                    <div className="text-sm text-purple-200 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold text-slate-900">${invoiceSummary.totalRevenue.toFixed(2)}</div>
                    <div className="text-xs text-purple-300 mt-1">{invoiceSummary.totalInvoices} invoice{invoiceSummary.totalInvoices !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <div className="text-sm text-emerald-200 mb-1">Paid Amount</div>
                    <div className="text-2xl font-bold text-slate-900">${invoiceSummary.paidAmount.toFixed(2)}</div>
                    <div className="text-xs text-emerald-300 mt-1">{invoiceSummary.paidCount} invoice{invoiceSummary.paidCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <div className="text-sm text-amber-200 mb-1">Unpaid Amount</div>
                    <div className="text-2xl font-bold text-slate-900">${invoiceSummary.unpaidAmount.toFixed(2)}</div>
                    <div className="text-xs text-amber-300 mt-1">{invoiceSummary.unpaidCount} invoice{invoiceSummary.unpaidCount !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="rounded-xl border border-orange-400/20 bg-orange-500/10 p-4">
                    <div className="text-sm text-orange-200 mb-1">Voided Amount</div>
                    <div className="text-2xl font-bold text-slate-900">${invoiceSummary.cancelledAmount.toFixed(2)}</div>
                    <div className="text-xs text-orange-300 mt-1">{invoiceSummary.cancelledCount} invoice{invoiceSummary.cancelledCount !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Revenue Over Time</h3>
                    {invoiceAnalyticsLoading ? (
                      <div className="text-slate-600 text-sm">Loading revenue data...</div>
                    ) : invoiceRevenueData.length === 0 ? (
                      <div className="text-slate-700 text-sm">No invoices in this range.</div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={invoiceRevenueData} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              tickFormatter={(value) => String(value).slice(5)}
                            />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937', borderRadius: '8px' }}
                              labelStyle={{ color: '#1f2937' }}
                              itemStyle={{ color: '#1f2937' }}
                              cursor={{ fill: 'transparent' }}
                              formatter={(value) => `$${parseFloat(value).toFixed(2)}`}
                            />
                            <Legend wrapperStyle={{ color: '#1f2937' }} />
                            <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} activeBar={false} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">💰 <span className="font-medium">Summary:</span> Revenue trends over time. Monitor monthly revenue fluctuations to identify seasonal patterns and business growth trajectory.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Invoices by Status</h3>
                    {invoiceAnalyticsLoading ? (
                      <div className="text-slate-600 text-sm">Loading status data...</div>
                    ) : invoiceStatusData.length === 0 ? (
                      <div className="text-slate-700 text-sm">No status data in this range.</div>
                    ) : (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={invoiceStatusData} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                            <XAxis dataKey="status" tick={{ fill: '#64748b', fontSize: 11 }} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#1f2937', borderRadius: '8px' }}
                              labelStyle={{ color: '#1f2937', fontWeight: 'bold', marginBottom: '8px' }}
                              itemStyle={{ color: '#1f2937' }}
                              cursor={{ fill: 'transparent' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const data = payload[0].payload;
                                  return (
                                    <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px' }}>
                                      <p style={{ color: '#1f2937', fontWeight: 'bold', marginBottom: '8px' }}>{data.status}</p>
                                      <p style={{ color: '#1f2937', margin: '4px 0' }}>Count: {data.count}</p>
                                      <p style={{ color: '#1f2937', margin: '4px 0' }}>Total Amount: ${parseFloat(data.amount).toFixed(2)}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend wrapperStyle={{ color: '#1f2937' }} />
                            <Bar dataKey="count" name="Count" radius={[6, 6, 0, 0]} activeBar={false}>
                              {invoiceStatusData.map((entry) => {
                                const colors = {
                                  Draft: '#eab308',
                                  Sent: '#3b82f6',
                                  Paid: '#10b981',
                                  Overdue: '#ef4444',
                                  Cancelled: '#f97316',
                                };
                                return <Cell key={entry.status} fill={colors[entry.status] || '#94a3b8'} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">📧 <span className="font-medium">Summary:</span> Invoice status overview. Track paid vs unpaid invoices to monitor cash flow and identify follow-up actions needed for outstanding payments.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <FileText className="h-7 w-7 text-cyan-400" />
                    Invoice Management
                  </h2>
                  <div className="text-sm text-slate-400">
                    {filteredInvoiceCount} invoice{filteredInvoiceCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <InvoicePanel isReadOnly={isReadOnlyAdmin} onFilteredCountChange={(count) => setFilteredInvoiceCount(count)} showInvoiceForm={showInvoiceForm} setShowInvoiceForm={setShowInvoiceForm} renderButtonsOnly={true} />
              </div>
              <InvoicePanel isReadOnly={isReadOnlyAdmin} onFilteredCountChange={(count) => setFilteredInvoiceCount(count)} showInvoiceForm={showInvoiceForm} setShowInvoiceForm={setShowInvoiceForm} renderButtonsOnly={false} />
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Briefcase className="h-7 w-7 text-cyan-400" />
                    Project Management
                  </h2>
                  <div className="text-sm text-slate-400">
                    {filteredProjectCount} project{filteredProjectCount !== 1 ? 's' : ''}
                  </div>
                </div>
                {!isReadOnlyAdmin && (
                  <button
                    onClick={() => setShowProjectForm(!showProjectForm)}
                    className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-purple-300 bg-purple-50 text-purple-700 transition hover:bg-purple-100"
                  >
                    {showProjectForm ? '✕ Cancel' : '+ New Project'}
                  </button>
                )}
              </div>
              <ProjectPanel isReadOnly={isReadOnlyAdmin} onFilteredCountChange={(count) => setFilteredProjectCount(count)} showProjectForm={showProjectForm} setShowProjectForm={setShowProjectForm} />
            </div>
          )}

          {/* Chatbot Tab */}
          {activeTab === 'chatbot' && (
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Meeting Trends</h2>
              <ChatConversationsPanel />
            </div>
          )}
        </section>

        {cancelTarget && !isReadOnlyAdmin && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <button
              type="button"
              onClick={closeCancelSheet}
              className="absolute inset-0 bg-black/60"
              aria-label="Close cancel confirmation"
            />
            <div className="relative w-full max-w-2xl rounded-t-3xl border border-blue-200 bg-white px-6 py-6 shadow-2xl">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Create a New Project</h2>
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <h2 className="text-lg font-semibold text-slate-900">Confirm Cancellation</h2>
              <p className="mt-2 text-slate-700">Do you wnat to cancel this event?</p>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCancelSheet}
                  className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-blue-300 text-slate-900 hover:border-blue-400 hover:text-slate-900 hover:bg-blue-100"
                >
                  No, keep it
                </button>
                <button
                  type="button"
                  onClick={confirmCancelMeeting}
                  className="w-full sm:w-auto rounded-full px-5 py-2 text-sm border border-rose-400/60 bg-rose-500/20 text-rose-100 hover:border-rose-300 hover:bg-rose-500/30"
                >
                  Yes, cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Start Project Sheet */}
        <StartProjectSheet
          booking={selectedBookingForProject}
          isOpen={startProjectSheetOpen}
          onClose={() => {
            setStartProjectSheetOpen(false);
            setSelectedBookingForProject(null);
          }}
          onProjectCreated={() => {
            loadBookings();
          }}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;