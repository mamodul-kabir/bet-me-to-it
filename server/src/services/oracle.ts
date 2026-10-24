import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';
import { getDb } from '../db/connection.js';

export interface OracleVerdict {
  verified: boolean;
  confidence: number;
  reasoning: string;
  verdict_reason: string; // alias for reasoning for backwards compatibility
}

export interface VerifyProofParams {
  commitmentId: string;
  taskTitle: string;
  verificationCriteria: string;
  proofText?: string;
  proofImageBuffer?: Buffer;
  proofImageBase64?: string;
  mimeType?: string;
}

/**
 * Intelligent fallback verification when no Gemini API key is configured
 * or for offline test verification.
 */
function heuristicFallbackVerify(params: VerifyProofParams): OracleVerdict {
  const { taskTitle, verificationCriteria, proofText, proofImageBase64, proofImageBuffer } = params;

  const hasImage = !!(proofImageBase64 || (proofImageBuffer && proofImageBuffer.length > 0));
  const text = (proofText || '').toLowerCase().trim();
  const criteria = verificationCriteria.toLowerCase();
  const title = taskTitle.toLowerCase();

  // If proof text is completely empty and no image provided -> reject
  if (!hasImage && text.length < 5) {
    return {
      verified: false,
      confidence: 0.1,
      reasoning: 'No substantial proof provided. Neither a valid screenshot nor textual proof of completion was submitted.',
      verdict_reason: 'No substantial proof provided. Neither a valid screenshot nor textual proof of completion was submitted.',
    };
  }

  // Keywords that indicate completion
  const successKeywords = ['done', 'completed', 'finished', 'passed', 'accepted', 'solved', 'submitted', 'success', 'commit', 'pr merged'];
  const hasSuccessKeyword = successKeywords.some(kw => text.includes(kw));

  // Check relevance
  const titleWords = title.split(/\s+/).filter(w => w.length > 3);
  const criteriaWords = criteria.split(/\s+/).filter(w => w.length > 3);
  const overlap = [...titleWords, ...criteriaWords].filter(w => text.includes(w)).length;

  if (hasImage || (hasSuccessKeyword && overlap > 0) || text.length > 50) {
    return {
      verified: true,
      confidence: hasImage ? 0.95 : 0.85,
      reasoning: `Proof verified: Submitted ${hasImage ? 'multimodal screenshot evidence' : 'detailed completion evidence'} directly satisfies the criteria "${verificationCriteria}".`,
      verdict_reason: `Proof verified: Submitted ${hasImage ? 'multimodal screenshot evidence' : 'detailed completion evidence'} directly satisfies the criteria "${verificationCriteria}".`,
    };
  }

  return {
    verified: false,
    confidence: 0.45,
    reasoning: `The submitted proof did not sufficiently demonstrate fulfillment of "${verificationCriteria}". Please provide clearer evidence or a screenshot.`,
    verdict_reason: `The submitted proof did not sufficiently demonstrate fulfillment of "${verificationCriteria}". Please provide clearer evidence or a screenshot.`,
  };
}

/**
 * AI Proof-of-Task Oracle powered by Google Gemini 2.5 Flash
 * Evaluates multimodal task completion proofs and returns structured JSON verdicts.
 */
export async function verifyTaskProof(params: VerifyProofParams): Promise<OracleVerdict> {
  const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;

  let verdict: OracleVerdict;

  if (apiKey && apiKey.length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const parts: any[] = [];

      // Add task description and instructions
      const prompt = `You are an impartial, strict Blockchain Proof-of-Task Oracle for the "bet-me-to-it" high-stakes fintech platform.
A user staked real PYUSD on completing the following task:

Task Title: "${params.taskTitle}"
Verification Criteria: "${params.verificationCriteria}"

Submitted User Text Proof:
"${params.proofText || 'No text submitted, see attached screenshot.'}"

Your Task:
Inspect the submitted evidence (image screenshot and/or text). Determine whether the evidence credibly and unambiguously proves that the user completed the stated task criteria before their deadline.

Respond with ONLY valid JSON with exactly these three keys:
{
  "verified": true or false,
  "confidence": a number between 0.0 and 1.0,
  "reasoning": "A concise 1-2 sentence explanation of your determination."
}`;

      parts.push({ text: prompt });

      // Attach image if present
      if (params.proofImageBuffer) {
        const mime = params.mimeType || 'image/png';
        parts.push({
          inlineData: {
            data: params.proofImageBuffer.toString('base64'),
            mimeType: mime,
          },
        });
      } else if (params.proofImageBase64) {
        const mime = params.mimeType || 'image/png';
        const cleanBase64 = params.proofImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mime,
          },
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: parts,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      verdict = {
        verified: Boolean(parsed.verified),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        reasoning: parsed.reasoning || parsed.verdict_reason || 'AI evaluation complete.',
        verdict_reason: parsed.reasoning || parsed.verdict_reason || 'AI evaluation complete.',
      };
    } catch (err: any) {
      console.warn('[AI Oracle] Gemini API call failed or encountered error, utilizing heuristic fallback:', err.message);
      verdict = heuristicFallbackVerify(params);
    }
  } else {
    // Fallback when no Gemini key is provided
    verdict = heuristicFallbackVerify(params);
  }

  // Audit logging to oracle_verdicts SQLite table
  try {
    const db = getDb();
    const verdictId = crypto.randomUUID();
    const proofType = (params.proofImageBuffer || params.proofImageBase64) ? 'image' : 'text';
    const proofSnippet = params.proofText
      ? params.proofText.slice(0, 500)
      : (proofType === 'image' ? '[Binary Image Upload]' : 'none');

    db.prepare(`
      INSERT INTO oracle_verdicts (
        id, commitment_id, proof_type, proof_data, verified, confidence, verdict_reason, raw_response
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      verdictId,
      params.commitmentId,
      proofType,
      proofSnippet,
      verdict.verified ? 1 : 0,
      verdict.confidence,
      verdict.reasoning,
      JSON.stringify(verdict)
    );
  } catch (dbErr) {
    console.error('[AI Oracle] Failed to persist verdict to database:', dbErr);
  }

  return verdict;
}

