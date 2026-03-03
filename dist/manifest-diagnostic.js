/**
 * Manifest Diagnostic Utility
 * Runs in the browser console to diagnose manifest issues
 * Copy and paste in browser console: runManifestDiagnostic()
 */

window.runManifestDiagnostic = async function() {
  console.log('%c=== MANIFEST DIAGNOSTIC ===', 'font-size: 14px; font-weight: bold; color: #0066cc;');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    protocol: window.location.protocol,
  };

  // 1. Check if manifest link exists in DOM
  console.log('\n%c1. Checking manifest link in DOM...', 'font-weight: bold; color: #006600;');
  const manifestLink = document.querySelector('link[rel="manifest"]');
  
  if (manifestLink) {
    diagnostics.manifestHref = manifestLink.href;
    console.log('✓ Manifest link found');
    console.log('  href:', manifestLink.href);
    
    // 2. Try to resolve the absolute URL
    const absoluteUrl = new URL(manifestLink.href, window.location.href).href;
    diagnostics.absoluteManifestUrl = absoluteUrl;
    console.log('  absolute URL:', absoluteUrl);
    
    // 3. Try to fetch the manifest
    console.log('\n%c2. Attempting to fetch manifest...', 'font-weight: bold; color: #006600;');
    try {
      const response = await fetch(manifestLink.href);
      diagnostics.fetchStatus = response.status;
      diagnostics.fetchOk = response.ok;
      
      console.log('✓ Fetch request completed');
      console.log('  status:', response.status);
      console.log('  ok:', response.ok);
      console.log('  content-type:', response.headers.get('content-type'));
      
      if (response.ok) {
        try {
          const manifestData = await response.json();
          diagnostics.manifestValid = true;
          diagnostics.manifestName = manifestData.name;
          console.log('✓ Manifest JSON parsed successfully');
          console.log('  name:', manifestData.name);
          console.log('  display:', manifestData.display);
          console.log('  start_url:', manifestData.start_url);
        } catch (e) {
          diagnostics.manifestValid = false;
          console.error('✗ Manifest JSON parsing failed:', e.message);
        }
      } else {
        console.error('✗ Fetch failed with status:', response.status);
      }
    } catch (e) {
      console.error('✗ Fetch request failed:', e.message);
      diagnostics.fetchError = e.message;
    }
  } else {
    console.error('✗ No manifest link found in document head');
    diagnostics.manifestHref = null;
  }

  // 4. Check browser PWA capabilities
  console.log('\n%c3. Checking PWA capabilities...', 'font-weight: bold; color: #006600;');
  const capabilities = {
    serviceWorker: 'serviceWorker' in navigator,
    requestIdleCallback: typeof requestIdleCallback === 'function',
    requestUserMediaDevices: !!navigator.mediaDevices?.getUserMedia,
    localStorage: typeof localStorage !== 'undefined',
  };
  
  Object.entries(capabilities).forEach(([key, value]) => {
    console.log(`  ${key}:`, value ? '✓' : '✗');
  });
  diagnostics.capabilities = capabilities;

  // 5. Check for service worker registration
  console.log('\n%c4. Checking service worker registration...', 'font-weight: bold; color: #006600;');
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('✓ Service workers found:', registrations.length);
      registrations.forEach((reg, i) => {
        console.log(`  [${i}] scope: ${reg.scope}`);
        console.log(`      active: ${reg.active ? 'yes' : 'no'}`);
        console.log(`      installing: ${reg.installing ? 'yes' : 'no'}`);
        console.log(`      waiting: ${reg.waiting ? 'yes' : 'no'}`);
      });
      diagnostics.serviceWorkers = registrations.map(r => ({
        scope: r.scope,
        active: !!r.active,
        installing: !!r.installing,
        waiting: !!r.waiting,
      }));
    } catch (e) {
      console.error('✗ Error checking service workers:', e.message);
    }
  } else {
    console.error('✗ Service Worker API not available');
  }

  // 6. Check for beforeinstallprompt event
  console.log('\n%c5. Checking PWA install prompt...', 'font-weight: bold; color: #006600;');
  if (window.deferredPrompt) {
    console.log('✓ Install prompt available (deferredPrompt exists)');
    diagnostics.installPrompt = 'available';
  } else {
    console.warn('⚠ No install prompt cached (normal if not triggered yet)');
    diagnostics.installPrompt = 'not_cached';
  }

  // 7. Installation criteria summary
  console.log('\n%c6. Installation Criteria Summary:', 'font-weight: bold; font-size: 12px; color: #cc0000;');
  const criteria = {
    'HTTPS or localhost': window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    'Valid manifest': diagnostics.manifestValid,
    'Service worker registered': diagnostics.serviceWorkers?.length > 0,
    'Manifest fetchable': diagnostics.fetchOk,
  };
  
  Object.entries(criteria).forEach(([key, value]) => {
    console.log(`  ${value ? '✓' : '✗'} ${key}`);
  });
  
  const allCriteriaMet = Object.values(criteria).every(v => v);
  console.log('\n%c' + (allCriteriaMet ? 'ALL CRITERIA MET - PWA SHOULD BE INSTALLABLE ✓' : 'SOME CRITERIA NOT MET - PWA NOT FULLY READY'), 
    allCriteriaMet ? 'font-weight: bold; color: #00cc00; font-size: 13px;' : 'font-weight: bold; color: #cc0000; font-size: 13px;');

  // 8. Final summary
  console.log('\n%c=== DIAGNOSTIC SUMMARY ===', 'font-size: 12px; font-weight: bold; color: #0066cc;');
  console.table(diagnostics);
  
  return diagnostics;
};

// Also run automatically when this script loads
console.log('%c[Manifest Diagnostic] Loaded. Run: runManifestDiagnostic()', 'color: #0066cc;');
