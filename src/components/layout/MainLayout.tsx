import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

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
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
