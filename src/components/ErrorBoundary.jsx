import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4 text-center font-sans">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-blue-200 backdrop-blur-sm shadow-2xl">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Something went wrong
              </h1>
              <p className="text-slate-700">
                We apologize for the inconvenience. An unexpected error has occurred.
              </p>
              {import.meta.env.MODE === 'development' && this.state.error && (
                <div className="text-left bg-red-50 p-4 rounded-lg overflow-auto max-h-40 text-xs text-red-700 font-mono mt-4">
                  {this.state.error.toString()}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={this.handleReload}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <RefreshCw size={16} />
                Reload Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1 border-blue-300 text-slate-700 hover:bg-blue-100 gap-2"
              >
                <Home size={16} />
                Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;