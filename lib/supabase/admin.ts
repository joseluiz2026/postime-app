import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Only for server contexts with no user session
 * to authenticate against, like the Kiwify webhook (app/api/webhooks/kiwify). Never
 * import this into anything reachable from a browser request with a user's own auth.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
