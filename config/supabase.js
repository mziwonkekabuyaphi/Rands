import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.js'

const SUPABASE_URL = "https://fqbcidcezfprranfxhyj.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxYmNpZGNlenZwcnJhbmZ4aHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MjY0ODgsImV4cCI6MjA5MzIwMjQ4OH0.eGCEE-lA8yLGjU1nFXv_A1RjbWvRbb5Mfm8FMzVRgHI"

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('roles')
    .select('name, tenant_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return { role: data.name, tenant_id: data.tenant_id }
}
