import { useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SetupForm } from '@/components/setup/SetupForm';
import { Library } from '@/components/books/Library';
import { LoadingOverlay } from '@/components/common/LoadingOverlay';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useLibraryStore } from '@/store/libraryStore';

function App() {
  const { db, libraryPath, isLoading, loadingMessage, loadingProgress, error, loadDatabase, clearError, cancelLoading } =
    useLibraryStore();

  // Auto-load database if we have a saved library path
  useEffect(() => {
    if (libraryPath && !db && !isLoading) {
      loadDatabase();
    }
  }, [libraryPath, db, isLoading, loadDatabase]);

  const showSetup = !db && !isLoading;
  const showLibrary = db !== null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {isLoading && !error && (
        <LoadingOverlay message={loadingMessage} progress={loadingProgress} onCancel={cancelLoading} />
      )}

      {showSetup && <SetupForm />}
      {showLibrary && <Library />}

      {/* Show error dialog - works for both refresh failures and initial load errors */}
      {error && (
        <ErrorAlert error={error} onDismiss={clearError} />
      )}

      <Footer />
    </div>
  );
}

export default App;
