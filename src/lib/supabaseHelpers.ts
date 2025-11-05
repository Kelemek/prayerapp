// Small helper extracted from supabase.ts so it can be tested without triggering
// the top-level Supabase client creation (which requires env vars).

export const handleSupabaseError = (error: unknown) => {
  console.error('Supabase error:', error);
  const message = error && typeof error === 'object' && 'message' in (error as any)
    ? (error as { message: string }).message
    : 'An unexpected error occurred';
  throw new Error(message);
};

export default handleSupabaseError;
