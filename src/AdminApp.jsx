
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import PWASetup from '@/components/PWASetup';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import AdminLogin from '@/pages/AdminLogin';
import AdminDashboard from '@/pages/AdminDashboard';

/**
 * Admin App Wrapper
 * Used when admin.html is served directly
 * Handles admin-specific routes only
 */
function AdminApp() {
  useEffect(() => {
    console.log('[AdminApp] Admin app initialized');
  }, []);

  return (
    <BrowserRouter>
      <Toaster />
      <AuthProvider>
        <PWASetup />
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="*" element={<AdminLogin />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AdminApp;
