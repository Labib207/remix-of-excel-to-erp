import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Settings,
  LogOut,
  Shield,
  User,
  FileBox,
  ChevronRight,
  Truck,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Trim Chart', href: '/requirements', icon: ClipboardList },
  { name: 'Requests', href: '/requests', icon: FileBox },
  { name: 'Delivery Notes', href: '/delivery-notes', icon: Truck },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
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
    <aside className="fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-xl">
      {/* Logo Section */}
      <div className="flex h-20 items-center justify-center border-b border-sidebar-border bg-sidebar-accent/30">
        <img src={logo} alt="Ghoush Logo" className="h-14 w-auto object-contain drop-shadow-md" />
      </div>

      {/* User Info Card */}
      {user && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-primary to-accent shadow-lg">
              {isAdmin ? (
                <Shield className="h-5 w-5 text-white" />
              ) : (
                <User className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user.email?.split('@')[0]}
              </p>
              <Badge 
                variant={isAdmin ? 'default' : 'secondary'} 
                className={cn(
                  "text-[10px] mt-1 uppercase tracking-wider font-semibold",
                  isAdmin && "bg-gradient-to-r from-sidebar-primary to-accent border-0"
                )}
              >
                {role || 'user'}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <Separator className="bg-sidebar-border/50" />

      {/* Navigation Section */}
      <div className="px-3 py-2">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Main Menu
        </p>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
                isActive 
                  ? "bg-gradient-to-r from-sidebar-primary to-accent text-white shadow-lg shadow-sidebar-primary/25" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-300",
                isActive ? "text-white" : "group-hover:scale-110"
              )} />
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <ChevronRight className="h-4 w-4 text-white/70" />
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border/50" />

      {/* Bottom section */}
      <div className="p-3 space-y-1">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
          Account
        </p>
        
        <Link
          to="/profile"
          className={cn(
            "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300",
            location.pathname === '/profile'
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
          )}
        >
          <User className="h-4 w-4" />
          My Profile
        </Link>
        
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300",
              location.pathname === '/admin'
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
            )}
          >
            <Shield className="h-4 w-4" />
            Admin Panel
          </Link>
        )}
        
        <Link
          to="/settings"
          className={cn(
            "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300",
            location.pathname === '/settings'
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-1"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>

        <Separator className="my-2 bg-sidebar-border/50" />
        
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Footer branding */}
      <div className="border-t border-sidebar-border/50 px-4 py-3">
        <p className="text-[10px] text-center text-sidebar-foreground/30 uppercase tracking-wider">
          Ghoush ERP v1.0
        </p>
      </div>
    </aside>
  );
}
