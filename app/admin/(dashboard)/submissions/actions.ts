'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveSubmission(id: string) {
  const supabase = await createClient()
  await supabase.from('submissions').update({ status: 'approved' }).eq('id', id)
  revalidatePath('/admin/submissions')
}

export async function rejectSubmission(id: string) {
  const supabase = await createClient()
  await supabase.from('submissions').update({ status: 'rejected' }).eq('id', id)
  revalidatePath('/admin/submissions')
}