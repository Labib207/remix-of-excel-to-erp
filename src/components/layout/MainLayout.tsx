import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { SyncStatus } from '../SyncStatus';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Fixed Sidebar */}
      <Sidebar />
      
      {/* Main content with left margin to account for fixed sidebar */}
      <main className="flex-1 ml-64 min-h-screen overflow-auto">
        {/* Top bar with sync status */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-6 py-3">
          <div className="flex items-center justify-end">
            <SyncStatus />
          </div>
        </div>
        
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
