import { createClient } from "@supabase/supabase-js";
import { getRequiredServerEnv } from "@/lib/env";

const supabaseUrl = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRoleKey = getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY");

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
