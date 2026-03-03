
import React, { useState, useEffect } from 'react';
import { Smartphone, Globe } from 'lucide-react';
import { adminPWA } from '@/lib/adminPWAManager';

/**
 * AdminStatusBadges Component
 * 
 * Displays compact header badges for Network connectivity and App mode.
 */
const AdminStatusBadges = () => {
  const [status, setStatus] = useState(adminPWA.getStatus());

  useEffect(() => {
    const handleStatusChange = (newStatus) => {
      setStatus({ ...newStatus });
    };

    adminPWA.on('statusChange', handleStatusChange);
    
    // Initial fetch to ensure we have the latest state
    setStatus(adminPWA.getStatus());

    return () => {
      adminPWA.off('statusChange', handleStatusChange);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Network Status Badge */}
      <div 
        className={`flex items-center gap-2 rounded-full px-3 py-2 border text-xs font-medium transition-all whitespace-nowrap ${
          status.isOnline 
            ? 'bg-green-100 text-green-700 border-green-300 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
            : 'bg-red-100 text-red-700 border-red-300 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
        }`}
        title={`Network Status: ${status.isOnline ? 'Online' : 'Offline'}`}
      >
        {status.isOnline ? (
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-600 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600"></span>
          </div>
        ) : (
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600"></span>
          </div>
        )}
        <span>{status.isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* App Mode Badge */}
      <div 
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 border text-xs font-medium transition-all whitespace-nowrap ${
          status.isInstalled 
            ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
            : 'bg-slate-100 text-slate-700 border-slate-300'
        }`}
        title={`App Mode: ${status.isInstalled ? 'Standalone App' : 'Web Browser'}`}
      >
        {status.isInstalled ? <Smartphone size={14} className="flex-shrink-0" /> : <Globe size={14} className="flex-shrink-0" />}
        <span>{status.isInstalled ? 'App' : 'Browser'}</span>
      </div>
    </div>
  );
};

export default AdminStatusBadges;
