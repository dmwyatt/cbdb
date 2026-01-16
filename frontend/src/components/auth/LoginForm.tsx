import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';

export function LoginForm() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    clearError();
    setIsLoading(true);

    try {
      await login(password);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Calibre Library</CardTitle>
          <CardDescription>
            Enter your password to access the library
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}

          {/*
            Form structure optimized for password managers:
            - Real <form> with action attribute
            - Hidden username field for password manager compatibility
            - Proper autocomplete attributes
            - Submit button inside form
          */}
          <form onSubmit={handleSubmit} action="#" method="POST" className="space-y-4">
            {/* Hidden username field for password manager compatibility */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              defaultValue="calibre-user"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
