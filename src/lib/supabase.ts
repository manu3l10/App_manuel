import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wxrxagmxrmpfdltrclld.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4cnhhZ214cm1wZmRsdHJjbGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDAyNjMsImV4cCI6MjA4OTk3NjI2M30.LR3tl_7ud3uuTi5Acn2V4k4NBTbpGPR9nH4QDnGGJdY'

export const supabase = createClient(supabaseUrl, supabaseKey)
