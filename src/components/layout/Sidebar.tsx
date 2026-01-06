import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Scissors, 
  Package, 
  FileText,
  Settings,
  Ruler,
  Scale,
  Calculator,
  Percent,
  Layers,
  Send,
  FileBox,
  LogOut,
  Shield,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ClipboardList },
  { name: 'Ratio Planning', href: '/ratios', icon: Percent },
  { name: 'Marker Plans', href: '/markers', icon: Ruler },
  { name: 'Cutting Plans', href: '/cutting', icon: Scissors },
  { name: 'Lay Sheets', href: '/laysheets', icon: Layers },
  { name: 'Bundles', href: '/bundles', icon: Package },
  { name: 'Fabric Calculation', href: '/fabric', icon: Calculator },
  { name: 'Requests', href: '/requests', icon: FileBox },
  { name: 'Delivery Notes', href: '/delivery-notes', icon: Send },
  { name: 'Reconciliation', href: '/reconciliation', icon: Scale },
  { name: 'Reports', href: '/reports', icon: FileText },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut, isAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-4">
        <img src={logo} alt="Ghoush Logo" className="h-16 w-auto object-contain" />
      </div>

      {/* User Info */}
      {user && (
        <div className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              {isAdmin ? (
                <Shield className="h-4 w-4 text-sidebar-primary" />
              ) : (
                <User className="h-4 w-4 text-sidebar-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs mt-0.5">
                {role || 'user'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
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

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          to="/profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            location.pathname === '/profile'
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <User className="h-5 w-5" />
          My Profile
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              location.pathname === '/admin'
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <Shield className="h-5 w-5" />
            Admin Panel
          </Link>
        )}
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            location.pathname === '/settings'
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
