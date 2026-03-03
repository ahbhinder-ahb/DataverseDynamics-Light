
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import ErrorBoundary from '@/components/ErrorBoundary';
import { validateEnv } from '@/lib/validateEnv';
import { AlertTriangle } from 'lucide-react';
import '@/index.css';

// Perform validation before rendering anything
let envError = null;
try {
  validateEnv();
} catch (e) {
  envError = e;
  console.error(e.message);
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

if (envError) {
  // Render a safe error screen if configuration is missing
  root.render(
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 flex flex-col items-center justify-center p-4 text-center font-sans text-slate-900">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-red-300 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4">Configuration Error</h1>
        <p className="text-slate-400 mb-6">
          The application cannot start because some required configuration is missing.
        </p>
        <div className="bg-black/30 p-4 rounded-lg text-left text-sm font-mono text-red-300 overflow-x-auto">
          {envError.message}
        </div>
        <p className="mt-6 text-sm text-slate-500">
          Please check your .env file and ensure all required variables are set.
        </p>
      </div>
    </div>
  );
} else {
  // Render App with all routing including admin routes
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
