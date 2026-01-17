'use server'

import { createClient } from '@/lib/supabase/server'
import { hashPin, verifyPin } from '@/lib/pin'
import { revalidatePath } from 'next/cache'

export async function getParentPinStatus() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('parent_pin_hash')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('[PIN] Failed to load parent PIN status:', error)
    throw new Error('Failed to load parent PIN status')
  }

  return { hasPin: Boolean(data?.parent_pin_hash) }
}

export async function setParentPin(pin: string) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { hash, salt } = hashPin(pin)

  const { error } = await supabase
    .from('profiles')
    .update({ parent_pin_hash: hash, parent_pin_salt: salt })
    .eq('id', user.id)

  if (error) {
    console.error('[PIN] Failed to set parent PIN:', error)
    throw new Error('Failed to set parent PIN')
  }

  revalidatePath('/parent', 'page')
  return { success: true }
}

export async function verifyParentPin(pin: string) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('parent_pin_hash, parent_pin_salt')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('[PIN] Failed to load parent PIN:', error)
    throw new Error('Failed to verify parent PIN')
  }

  if (!data?.parent_pin_hash || !data?.parent_pin_salt) {
    return { valid: false }
  }

  return {
    valid: verifyPin(pin, data.parent_pin_salt, data.parent_pin_hash),
  }
}

export async function clearParentPin() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ parent_pin_hash: null, parent_pin_salt: null })
    .eq('id', user.id)

  if (error) {
    console.error('[PIN] Failed to clear parent PIN:', error)
    throw new Error('Failed to clear parent PIN')
  }

  revalidatePath('/parent', 'page')
  return { success: true }
}

export async function setStudentProfilePin(profileId: string, pin: string) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { hash, salt } = hashPin(pin)

  const { error } = await supabase
    .from('student_profiles')
    .update({ pin_hash: hash, pin_salt: salt })
    .eq('id', profileId)
    .eq('owner_id', user.id)

  if (error) {
    console.error('[PIN] Failed to set student PIN:', error)
    throw new Error('Failed to set student PIN')
  }

  revalidatePath('/profiles', 'page')
  revalidatePath('/parent', 'page')
  return { success: true }
}

export async function clearStudentProfilePin(profileId: string) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { error } = await supabase
    .from('student_profiles')
    .update({ pin_hash: null, pin_salt: null })
    .eq('id', profileId)
    .eq('owner_id', user.id)

  if (error) {
    console.error('[PIN] Failed to clear student PIN:', error)
    throw new Error('Failed to clear student PIN')
  }

  revalidatePath('/profiles', 'page')
  revalidatePath('/parent', 'page')
  return { success: true }
}

export async function verifyStudentProfilePin(profileId: string, pin: string) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('student_profiles')
    .select('pin_hash, pin_salt')
    .eq('id', profileId)
    .eq('owner_id', user.id)
    .single()

  if (error) {
    console.error('[PIN] Failed to load student PIN:', error)
    throw new Error('Failed to verify student PIN')
  }

  if (!data?.pin_hash || !data?.pin_salt) {
    return { valid: false }
  }

  return {
    valid: verifyPin(pin, data.pin_salt, data.pin_hash),
  }
}
