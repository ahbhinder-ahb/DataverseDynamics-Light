import React, { useEffect, useRef } from 'react';
import { adminPWA } from '@/lib/adminPWAManager';

/**
 * PWA Setup Component
 * Handles manifest detection and service worker registration for admin panel
 * This runs once when the app mounts and ensures PWA infrastructure is initialized
 */
const PWASetup = () => {
  const setupCompleted = useRef(false);

  useEffect(() => {
    // Only run setup once
    if (setupCompleted.current) return;
    setupCompleted.current = true;

    const isAdminRoute = window.location.pathname.includes('/admin');
    if (!isAdminRoute) return;

    console.log('[PWASetup] Starting PWA setup for admin route...');

    // 1. Ensure manifest link exists in document head
    let manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      console.log('[PWASetup] Creating manifest link...');
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/admin-manifest.json';
      document.head.appendChild(manifestLink);
    } else {
      console.log('[PWASetup] Manifest link already exists:', manifestLink.href);
    }

    // 2. Verify manifest is accessible
    console.log('[PWASetup] Verifying manifest accessibility...');
    fetch('/admin-manifest.json')
      .then(response => {
        if (response.ok) {
          console.log('[PWASetup] ✓ Manifest is accessible (200)');
          return response.json();
        }
        throw new Error(`Manifest fetch failed: ${response.status}`);
      })
      .then(manifest => {
        console.log('[PWASetup] ✓ Manifest loaded successfully:', manifest.name);

        // Re-check PWA status
        setTimeout(() => {
          console.log('[PWASetup] Final PWA status check:');
          const status = adminPWA.getStatus();
          console.log('[PWASetup] PWA Status:', status);
          if (status.isInstallable) {
            console.log('[PWASetup] ✓ PWA is installable!');
          }
        }, 500);
      })
      .catch(error => {
        console.error('[PWASetup] ✗ Manifest error:', error.message);
      });

    // 3. Register service worker if not already registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          console.log(`[PWASetup] Found ${registrations.length} service worker(s)`);

          if (registrations.length === 0) {
            console.log('[PWASetup] Registering service worker...');
            navigator.serviceWorker
              .register('/admin-sw.js', { scope: '/' })
              .then(reg => {
                console.log('[PWASetup] ✓ Service worker registered:', reg.scope);
              })
              .catch(error => {
                console.error('[PWASetup] ✗ Service worker registration failed:', error.message);
              });
          } else {
            // Service workers already registered
            registrations.forEach((reg, idx) => {
              console.log(
                `[PWASetup] Service worker ${idx + 1}: scope=${reg.scope}, active=${!!reg.active}`
              );
            });
          }
        })
        .catch(error => {
          console.error('[PWASetup] ✗ Error checking service workers:', error.message);
        });
    }

    // 4. Re-initialize PWA manager to pick up manifest
    console.log('[PWASetup] Re-initializing PWA manager...');
    if (typeof adminPWA.init === 'function') {
      adminPWA.init();
    }

    console.log('[PWASetup] ✓ PWA setup completed');
  }, []);

  // This is a setup-only component, doesn't render anything
  return null;
};

export default PWASetup;
