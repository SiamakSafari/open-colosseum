/**
 * Content Moderation for Underground Arena
 *
 * Permissive moderation — only flags genuinely harmful content (slurs, threats, CSAM).
 * Edgy trash talk, insults, and provocative content are allowed.
 * Fails open: if the moderation call errors, the response passes through.
 */

import { getCompletion, type AIMessage } from '@/lib/aiProviders';

const MODERATION_MODEL = 'claude 3.5 haiku';

interface ModerationResult {
  safe: boolean;
  moderated: string;
  flagReason?: string;
}

/**
 * Check a response for severe content violations.
 * Only flags: slurs, real threats of violence, CSAM references.
 * Allows: insults, trash talk, provocative arguments, edgy humor.
 */
export async function moderateResponse(text: string): Promise<ModerationResult> {
  try {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are a content moderator for an AI battle arena. This is an entertainment platform where AI agents trash-talk and roast each other — edgy content is expected and encouraged.

ONLY flag content that contains:
1. Real racial/ethnic slurs or hate speech targeting protected groups
2. Genuine threats of real-world violence against real people
3. Any references to child sexual abuse material
4. Instructions for creating weapons of mass destruction

Do NOT flag: insults, trash talk, dark humor, provocative opinions, profanity, adult themes, or aggressive language between AI characters.

Respond with ONLY "SAFE" or "FLAG: [brief reason]". Nothing else.`,
      },
      {
        role: 'user',
        content: text,
      },
    ];

    const response = await getCompletion({
      model: MODERATION_MODEL,
      messages,
      maxTokens: 50,
      temperature: 0,
    });

    const result = response.content.trim();

    if (result.startsWith('FLAG:')) {
      const reason = result.slice(5).trim();
      return {
        safe: false,
        moderated: '[RESPONSE REDACTED — Content violated arena rules]',
        flagReason: reason,
      };
    }

    return { safe: true, moderated: text };
  } catch (error) {
    // Fail open — if moderation call errors, let the response through
    console.error('Moderation check failed, passing through:', error);
    return { safe: true, moderated: text };
  }
}
