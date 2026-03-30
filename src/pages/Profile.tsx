import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Shield, Calendar, Loader2, Save, Download } from 'lucide-react';
import { exportAllLocalData, getLocalDataCounts, downloadBackupJson } from '@/lib/backupExport';
import { format } from 'date-fns';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export default function Profile() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [dataCounts, setDataCounts] = useState<Record<string, number> | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch profile',
        });
      } else if (data) {
        setProfile(data);
        form.reset({
          full_name: data.full_name || '',
        });
      }

      setIsLoading(false);
    };

    fetchProfile();
  }, [user]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
      })
      .eq('id', user.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile',
      });
    } else {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      setProfile((prev) =>
        prev ? { ...prev, full_name: data.full_name } : null
      );
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <User className="h-8 w-8" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            View and update your profile information
          </p>
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                  {role || 'user'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {profile?.created_at
                    ? format(new Date(profile.created_at), 'MMMM d, yyyy')
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        {/* Backup Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backup Local Data
            </CardTitle>
            <CardDescription>
              Download all your local IndexedDB data as a JSON file for safekeeping.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataCounts && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {Object.entries(dataCounts).map(([table, count]) => (
                  <div key={table} className="bg-muted rounded-lg p-2 text-center">
                    <div className="font-bold">{count}</div>
                    <div className="text-muted-foreground text-xs">{table.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={isExporting}
                onClick={async () => {
                  const counts = await getLocalDataCounts();
                  setDataCounts(counts);
                  toast({ title: 'Data Counts', description: `Found records in ${Object.keys(counts).filter(k => counts[k] > 0).length} tables` });
                }}
              >
                Show Record Counts
              </Button>
              <Button
                disabled={isExporting}
                onClick={async () => {
                  setIsExporting(true);
                  try {
                    const data = await exportAllLocalData();
                    downloadBackupJson(data);
                    toast({ title: 'Backup Downloaded', description: 'All local data exported as JSON' });
                  } catch (e: any) {
                    toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                Download Backup JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
