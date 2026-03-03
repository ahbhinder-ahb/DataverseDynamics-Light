import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { TrashIcon, AlertCircle } from 'lucide-react';

export default function AdminBlockedSlotsPanel({ isReadOnly = false }) {
  const { toast } = useToast();
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [expandedBlockedSlots, setExpandedBlockedSlots] = useState({});
  const [bookedSlots, setBookedSlots] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Errors
  const [errors, setErrors] = useState({});

  // Fetch blocked and booked slots on mount
  useEffect(() => {
    fetchSlots();
  }, []);

  const getMinDate = () => {
    const min = new Date();
    min.setMonth(min.getMonth() - 1);
    min.setHours(0, 0, 0, 0);
    return min.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const max = new Date();
    max.setMonth(max.getMonth() + 1);
    max.setHours(0, 0, 0, 0);
    return max.toISOString().split('T')[0];
  };

  const fetchSlots = async () => {
    setIsLoading(true);
    try {
      const start_date = getMinDate();
      const end_date = getMaxDate();

      // Fetch booked slots (from users)
      const { data: bookedData, error: bookedError } = await supabase.functions.invoke('get-booked-slots', {
        body: { start_date, end_date },
      });

      if (bookedError) {
        console.error('Error fetching booked slots:', bookedError);
      } else if (bookedData) {
        const bookedList = bookedData.booked || [];

        const bookedMap = {};
        bookedList.forEach((item) => {
          if (!bookedMap[item.date]) bookedMap[item.date] = [];
          if (!bookedMap[item.date].includes(item.time)) {
            bookedMap[item.date].push(item.time);
          }
        });
        setBookedSlots(bookedMap);
      }

      // Fetch blocked slots (admin-blocked)
      const { data: blockData, error: blockError } = await supabase.functions.invoke('manage-blocked-slots', {
        body: { action: 'get_for_range', start_date, end_date },
      });

      if (blockError) {
        console.error('Error fetching blocked slots:', blockError);
      } else if (blockData) {
        const slots = blockData.data || [];

        // Build map: { date: [time1, time2, ...] }
        const expandedMap = {};
        slots.forEach((item) => {
          if (!expandedMap[item.date]) expandedMap[item.date] = [];
          if (!expandedMap[item.date].includes(item.time)) {
            expandedMap[item.date].push(item.time);
          }
        });

        setExpandedBlockedSlots(expandedMap);
      }

      // Fetch base slots for display
      const { data: baseData, error: baseError } = await supabase.functions.invoke('manage-blocked-slots', {
        body: { action: 'list' },
      });

      if (!baseError) {
        setBlockedSlots(baseData?.data || []);
      }
    } catch (error) {
      console.error('❌ Error in fetchSlots:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch slots',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isWeekend = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  const isTimeBlocked = (date, time) => {
    return (expandedBlockedSlots[date] || []).includes(time);
  };

  const isTimeBooked = (date, time) => {
    return (bookedSlots[date] || []).includes(time);
  };

  const handleBlockSlot = async () => {
    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'View-only access',
        description: 'Blocking time slots is disabled for this account.',
      });
      return;
    }

    setErrors({});

    if (!selectedDate) {
      setErrors({ selectedDate: 'Please select a date' });
      return;
    }

    if (!selectedTime) {
      setErrors({ selectedTime: 'Please select a time' });
      return;
    }

    try {
      // Parse time to get hour and minute
      const [hour, minute] = selectedTime.split(':').map(Number);

      // End time is 30 minutes after start time
      const endHour = minute === 30 ? hour + 1 : hour;
      const endMinute = minute === 30 ? 0 : 30;

      const startTimeStr = selectedTime;
      const endTimeStr = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      const { error } = await supabase.functions.invoke('manage-blocked-slots', {
        body: {
          action: 'create',
          date: selectedDate,
          start_time: startTimeStr,
          end_time: endTimeStr,
          is_recurring: false,
          reason: blockReason || null,
        },
      });

      if (error) throw error;

      // Immediately update the expanded blocked slots to prevent double-blocking
      setExpandedBlockedSlots((prev) => {
        const updated = { ...prev };
        if (!updated[selectedDate]) updated[selectedDate] = [];
        if (!updated[selectedDate].includes(selectedTime)) {
          updated[selectedDate].push(selectedTime);
        }
        return updated;
      });

      toast({
        title: 'Success',
        description: `Time slot blocked for ${selectedDate} at ${selectedTime}`,
      });

      // Reset form
      setSelectedDate('');
      setSelectedTime('');
      setBlockReason('');

      // Refresh slots after a short delay to sync with database
      setTimeout(() => fetchSlots(), 500);
    } catch (error) {
      console.error('❌ Error blocking slot:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to block slot',
      });
    }
  };

  const handleDelete = async (id) => {
    if (isReadOnly) {
      toast({
        variant: 'destructive',
        title: 'View-only access',
        description: 'Deleting blocked slots is disabled for this account.',
      });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this blocked slot?')) return;

    try {
      const { error } = await supabase.functions.invoke('manage-blocked-slots', {
        body: { action: 'delete', id },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blocked slot deleted successfully',
      });
      fetchSlots();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete blocked slot',
      });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">⏱️ Block/Unblock Time Slots</h2>

      {/* Calendar & Time Selection Interface (matching booking modal) */}
      <div className="bg-white border border-blue-200 p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Calendar */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 underline decoration-blue-300 decoration-2 underline-offset-4 mb-4 text-center">
              Select Date <span className="text-red-500">*</span>
            </h3>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                className="px-2 py-1 text-slate-700 hover:text-slate-900"
              >
                ‹
              </button>
              <div className="text-lg font-semibold text-slate-900">
                {calendarDate.toLocaleString(undefined, { month: 'short' })} {calendarDate.getFullYear()}
              </div>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                className="px-2 py-1 text-slate-700 hover:text-slate-900"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`weekday-${i}`}>{d}</div>
              ))}
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
                  const isSelected = selectedDate === dateStr;
                  cells.push(
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => { if (!disabled) setSelectedDate(dateStr); }}
                      className={`date-btn w-full h-8 rounded ${disabled
                          ? 'text-slate-400 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'selected-date bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-blue-100/40'
                        }`}
                      disabled={disabled}
                    >
                      {d}
                    </button>
                  );
                }
                return cells;
              })()}
            </div>
            {errors.selectedDate && (
              <p className="text-red-400 text-xs flex items-center gap-1 mt-2">
                <AlertCircle size={12} /> {errors.selectedDate}
              </p>
            )}

            {/* Summary Cards */}
            <div className="grid gap-3 grid-cols-2 mt-6">
              <div 
                onClick={() => setSelectedDate('')}
                className="rounded-lg border border-blue-400/20 bg-blue-100/30 p-3"
              >
                <div className="text-xs text-teal-200 mb-1">Booked</div>
                <div className="text-2xl font-bold text-slate-900">
                  {selectedDate 
                    ? (bookedSlots[selectedDate]?.length || 0)
                    : Object.values(bookedSlots).reduce((sum, times) => sum + (times?.length || 0), 0)
                  }
                </div>
                <div className="text-xs text-teal-300 mt-0.5 line-clamp-1">User slots</div>
              </div>
              <div 
                onClick={() => setSelectedDate('')}
                className="rounded-lg border border-orange-400/20 bg-orange-100/30 p-3"
              >
                <div className="text-xs text-orange-700 mb-1">Blocked</div>
                <div className="text-2xl font-bold text-slate-900">
                  {selectedDate 
                    ? (expandedBlockedSlots[selectedDate]?.length || 0)
                    : Object.values(expandedBlockedSlots).reduce((sum, times) => sum + (times?.length || 0), 0)
                  }
                </div>
                <div className="text-xs text-orange-600 mt-0.5 line-clamp-1">Admin blocks</div>
              </div>
            </div>
          </div>

          {/* Right: Time Slots */}
          <div>
            <h3 className="text-xl font-bold text-slate-900 underline decoration-blue-300 decoration-2 underline-offset-4 mb-4 text-center">
              Select Time <span className="text-red-500">*</span>
            </h3>
            <div className="max-h-[400px] overflow-y-auto pr-2 time-list space-y-2">
              {Array.from({ length: (17 - 8 + 1) * 2 }).map((_, i) => {
                const hour = 8 + Math.floor(i / 2);
                const minute = i % 2 === 0 ? 0 : 30;
                const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                const display = `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
                const isSelected = selectedTime === timeStr;
                const isBlocked = selectedDate && isTimeBlocked(selectedDate, timeStr);
                const isBooked = selectedDate && isTimeBooked(selectedDate, timeStr);
                const isUnavailable = isBlocked || isBooked;

                return (
                  <button
                    key={timeStr}
                    type="button"
                    onClick={() => { if (!isUnavailable) setSelectedTime(timeStr); }}
                    disabled={isUnavailable}
                    className={`time-slot-btn w-full text-center py-2 px-4 rounded border transition-all ${isSelected
                        ? 'selected-time bg-blue-50 border-blue-500 text-slate-900'
                        : isBooked
                          ? 'bg-blue-50/50 border-blue-400 text-blue-700 cursor-not-allowed'
                          : isBlocked
                            ? 'bg-orange-50/50 border-orange-400 text-orange-700 cursor-not-allowed'
                            : 'bg-white border-blue-200 text-slate-700 hover:bg-blue-50/60'
                      }`}
                  >
                    <div className="text-sm">
                      {display}
                      {isBooked && <span className="ml-2 text-xs">(Booked)</span>}
                      {isBlocked && !isBooked && <span className="ml-2 text-xs">(Blocked)</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.selectedTime && (
              <p className="text-red-400 text-xs flex items-center gap-1 mt-2">
                <AlertCircle size={12} /> {errors.selectedTime}
              </p>
            )}
          </div>
        </div>

        {/* Reason Input */}
        {!isReadOnly && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Reason (optional)
            </label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g., Team meeting, Admin break, Lunch"
              className="w-full px-4 py-2 border border-blue-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Block Button */}
        {!isReadOnly && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleBlockSlot}
              className="px-8 py-2 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 transition-all duration-300 font-semibold"
            >
              Block Time Slot
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Legend:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-blue-500 bg-blue-100/50 rounded"></div>
            <span className="text-sm text-slate-700">Booked (by users)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-orange-500 bg-orange-100/50 rounded"></div>
            <span className="text-sm text-slate-700">Blocked (by admin)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-blue-300 bg-white rounded"></div>
            <span className="text-sm text-slate-700">Available</span>
          </div>
        </div>
      </div>

      {/* Blocked Slots List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Current Blocked Slots</h3>
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Loading slots...</p>
          </div>
        ) : blockedSlots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500">No blocked time slots yet.</p>
          </div>
        ) : (
          blockedSlots.map((slot) => (
            <div
              key={slot.id}
              className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-slate-900">
                      {new Date(slot.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <span className="px-3 py-1 bg-orange-100/50 text-orange-700 rounded-full text-sm font-medium border border-orange-300">
                      {slot.start_time} - {slot.end_time}
                    </span>
                    {slot.is_recurring && (
                      <span className="px-3 py-1 bg-blue-100/50 text-blue-700 rounded-full text-sm font-medium border border-blue-300">
                        🔄 {slot.recurring_pattern.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {slot.reason && (
                    <p className="text-sm text-slate-600 mt-2">
                      <strong className="text-slate-700">Reason:</strong> {slot.reason}
                    </p>
                  )}
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleDelete(slot.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <TrashIcon size={18} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
