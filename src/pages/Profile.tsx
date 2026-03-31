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
import { User, Mail, Shield, Calendar, Loader2, Save, Download, CloudUpload, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { exportAllLocalData, getLocalDataCounts, getCloudDataCounts, downloadBackupJson, migrateLocalToCloud, importBackupToCloud, type MigrationProgress } from '@/lib/backupExport';
import { Progress } from '@/components/ui/progress';
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
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress[] | null>(null);
  const [migrationDone, setMigrationDone] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<MigrationProgress[] | null>(null);
  const [restoreDone, setRestoreDone] = useState(false);

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

        {/* Migration Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5" />
              Migrate Data to Cloud
            </CardTitle>
            <CardDescription>
              Push all your local data to the cloud database using upsert (no duplicates). Your local data will NOT be deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {migrationProgress && (
              <div className="space-y-2">
                {migrationProgress.filter(p => p.total > 0).map((p) => (
                  <div key={p.table} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {p.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                        {p.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                        {p.status === 'migrating' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {p.table.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground">{p.done}/{p.total}</span>
                    </div>
                    <Progress value={p.total > 0 ? (p.done / p.total) * 100 : 0} className="h-1.5" />
                    {p.error && <p className="text-xs text-destructive">{p.error}</p>}
                  </div>
                ))}
              </div>
            )}

            {migrationDone && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Migration complete! All data is now in the cloud. Please confirm so I can proceed to Step 3.
              </div>
            )}

            <Button
              disabled={isMigrating || migrationDone}
              onClick={async () => {
                setIsMigrating(true);
                setMigrationDone(false);
                try {
                  const { success, summary } = await migrateLocalToCloud(setMigrationProgress);
                  if (success) {
                    setMigrationDone(true);
                    const totalRecords = Object.values(summary).reduce((a, b) => a + b, 0);
                    toast({ title: '✅ Migration Complete', description: `${totalRecords} records migrated to cloud` });
                  } else {
                    toast({ variant: 'destructive', title: 'Migration had errors', description: 'Some tables failed. Check the progress above.' });
                  }
                } catch (e: any) {
                  toast({ variant: 'destructive', title: 'Migration Failed', description: e.message });
                } finally {
                  setIsMigrating(false);
                }
              }}
            >
              {isMigrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CloudUpload className="h-4 w-4 mr-2" />}
              {migrationDone ? 'Migration Complete' : 'Start Migration to Cloud'}
            </Button>
          </CardContent>
        </Card>

        {/* Restore from Backup JSON */}
        <Card className="border-2 border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Restore from Backup JSON
            </CardTitle>
            <CardDescription>
              Upload your backup JSON file to restore all data into the cloud database. Uses upsert — no duplicates, no data loss.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {restoreProgress && (
              <div className="space-y-2">
                {restoreProgress.filter(p => p.total > 0).map((p) => (
                  <div key={p.table} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {p.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                        {p.status === 'error' && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                        {p.status === 'migrating' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {p.table.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground">{p.done}/{p.total}</span>
                    </div>
                    <Progress value={p.total > 0 ? (p.done / p.total) * 100 : 0} className="h-1.5" />
                    {p.error && <p className="text-xs text-destructive">{p.error}</p>}
                  </div>
                ))}
              </div>
            )}

            {restoreDone && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Restore complete! All backup data has been imported to the cloud.
              </div>
            )}

            <div>
              <input
                type="file"
                accept=".json"
                id="restore-backup-input"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsRestoring(true);
                  setRestoreDone(false);
                  setRestoreProgress(null);
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const { success, summary } = await importBackupToCloud(data, setRestoreProgress);
                    if (success) {
                      setRestoreDone(true);
                      const totalRecords = Object.values(summary).reduce((a, b) => a + b, 0);
                      toast({ title: '✅ Restore Complete', description: `${totalRecords} records restored to cloud` });
                    } else {
                      toast({ variant: 'destructive', title: 'Restore had errors', description: 'Some tables failed. Check the progress above.' });
                    }
                  } catch (err: any) {
                    toast({ variant: 'destructive', title: 'Restore Failed', description: err.message });
                  } finally {
                    setIsRestoring(false);
                    e.target.value = '';
                  }
                }}
              />
              <Button
                disabled={isRestoring}
                onClick={() => document.getElementById('restore-backup-input')?.click()}
                className="gap-2"
              >
                {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {restoreDone ? 'Restore Complete' : 'Upload Backup JSON & Restore'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
