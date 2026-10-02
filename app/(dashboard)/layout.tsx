import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardShell from '@/components/layout/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  const fullName = profile?.full_name ?? user.email ?? 'User';
  const role     = (profile?.role ?? 'viewer') as 'admin' | 'viewer';

  return (
    <DashboardShell fullName={fullName} role={role}>
      {children}
    </DashboardShell>
  );
}
