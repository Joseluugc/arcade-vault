// Static access to process.env.NEXT_PUBLIC_* is required: Next.js inlines
// these at build time only when referenced literally.
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url)
    throw new Error("Missing environment variable NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) {
    throw new Error(
      "Missing environment variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return { url, publishableKey };
}
