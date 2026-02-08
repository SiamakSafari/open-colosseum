/**
 * Environment Variable Validation
 *
 * Checks all required and optional env vars at startup.
 * Caches result after first call.
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
  'ANTHROPIC_API_KEY',
  'CRON_SECRET',
] as const;

const OPTIONAL_VARS = [
  'OPENAI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'NEXT_PUBLIC_SITE_URL',
] as const;

let cachedResult: EnvValidationResult | null = null;

export function validateEnv(): EnvValidationResult {
  if (cachedResult) return cachedResult;

  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
    }
  }

  // Validate ENCRYPTION_KEY format (64 hex chars = 32 bytes)
  const encKey = process.env.ENCRYPTION_KEY;
  if (encKey && !/^[0-9a-fA-F]{64}$/.test(encKey)) {
    missing.push('ENCRYPTION_KEY (invalid format: must be 64 hex characters)');
  }

  // Check optional vars
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      warnings.push(`${varName} is not set — some features may be unavailable`);
    }
  }

  cachedResult = {
    valid: missing.length === 0,
    missing,
    warnings,
  };

  return cachedResult;
}
