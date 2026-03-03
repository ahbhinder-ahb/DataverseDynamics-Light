import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const servicesList = [
  "Back-Office Operations", "Supply Chain Management", "Procurement", "Inventory Management",
  "Returns Management", "Payroll & HR Services", "Recruitment Services",
  "Employee/Vendor Commissions", "AP/AR Management", "Treasury Operations", "Loss Prevention",
  "Internal Audits", "Travel Management", "Gift Cards & Vouchers",
  "Advisory & Consulting", "Operational Decisions", "Financial Decisions",
  "Organizational Decisions", "Process Improvement", "Restructuring", "Capacity Building",
  "Project Management", "Governance Frameworks",
  "Data & Reporting", "Data Management", "Business Analysis", "Advanced Reporting",
  "Documentation", "Performance Metrics", "KPI Tracking",
  "Administrative Support",
  "Expansion & Infrastructure", "White Space Management", "Site Relocations",
  "Facility Closures", "Transition Planning", "Vendor Coordination",
  "Website Development", "Custom Website Design", "E-Commerce Solutions",
  "Responsive Web Development", "CMS Integration", "Website Maintenance",
  "Landing Page Design", "Web Application Development",
  "Digital Marketing & SEO", "Search Engine Optimization", "AI Brand Optimization",
  "Content Marketing Strategy", "Social Media Marketing", "Email Marketing Campaigns",
  "Analytics & Reporting", "Brand Strategy"
];

const ConsultationModal = ({ isOpen, onClose, initialService = '' }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [bookedSlots, setBookedSlots] = useState({});
  const [blockedSlots, setBlockedSlots] = useState({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    companyName: '',
    phone: '',
    service: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        fullName: '',
        email: '',
        companyName: '',
        phone: '',
        service: initialService || '',
        message: ''
      });
      setPreferredDate('');
      setPreferredTime('');
      setErrors({});
      setIsFormValid(false);
    }
  }, [isOpen, initialService]);

  // Validate form on every change
  useEffect(() => {
    let isValid = true;

    if (!formData.fullName.trim()) isValid = false;

    if (!formData.email.trim()) {
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      isValid = false;
    }

    if (!formData.companyName.trim()) isValid = false;
    // Phone is optional but must be a reasonable phone-like string when provided
    if (formData.phone && !/^\+?[0-9()\s.\-]{7,}$/.test(formData.phone)) isValid = false;
    if (!formData.service) isValid = false;
    if (!formData.message.trim()) isValid = false;
    if (!preferredDate) isValid = false;
    if (!preferredTime) isValid = false;
    // prevent selecting an already booked time
    if (preferredDate && preferredTime && (bookedSlots[preferredDate] || []).includes(preferredTime)) isValid = false;
    // prevent selecting a blocked time
    if (preferredDate && preferredTime && isTimeBlocked(preferredDate, preferredTime)) isValid = false;

    setIsFormValid(isValid);
  }, [formData, preferredDate, preferredTime, bookedSlots, blockedSlots]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear specific error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const newErrors = { ...errors };

    // Don't mark phone as required when left empty — it's optional
    if (!value.trim()) {
      if (name !== 'phone') newErrors[name] = 'This field is required';
    } else if (name === 'email' && !/\S+@\S+\.\S+/.test(value)) {
      newErrors[name] = 'Please enter a valid email address';
    } else if (name === 'phone' && value.trim() && !/^\+?[0-9()\s.\-]{7,}$/.test(value)) {
      newErrors[name] = 'Please enter a valid phone number';
    } else {
      delete newErrors[name];
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!supabase) {
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Configuration error. Please contact support.",
        action: <AlertCircle className="text-orange-600" />,
      });
      return;
    }

    // Final validation check
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.companyName.trim()) newErrors.companyName = 'Company Name is required';
    if (formData.phone && !/^\+?[0-9()\s.\-]{7,}$/.test(formData.phone)) newErrors.phone = 'Please enter a valid phone number';
    if (!formData.service) newErrors.service = 'Please select a service';
    if (!formData.message.trim()) newErrors.message = 'Please tell us about your needs';
    if (!preferredDate) newErrors.preferredDate = 'Preferred date is required';
    if (!preferredTime) newErrors.preferredTime = 'Preferred time is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      // Request a verification code to be sent to the user's email.
      // Server-side function should create a verification record and send the email.
      const { data, error: fnError } = await supabase.functions.invoke('request-contact-verification', {
        body: {
          name: formData.fullName,
          email: formData.email,
          company: formData.companyName,
          phone: formData.phone,
          service_of_interest: formData.service,
          message: formData.message,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
        }
      });

      if (fnError) {
        throw fnError;
      }

      // Expect server to return a verification id we can use to confirm the code
      const id = data?.verification_id || data?.id || null;
      setVerificationId(id);
      setVerificationSent(true);
      setIsLoading(false);

      toast({
        title: 'Verification Sent',
        description: 'We sent a 6-digit code to your email. Enter it to complete your request.',
      });

      // Keep the form values cleared but DO NOT close the modal or reset verificationSent;
      // verification input will be shown so user can enter the code.
      setFormData(prev => ({
        ...prev,
        // keep service preserved in case user needs it
      }));

    } catch (err) {
      console.error('Verification failed', err);
      toast({ variant: 'destructive', title: 'Verification failed', description: 'The code is incorrect or expired.' });
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!verificationId) return;
    try {
      const { error } = await supabase.functions.invoke('resend-contact-verification', { body: { verification_id: verificationId } });
      if (error) throw error;
      toast({ title: 'Resent', description: 'A new code was sent to your email.' });
    } catch (err) {
      console.error('Resend failed', err);
      toast({ variant: 'destructive', title: 'Resend failed', description: 'Unable to resend code.' });
    }
  };

  const handleVerifyCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!verificationId) {
      toast({ variant: 'destructive', title: 'Verification error', description: 'No verification request found. Please try booking again.' });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-contact-code', {
        body: {
          verification_id: verificationId,
          code: verificationCode
        }
      });

      if (error) throw error;

      const verified = data?.verified || data?.success || false;
      if (!verified) {
        throw new Error('Invalid code');
      }

      // After successful verification, send consultation emails / persist booking
      const { error: sendErr } = await supabase.functions.invoke('send-consultation-emails', {
        body: {
          name: formData.fullName,
          email: formData.email,
          company: formData.companyName,
          phone: formData.phone,
          service_of_interest: formData.service,
          message: formData.message,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
        }
      });

      if (sendErr) throw sendErr;

      // Format selected date & time for the confirmation toast
      let bookingDescription = 'Your consultation is confirmed. We sent calendar invites to your email.';
      try {
        if (preferredDate && preferredTime) {
          const dt = new Date(`${preferredDate}T${preferredTime}:00`);
          const formattedDate = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          const formattedTime = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
          bookingDescription = `Your consultation is confirmed for ${formattedDate} at ${formattedTime}. We sent calendar invites to your email.`;
        }
      } catch (err) {
        // fallback to generic message in case of any formatting issues
        bookingDescription = 'Your consultation is confirmed. We sent calendar invites to your email.';
      }

      toast({ title: 'Booked', description: bookingDescription });

      // Reset state and close modal
      setFormData({
        fullName: '',
        email: '',
        companyName: '',
        phone: '',
        service: '',
        message: ''
      });
      setPreferredDate('');
      setPreferredTime('');
      setVerificationCode('');
      setVerificationId(null);
      setVerificationSent(false);
      setIsVerifying(false);
      setIsLoading(false);
      setErrors({});
      setIsFormValid(false);
      setTimeout(() => onClose(), 700);
    } catch (err) {
      console.error('Verification/booking failed', err);
      toast({ variant: 'destructive', title: 'Verification failed', description: 'The code is incorrect or expired.' });
      setIsVerifying(false);
    }
  };

  const isWeekend = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
  };

  const isTimeBlocked = (date, time) => {
    // Blocked slots are now stored as { date: [time1, time2, ...] } - same format as booked
    // So we can use the exact same check logic
    return (blockedSlots[date] || []).includes(time);
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const max = new Date();
    max.setMonth(max.getMonth() + 2);
    return max.toISOString().split('T')[0];
  };

  // Fetch booked and blocked slots from Supabase when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchSlots = async () => {
      const start_date = getMinDate();
      const end_date = getMaxDate();
      try {
        console.log(`📅 Fetching slots from ${start_date} to ${end_date}`);
        const { data, error } = await supabase.functions.invoke('get-booked-slots', {
          body: { start_date, end_date },
        });
        console.log('🔵 get-booked-slots response', { data, error });

        if (error) {
          console.error('❌ Error from function:', error);
          throw error;
        }

        console.log('📊 Data structure:', {
          isArray: Array.isArray(data),
          hasBooked: data?.booked !== undefined,
          bookedCount: data?.booked?.length || 0,
          hasBlocked: data?.blocked !== undefined,
          blockedCount: data?.blocked?.length || 0,
        });

        // New format: both booked and blocked are arrays of { date, time }
        if (data && typeof data === 'object' && Array.isArray(data.booked)) {
          const bookedData = data.booked || [];
          const blockedData = data.blocked || [];

          console.log(`📥 Booked data received: ${bookedData.length} slots`, bookedData.slice(0, 5));
          console.log(`🔒 Blocked data received: ${blockedData.length} slots`, blockedData.slice(0, 5));

          // Build booked map: { date: [time1, time2, ...] }
          const bookedMap = {};
          bookedData.forEach((item) => {
            if (!item.date || !item.time) {
              console.warn('⚠️ Skipping booked entry with missing date/time:', item);
              return;
            }
            if (!bookedMap[item.date]) bookedMap[item.date] = [];
            if (!bookedMap[item.date].includes(item.time)) bookedMap[item.date].push(item.time);
          });
          setBookedSlots(bookedMap);
          console.log('✅ Booked map created:', bookedMap);

          // Build blocked map: { date: [time1, time2, ...] }
          const blockedMap = {};
          blockedData.forEach((item) => {
            if (!item.date || !item.time) {
              console.warn('⚠️ Skipping blocked entry with missing date/time:', item);
              return;
            }
            if (!blockedMap[item.date]) blockedMap[item.date] = [];
            if (!blockedMap[item.date].includes(item.time)) blockedMap[item.date].push(item.time);
          });
          setBlockedSlots(blockedMap);
          console.log('✅ Blocked map created:', blockedMap);
        } else {
          console.warn('⚠️ Unexpected data format:', data);
          setBookedSlots({});
          setBlockedSlots({});
        }
      } catch (err) {
        console.error('❌ Failed to fetch slots:', err);
        setBookedSlots({});
        setBlockedSlots({});
      }
    };

    fetchSlots();
  }, [isOpen]);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setPreferredDate(date);

    const newErrors = { ...errors };
    if (date && isWeekend(date)) {
      newErrors.preferredDate = 'Weekends are not available. Please select a weekday.';
    } else {
      delete newErrors.preferredDate;
    }
    setErrors(newErrors);
  };

  const handleTimeChange = (e) => {
    const time = e.target.value;
    setPreferredTime(time);

    const newErrors = { ...errors };
    if (time) {
      delete newErrors.preferredTime;
    } else {
      newErrors.preferredTime = 'Preferred time is required';
    }
    setErrors(newErrors);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl bg-white border border-blue-200 rounded-xl shadow-2xl flex flex-col my-6 max-h-[calc(100vh-4rem)] overflow-y-auto modal-scroll"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-teal-500 to-green-500"></div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-600 hover:text-slate-900 hover:bg-blue-100 rounded-full transition-colors z-10"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="p-6 md:p-8 pb-28 md:pb-20">
              <form onSubmit={verificationSent ? handleVerifyCode : handleSubmit} className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Left: form fields (all except date/time) */}
                  <div className="md:flex-[0_0_30%] bg-white p-4 rounded-lg flex flex-col gap-2 border border-blue-200">
                    <div className="mb-2">
                      <h2 className="text-2xl font-bold text-slate-900 underline decoration-blue-300 decoration-2 underline-offset-4">Book Your Consultation</h2>
                      <p className="text-slate-600 text-sm mt-1">All fields marked with <span className="text-red-500">*</span> are mandatory.</p>
                      <div className="mt-3 flex items-center gap-4 text-slate-700">
                        <div className="flex items-center gap-3">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-700">
                            <path d="M12 7V12L15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span className="text-sm">30 min</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                            <rect x="2" y="5" width="14" height="10" rx="2" fill="#0b1220" />
                            <path d="M4 7h10v6H4z" fill="#2E7D32" />
                            <path d="M18 8l4-2v10l-4-2v-6z" fill="#94a3b8" />
                          </svg>
                          <span className="text-sm">Google Meet</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 ml-1">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full mt-1 px-4 py-2 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'}`}
                        placeholder="John Doe"
                      />
                      {errors.fullName && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><AlertCircle size={12} /> {errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 ml-1">Email Address <span className="text-red-500">*</span></label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full mt-1 px-4 py-2 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'}`}
                        placeholder="you@company.com"
                      />
                      {errors.email && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><AlertCircle size={12} /> {errors.email}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 ml-1">Company Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full mt-1 px-4 py-2 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'}`}
                        placeholder="Acme Corp"
                      />
                      {errors.companyName && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><AlertCircle size={12} /> {errors.companyName}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700 ml-1">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full mt-1 px-4 py-2 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'}`}
                        placeholder="+1 (555) 555-5555"
                      />
                      {errors.phone && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><AlertCircle size={12} /> {errors.phone}</p>}
                    </div>

                    {/* Service of Interest moved here under Phone */}
                    <div className="mt-1">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Service of Interest <span className="text-red-500">*</span></label>
                      <div className="relative mt-1">
                        <select
                          name="service"
                          value={formData.service}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full mt-0 px-4 py-2 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none ${errors.service ? 'border-red-500 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'}`}
                          style={{ backgroundColor: 'transparent' }}
                        >
                          <option value="">Select a service...</option>
                          {servicesList.map(s => <option key={s} value={s} className="bg-white text-slate-900">{s}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                          <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                      {errors.service && <p className="text-red-400 text-xs flex items-center gap-1 mt-1"><AlertCircle size={12} /> {errors.service}</p>}
                      {/* When verification is requested, show Resend under Service (left column) */}
                      {verificationSent && (
                        <div className="mt-3 hidden md:block">
                          <Button
                            type="button"
                            onClick={handleResend}
                            disabled={isVerifying}
                            className={`px-4 py-2 font-medium rounded-md shadow transition ${isVerifying ? 'bg-slate-200 text-slate-600 cursor-not-allowed' : 'bg-white text-slate-900 border border-blue-300'}`}
                          >
                            Resend
                          </Button>
                        </div>
                      )}

                      {/* Mobile-only: show Message under Service to match mobile design */}
                      <div className="mt-4 md:hidden">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Message <span className="text-red-500">*</span></label>
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          rows={3}
                          className={`w-full mt-2 px-4 py-3 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 ${errors.message ? 'border-red-500 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'}`}
                          placeholder="Tell us briefly about your needs"
                        />
                        {errors.message && <p className="text-red-400 text-xs flex items-center gap-1 mt-2"><AlertCircle size={12} /> {errors.message}</p>}
                      </div>
                    </div>

                    {/* Verification input moved to middle column (below Message) */}

                    {/* Service and Message moved under calendar to reduce left-column scrolling */}
                  </div>

                  {/* Middle: month calendar grid */}
                  <div className="md:flex-[0_0_46%] p-6 rounded-lg">
                    <h3 className="text-2xl font-bold text-slate-900 underline decoration-blue-300 decoration-2 underline-offset-4 mb-4 text-center">Select Date <span className="text-red-500">*</span></h3>
                    <div className="flex items-center justify-between mb-4">
                      <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="px-2 py-1 text-slate-700 hover:text-slate-900">‹</button>
                      <div className="text-lg font-semibold text-slate-900">{calendarDate.toLocaleString(undefined, { month: 'short' })} {calendarDate.getFullYear()}</div>
                      <button type="button" onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="px-2 py-1 text-slate-700 hover:text-slate-900">›</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-700 mb-2">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={`weekday-${i}`}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {(() => {
                        const year = calendarDate.getFullYear();
                        const month = calendarDate.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const cells = [];
                        for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} />);
                        for (let d = 1; d <= daysInMonth; d++) {
                          const mm = String(month + 1).padStart(2, '0');
                          const dd = String(d).padStart(2, '0');
                          const dateStr = `${year}-${mm}-${dd}`;
                          const disabled = dateStr < getMinDate() || dateStr > getMaxDate() || isWeekend(dateStr);
                          const selected = preferredDate === dateStr;
                          cells.push(
                            <button
                              key={dateStr}
                              type="button"
                              onClick={() => { if (!disabled) setPreferredDate(dateStr); }}
                              className={`date-btn w-full h-8 rounded ${disabled ? 'text-slate-600 opacity-60 cursor-not-allowed' : selected ? 'selected-date bg-gradient-to-r from-blue-600 to-orange-500 text-white' : 'text-slate-700 hover:text-slate-900 hover:bg-blue-100/40'}`}
                              disabled={disabled}
                            >
                              {d}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    {errors.preferredDate && <p className="text-red-400 text-xs flex items-center gap-1 mt-2"><AlertCircle size={12} /> {errors.preferredDate}</p>}

                    {/* Message (moved here) - hidden on mobile because a mobile-only Message is shown under Service */}
                    <div className="mt-4 hidden md:block">
                      <label className="text-sm font-semibold text-slate-700 ml-1">Message <span className="text-red-500">*</span></label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        rows={3}
                        className={`w-full mt-1 px-4 py-2 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 ${errors.companyName ? 'border-red-500 focus:border-red-500' : 'border-blue-300 focus:border-blue-500'}`}
                        placeholder="Tell us briefly about your needs"
                      />
                      {errors.message && <p className="text-red-400 text-xs flex items-center gap-1 mt-2"><AlertCircle size={12} /> {errors.message}</p>}
                    </div>
                    {/* Verification input (moved here below Message) */}
                    {verificationSent && (
                      <div className="mt-1 hidden md:block">
                        <label className="text-sm font-semibold text-slate-700 ml-1">Enter 6-digit code sent to your email - Valid for 15 min.</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                          className="w-full mt-1 px-4 py-3 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 border-blue-300"
                          placeholder="123456"
                        />
                      </div>
                    )}

                  </div>

                  {/* Right: scrollable time slots */}
                  <div className="md:flex-[0_0_24%] p-4 rounded-lg">
                    <h3 className="text-2xl font-bold text-slate-900 underline decoration-blue-300 decoration-2 underline-offset-4 mb-4 text-center">Select Time Slot <span className="text-red-500">*</span></h3>
                    <div className="max-h-[420px] overflow-y-auto pr-2 time-list">
                      {Array.from({ length: (17 - 8 + 1) * 2 }).map((_, i) => {
                        const hour = 8 + Math.floor(i / 2);
                        const minute = i % 2 === 0 ? 0 : 30;
                        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                        const display = `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
                        const selected = preferredTime === timeStr;
                        const isBooked = preferredDate && (bookedSlots[preferredDate] || []).includes(timeStr);
                        const isBlocked = preferredDate && isTimeBlocked(preferredDate, timeStr);
                        const isUnavailable = isBooked || isBlocked;
                        return (
                          <button
                            key={timeStr}
                            type="button"
                            onClick={() => { if (!isUnavailable) setPreferredTime(timeStr); }}
                            disabled={isUnavailable}
                            className={`time-slot-btn w-full text-left py-4 px-6 mb-3 rounded border ${selected ? 'selected-time bg-blue-600 border-blue-700 text-white' : isUnavailable ? 'bg-slate-100/50 border-slate-300 text-slate-500 cursor-not-allowed' : 'bg-white border-blue-200 text-slate-700 hover:bg-blue-50'}`}
                          >
                            <div className="text-center">
                              {display}
                              {isBooked && <span className="ml-2 text-xs text-slate-400"> (Booked)</span>}
                              {isBlocked && <span className="ml-2 text-xs text-orange-400"> (Unavailable)</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {errors.preferredTime && <p className="text-red-400 text-xs flex items-center gap-1 mt-2"><AlertCircle size={12} /> {errors.preferredTime}</p>}

                    {/* Desktop Verify under Time Slot (visible md+) */}
                    {verificationSent && (
                      <div className="mt-3 hidden md:flex justify-center">
                        <Button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={isVerifying || !/^[0-9]{6}$/.test(verificationCode)}
                          className={`w-full px-6 py-2 font-bold rounded-md shadow transition ${isVerifying || !/^[0-9]{6}$/.test(verificationCode) ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 via-teal-600 to-green-600 text-white'}`}
                        >
                          {isVerifying ? (
                            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</span>
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Mobile actions anchored under time slots (visible on small screens) */}
                    <div className="mt-3 md:hidden">
                      {verificationSent ? (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleResend}
                            disabled={isVerifying}
                            className={`flex-1 px-4 py-2 rounded-md border ${isVerifying ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 border-blue-300'}`}
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={isVerifying || !/^[0-9]{6}$/.test(verificationCode)}
                            className={`flex-1 px-4 py-2 rounded-md ${isVerifying || !/^[0-9]{6}$/.test(verificationCode) ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 via-teal-600 to-green-600 text-white'}`}
                          >
                            {isVerifying ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</span>) : 'Verify'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => onClose()}
                            className="flex-1 px-4 py-2 rounded-md border border-slate-600 text-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className={`flex-1 px-4 py-2 rounded-md ${isLoading || !isFormValid || errors.preferredDate || errors.preferredTime ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 via-teal-600 to-green-600 text-white'}`}
                            disabled={isLoading || !isFormValid || errors.preferredDate || errors.preferredTime}
                          >
                            {isLoading ? (<span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending...</span>) : 'Submit'}
                          </button>
                        </div>
                      )}
                      {/* Mobile-only verification input shown under mobile actions */}
                      {verificationSent && (
                        <div className="mt-2 md:hidden">
                          <label className="text-sm font-semibold text-slate-700 ml-1">Enter 6-digit code sent to your email - Valid for 15 min.</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full mt-1 px-4 py-3 bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 border-blue-300"
                            placeholder="123456"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop footer (md+) for primary actions when not verifying */}
                {!verificationSent && (
                  <div className="absolute left-0 right-0 bottom-6 justify-center z-20 hidden md:flex">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => { onClose(); }}
                        className="px-5 py-2 border border-slate-600 text-slate-200 rounded-md hover:border-white transition"
                      >
                        Cancel
                      </button>

                      <Button
                        type="submit"
                        disabled={isLoading || !isFormValid || errors.preferredDate || errors.preferredTime}
                        className={`px-6 py-2 font-bold rounded-md shadow transition ${isLoading || !isFormValid || errors.preferredDate || errors.preferredTime ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 via-teal-600 to-green-600 text-white'}`}
                      >
                        {isLoading ? (
                          <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending Verification Email...</span>
                        ) : (
                          'Submit'
                        )}
                      </Button>
                    </div>
                  </div>
                )}



                <style>{`
                  input[type="date"]::-webkit-calendar-picker-indicator,
                  input[type="time"]::-webkit-calendar-picker-indicator {
                    filter: brightness(0) invert(1);
                    cursor: pointer;
                  }
                  .restricted-field {
                    background: linear-gradient(135deg, #1e293b 0%, rgba(30, 41, 59, 0.7) 100%);
                  }
                  .availability-hint {
                    font-size: 11px;
                    color: #94a3b8;
                    margin-top: 4px;
                  }
                `}</style>
                <style>{`
                  /* Enable smooth/native touch scrolling for the modal on mobile */
                  .modal-scroll { -webkit-overflow-scrolling: touch; }
                `}</style>
                <style>{`
                  /* Neon glow on hover for active dates and time slots */
                  .date-btn:not(:disabled) { transition: text-shadow 160ms ease, box-shadow 160ms ease, color 160ms ease; }
                  .date-btn:not(:disabled):hover { text-shadow: 0 0 6px rgba(59,130,246,0.95), 0 0 12px rgba(16,185,129,0.75); color: #fff; }
                  .date-btn.selected-date { box-shadow: 0 0 10px rgba(59,130,246,0.85), 0 0 20px rgba(16,185,129,0.6); color: #fff; }

                  .time-slot-btn { transition: text-shadow 160ms ease, box-shadow 160ms ease, color 160ms ease; }
                  .time-slot-btn:hover { text-shadow: 0 0 6px rgba(59,130,246,0.95), 0 0 12px rgba(16,185,129,0.75); color: #fff; }
                  .time-slot-btn.selected-time { box-shadow: 0 0 8px rgba(59,130,246,0.85), 0 0 16px rgba(16,185,129,0.6); color: #fff; }

                  /* Slightly intensify glow when hovered while selected */
                  .date-btn.selected-date:hover, .time-slot-btn.selected-time:hover { box-shadow: 0 0 14px rgba(59,130,246,0.95), 0 0 28px rgba(16,185,129,0.7); }
                `}</style>
                <style>{`
                  /* Time slot scrollbar styling to match design */
                  .time-list::-webkit-scrollbar { width: 12px; }
                  .time-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 9999px; }
                  .time-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.9); border-radius: 9999px; border: 3px solid rgba(0,0,0,0); }
                  .time-list { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.9) rgba(255,255,255,0.03); }
                `}</style>

                {/* Footer removed — verification and action buttons live inside the time-column now */}
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConsultationModal;