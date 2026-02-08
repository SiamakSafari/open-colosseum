/**
 * AI Judge System for Underground Arena
 *
 * 3 judge personas score battles on 4 criteria (1-10 each):
 * - Impact: Raw power of the response
 * - Creativity: Originality and unexpected angles
 * - Audacity: Boldness, risk-taking, boundary-pushing
 * - Entertainment: How much the crowd would react
 *
 * Winner = highest average across all judges.
 * Draw threshold: 0.1 difference in averages.
 */

import { getCompletion, type AIMessage } from '@/lib/aiProviders';
import type { JudgeScore } from '@/types/database';

const JUDGE_MODEL = 'claude 3.5 haiku';

interface JudgePersona {
  name: string;
  style: string;
}

const JUDGES: JudgePersona[] = [
  {
    name: 'The Provocateur',
    style: 'You value boldness above all. You reward those who take risks, push boundaries, and say what others won\'t. Safe responses bore you. You want to see an agent that makes the crowd gasp.',
  },
  {
    name: 'The Wordsmith',
    style: 'You judge craft. Word choice, rhythm, callbacks, structure — the technical execution matters to you. A clever turn of phrase beats a loud shout every time. You appreciate sophistication and wit.',
  },
  {
    name: 'The Crowd',
    style: 'You represent the audience. You score based on gut reaction — what made you laugh, cringe, or lean forward? The response that would get the biggest crowd reaction wins. Entertainment is king.',
  },
];

interface JudgeResult {
  winner: string | null; // agent_a_id or agent_b_id, null if draw
  isDraw: boolean;
  scores: JudgeScore[];
  averageA: number;
  averageB: number;
}

/**
 * Have 3 AI judges score an underground battle.
 * Returns scores and the determined winner.
 */
export async function judgeUndergroundBattle(
  responseA: string,
  responseB: string,
  nameA: string,
  nameB: string
): Promise<JudgeResult> {
  // Run all 3 judges in parallel
  const judgePromises = JUDGES.map(judge => scoreWithJudge(judge, responseA, responseB, nameA, nameB));
  const scores = await Promise.all(judgePromises);

  // Calculate averages
  let totalA = 0;
  let totalB = 0;
  let scoreCount = 0;

  for (const score of scores) {
    const avgA = (score.scores_a.impact + score.scores_a.creativity + score.scores_a.audacity + score.scores_a.entertainment) / 4;
    const avgB = (score.scores_b.impact + score.scores_b.creativity + score.scores_b.audacity + score.scores_b.entertainment) / 4;
    totalA += avgA;
    totalB += avgB;
    scoreCount++;
  }

  const averageA = totalA / scoreCount;
  const averageB = totalB / scoreCount;

  const diff = Math.abs(averageA - averageB);
  const isDraw = diff < 0.1;
  const winner = isDraw ? null : averageA > averageB ? 'a' : 'b';

  return {
    winner,
    isDraw,
    scores,
    averageA: Math.round(averageA * 100) / 100,
    averageB: Math.round(averageB * 100) / 100,
  };
}

async function scoreWithJudge(
  judge: JudgePersona,
  responseA: string,
  responseB: string,
  nameA: string,
  nameB: string
): Promise<JudgeScore> {
  const defaultScore: JudgeScore = {
    judge_persona: judge.name,
    scores_a: { impact: 5, creativity: 5, audacity: 5, entertainment: 5 },
    scores_b: { impact: 5, creativity: 5, audacity: 5, entertainment: 5 },
    reasoning: 'Judge was unable to score this round.',
  };

  try {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `You are "${judge.name}", a judge in The Open Colosseum Underground Arena — the no-rules arena where AI agents fight without restrictions.

${judge.style}

Score BOTH responses on 4 criteria, each 1-10:
- Impact: Raw power and effectiveness
- Creativity: Originality and unexpected angles
- Audacity: Boldness and boundary-pushing
- Entertainment: Crowd reaction potential

You MUST respond in this EXACT JSON format (no other text):
{"scores_a":{"impact":N,"creativity":N,"audacity":N,"entertainment":N},"scores_b":{"impact":N,"creativity":N,"audacity":N,"entertainment":N},"reasoning":"One sentence explaining your verdict."}`,
      },
      {
        role: 'user',
        content: `FIGHTER A (${nameA}):\n${responseA}\n\nFIGHTER B (${nameB}):\n${responseB}\n\nScore both fighters.`,
      },
    ];

    const response = await getCompletion({
      model: JUDGE_MODEL,
      messages,
      maxTokens: 300,
      temperature: 0.3,
    });

    // Strip markdown code fences if present (e.g. ```json ... ```)
    let jsonText = response.content.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    const parsed = JSON.parse(jsonText);

    // Validate and clamp scores
    const clamp = (n: unknown): number => {
      const val = typeof n === 'number' ? n : 5;
      return Math.min(10, Math.max(1, Math.round(val)));
    };

    return {
      judge_persona: judge.name,
      scores_a: {
        impact: clamp(parsed.scores_a?.impact),
        creativity: clamp(parsed.scores_a?.creativity),
        audacity: clamp(parsed.scores_a?.audacity),
        entertainment: clamp(parsed.scores_a?.entertainment),
      },
      scores_b: {
        impact: clamp(parsed.scores_b?.impact),
        creativity: clamp(parsed.scores_b?.creativity),
        audacity: clamp(parsed.scores_b?.audacity),
        entertainment: clamp(parsed.scores_b?.entertainment),
      },
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'No reasoning provided.',
    };
  } catch (error) {
    console.error(`Judge "${judge.name}" scoring failed:`, error);
    return defaultScore;
  }
}
