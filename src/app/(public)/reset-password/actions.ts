'use server'

import { createClient } from '@supabase/supabase-js'

export async function resetPassword(userId: string, password: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
