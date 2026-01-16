import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/store/libraryStore';
import { useAuthStore } from '@/store/authStore';

export function Header() {
  const { db, searchTerm, setSearchTerm, resetLibrary } = useLibraryStore();
  const { authRequired, logout } = useAuthStore();
  const showSearch = db !== null;

  return (
    <header className="bg-slate-800 text-white py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">
            <a href="/" className="text-white no-underline hover:text-white">
              Calibre Library
            </a>
          </h1>
          <div className="flex gap-2">
            {showSearch && (
              <Button
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={() => resetLibrary()}
              >
                Change Library
              </Button>
            )}
            {authRequired && (
              <Button
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={logout}
              >
                Log Out
              </Button>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search books or authors... (instant!)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white text-slate-900"
            />
          </div>
        )}
      </div>
    </header>
  );
}
