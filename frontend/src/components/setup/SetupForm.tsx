import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLibraryStore } from '@/store/libraryStore';

export function SetupForm() {
  const [path, setPath] = useState('');
  const { setLibraryPath, loadDatabase, isLoading, error, dropboxError, clearError, clearDropboxError } = useLibraryStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPath = path.trim();
    if (!trimmedPath) return;

    clearError();
    clearDropboxError();
    setLibraryPath(trimmedPath);
    await loadDatabase();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configure Calibre Library</CardTitle>
          <CardDescription>
            Your database is downloaded once and cached locally. All queries run
            in your browser using WebAssembly - instant search, works offline!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(error || dropboxError) && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
              {error || dropboxError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="libraryPath" className="text-sm font-medium">
                Calibre Library Path
              </label>
              <Input
                id="libraryPath"
                type="text"
                placeholder="/Calibre Library"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                The folder path in Dropbox containing your Calibre library
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Load Library'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
