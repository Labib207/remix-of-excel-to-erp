import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Scissors, 
  Package, 
  FileText,
  Settings,
  Factory,
  Ruler
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ClipboardList },
  { name: 'Marker Plans', href: '/markers', icon: Ruler },
  { name: 'Cutting Plans', href: '/cutting', icon: Scissors },
  { name: 'Bundles', href: '/bundles', icon: Package },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
          <Factory className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-sidebar-foreground">Adeem Uniform</h1>
          <p className="text-xs text-sidebar-foreground/60">Cutting ERP</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-sidebar-primary")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </div>
  );
}
