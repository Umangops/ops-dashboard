import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UploadHistoryTable from '@/components/UploadHistoryTable';

export default async function UploadsPage() {
  const supabase = await createClient();

  // Auth + admin check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/hitachi');

  // Fetch all imports, newest first
  const { data: imports } = await supabase
    .from('imports')
    .select('id, brand, file_name, uploaded_by_name, total_rows, inserted, updated, skipped, created_at')
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Upload History</h1>
        <p className="mt-0.5 text-sm text-ink-3">
          All Excel imports across every brand, newest first.
        </p>
      </div>

      <UploadHistoryTable imports={imports ?? []} />
    </div>
  );
}
