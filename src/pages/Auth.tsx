import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, LogIn, UserPlus, KeyRound, ArrowLeft, WifiOff, Cloud } from 'lucide-react';
import logo from '@/assets/logo.png';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/');
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);

    if (error) {
      let errorMessage = error.message;
      if (error.message.includes('already registered')) {
        errorMessage = 'This email is already registered. Please login instead.';
      }
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: errorMessage,
      });
    } else {
      toast({
        title: 'Account Created!',
        description: 'You have successfully signed up and logged in.',
      });
      navigate('/');
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: redirectUrl,
    });
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Reset Failed',
        description: error.message || 'Failed to send reset email',
      });
    } else {
      setResetEmailSent(true);
      toast({
        title: 'Check your email',
        description: 'We sent you a password reset link.',
      });
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    forgotPasswordForm.reset();
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <img src={logo} alt="Logo" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              {resetEmailSent 
                ? "Check your email for the reset link" 
                : "Enter your email to receive a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetEmailSent ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <KeyRound className="h-12 w-12 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to your email address. 
                    Please check your inbox and follow the instructions.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={handleBackToLogin}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            ) : (
              <Form {...forgotPasswordForm}>
                <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full gap-2" 
                    onClick={handleBackToLogin}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logo} alt="Logo" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl">Stock Management</CardTitle>
          <CardDescription>Sign in to manage your stock operations</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Offline Warning */}
          {!isOnline && (
            <Alert className="mb-4 border-warning bg-warning/10">
              <WifiOff className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                You're offline. Sign up is only available when connected to the cloud.
              </AlertDescription>
            </Alert>
          )}

          {/* Online indicator */}
          {isOnline && (
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
              <Cloud className="h-4 w-4 text-success" />
              <span>Connected to Cloud</span>
            </div>
          )}

          <Tabs value="login" onValueChange={setActiveTab}>
            <div className="mb-6 text-center">
              <h3 className="text-lg font-medium flex items-center justify-center gap-2">
                <LogIn className="h-5 w-5" />
                Login
              </h3>
              <p className="text-xs text-muted-foreground mt-2">
                Sign-up is disabled. Contact the administrator for account access.
              </p>
            </div>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input placeholder="••••••••" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="px-0 text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}