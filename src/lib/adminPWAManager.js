
/**
 * Admin PWA Manager
 * 
 * Manages the state of the PWA install prompt, service worker updates,
 * and coordinates between the service worker and UI components.
 */

class AdminPWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.listeners = {};
    this.status = {
      isInstallable: false,
      isInstalled: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      updateAvailable: false
    };

    // Check if already installed (standalone mode)
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        this.status.isInstalled = true;
      }
    }
  }

  getStatus() {
    return this.status;
  }

  setStatus(updates) {
    this.status = { ...this.status, ...updates };
    this.emit('statusChange', this.status);
    
    if (updates.updateAvailable !== undefined) {
      this.emit('serviceWorkerUpdate', { updateAvailable: updates.updateAvailable });
    }
    if (updates.isOnline !== undefined) {
      this.emit('onlineStatusChange', { online: updates.isOnline });
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

export const adminPWA = new AdminPWAManager();

export const checkPWAStatus = () => {
  return adminPWA.getStatus();
};

export const registerAdminSW = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/admin-sw.js')
        .then(registration => {
          console.log('Admin SW registered: ', registration);
          
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  adminPWA.setStatus({ updateAvailable: true });
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Admin SW registration failed: ', error);
        });
    });
  }
};

export const triggerInstallPrompt = async () => {
  if (!adminPWA.deferredPrompt) {
    console.log('Install prompt not available');
    return false;
  }

  try {
    adminPWA.deferredPrompt.prompt();
    const { outcome } = await adminPWA.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      adminPWA.setStatus({ isInstallable: false, isInstalled: true });
    } else {
      console.log('User dismissed the install prompt');
    }
    
    adminPWA.deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('Failed to trigger install prompt:', error);
    return false;
  }
};

export default {
  adminPWA,
  checkPWAStatus,
  registerAdminSW,
  triggerInstallPrompt
};
