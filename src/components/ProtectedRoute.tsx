import { ReactNode, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

function PendingApproval() {
  const { user, signOut, refreshApproval } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-warning" />
            </div>
          </div>
          <CardTitle className="text-2xl">Waiting for approval</CardTitle>
          <CardDescription>
            Your account ({user?.email}) has been created, but an administrator must approve it
            before you can access any data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full gap-2"
            disabled={isChecking}
            onClick={async () => {
              setIsChecking(true);
              await refreshApproval();
              setIsChecking(false);
            }}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Check again
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={async () => {
              await signOut();
              navigate('/auth');
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, isApproved, isCheckingApproval } = useAuth();

  if (isLoading || (user && isCheckingApproval)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isApproved && !isAdmin) {
    return <PendingApproval />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
