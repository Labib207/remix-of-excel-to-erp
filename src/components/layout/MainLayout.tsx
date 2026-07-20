import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { SyncStatus } from '../SyncStatus';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar: fixed on desktop, off-canvas drawer on mobile */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>

      {/* Backdrop for mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-auto lg:ml-64 w-full min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-sm border-b border-border px-3 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(!open)}
                aria-label={open ? 'Close menu' : 'Open menu'}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <img src={logo} alt="Ghoush" className="h-8 w-auto object-contain" />
            </div>
            <div className="ml-auto">
              <SyncStatus />
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-6 lg:p-8 w-full min-w-0 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
