/**
 * Next.js Instrumentation Hook
 *
 * Runs once on server start. Validates environment variables
 * and prevents the app from starting in a broken state.
 */

export async function register() {
  // Only run on the Node.js server runtime
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { validateEnv } = await import('@/lib/validateEnv');
  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn('[env] Warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (!result.valid) {
    console.error('[env] Missing required environment variables:');
    result.missing.forEach(m => console.error(`  - ${m}`));
    throw new Error(`Missing required environment variables: ${result.missing.join(', ')}`);
  }

  console.log('[env] All required environment variables present.');
}
