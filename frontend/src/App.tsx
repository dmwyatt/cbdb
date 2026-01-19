import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SetupForm } from '@/components/setup/SetupForm';
import { Library } from '@/components/books/Library';
import { BookDetailPage } from '@/components/books/BookDetailPage';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { DropboxErrorBanner } from '@/components/common/DropboxErrorBanner';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';

function App() {
  const { db, libraryPath, isLoading, loadingMessage, loadingProgress, error, dropboxError, loadDatabase, clearError, clearDropboxError, cancelLoading } =
    useLibraryStore();
  const { authRequired, isAuthenticated, isMisconfigured, isCheckingAuth, error: authError, checkAuth } = useAuthStore();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Auto-load database if we have a saved library path and are authenticated
  // Don't auto-retry if there's an error - let user trigger retry manually
  useEffect(() => {
    if (isAuthenticated && libraryPath && !db && !isLoading && !error && !dropboxError) {
      loadDatabase();
    }
  }, [isAuthenticated, libraryPath, db, isLoading, error, dropboxError, loadDatabase]);

  // Show loading spinner while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if server is misconfigured (no APP_PASSWORD set)
  if (isMisconfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Server Configuration Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              The server is not properly configured. The administrator must set the{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">APP_PASSWORD</code>{' '}
              environment variable.
            </p>
            <p className="text-sm text-slate-500">
              If you are the administrator, add <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">APP_PASSWORD=your_password</code> to your environment variables and restart the server.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show connection error
  if (authError && !isMisconfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 text-center">{authError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login form if authentication is required and user is not authenticated
  if (authRequired && !isAuthenticated) {
    return <LoginForm />;
  }

  const showSetup = !db && !isLoading;
  const showLibrary = db !== null;

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />

        {/* Dropbox auth error banner - only show when library is loaded (setup form handles its own errors) */}
        {showLibrary && <DropboxErrorBanner error={dropboxError} onDismiss={clearDropboxError} />}

        {isLoading && !error && (
          <LoadingOverlay message={loadingMessage} progress={loadingProgress} onCancel={cancelLoading} />
        )}

        {showSetup && <SetupForm />}

        {showLibrary && (
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/book/:id" element={<BookDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}

        {/* Show error dialog - works for both refresh failures and initial load errors */}
        {error && (
          <ErrorAlert error={error} onDismiss={clearError} />
        )}

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
