import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, Upload, Sparkles, AlertCircle } from 'lucide-react';
import type { Commitment } from '../types';

interface ProofModalProps {
  commitment: Commitment | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (challengeId: string, proofText?: string, imageBase64?: string) => Promise<any>;
}

// 1x1 base64 transparent PNG for instant sample demo
const SAMPLE_PROOF_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const ProofModal: React.FC<ProofModalProps> = ({
  commitment,
  isOpen,
  onClose,
  onVerify,
}) => {
  const [proofText, setProofText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !commitment) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageBase64(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleProof = () => {
    setProofText(
      `Accepted submission for ${commitment.title}: Completed with 100% test cases passed in 48ms (faster than 92.4% of submissions). Code verified and committed to repository.`
    );
    setImageBase64(SAMPLE_PROOF_PNG);
    setImagePreview('data:image/png;base64,' + SAMPLE_PROOF_PNG);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerdict(null);

    if (!proofText.trim() && !imageBase64) {
      setError('Please provide text explanation or upload a screenshot.');
      return;
    }

    setLoading(true);
    try {
      const result = await onVerify(commitment.id, proofText, imageBase64 || undefined);
      setVerdict(result);
    } catch (err: any) {
      setError(err.message || 'Verification request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#101624] border border-[#232f48] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f2a3e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              👁️
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Gemini AI Oracle Validator</h3>
              <p className="text-xs text-slate-400">Proof-of-Task Multimodal Verification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2336]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Commitment Summary */}
          <div className="p-3.5 rounded-xl bg-[#0c101a] border border-[#1f293d]">
            <div className="text-xs text-slate-400 font-medium">Task Committed:</div>
            <div className="text-sm font-bold text-white mt-0.5">{commitment.title}</div>
            <div className="text-xs text-slate-400 mt-1">
              <span className="font-semibold text-slate-300">Criteria:</span> {commitment.verification_criteria}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="font-mono text-emerald-400 font-bold">${commitment.stake_amount} PYUSD staked</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-semibold">{commitment.charity_pct}% Charity / {commitment.stock_pct}% {commitment.target_asset_symbol}</span>
            </div>
          </div>

          {/* Quick Demo Button */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Judge Demo Quick-Fill</span>
            </div>
            <button
              type="button"
              onClick={handleUseSampleProof}
              className="text-xs px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all shadow-sm"
            >
              Use Sample Proof
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Verdict Display */}
          {verdict && (
            <div
              className={`p-4 rounded-xl border ${
                verdict.verified
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              } space-y-2`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {verdict.verified ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400">VERIFIED BY AI ORACLE</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-400" />
                      <span className="text-rose-400">VERIFICATION REJECTED</span>
                    </>
                  )}
                </div>
                <div className="font-mono text-xs px-2 py-0.5 rounded bg-black/40">
                  Confidence: {Math.round(verdict.confidence * 100)}%
                </div>
              </div>

              <p className="text-xs text-slate-300 italic">"{verdict.reasoning || verdict.verdict_reason}"</p>

              {verdict.tree_planted && (
                <div className="text-xs font-semibold text-emerald-300 pt-1 flex items-center gap-1.5 border-t border-emerald-500/30">
                  <span>🌲 Wealth Tree planted in your Forest! (+10 XP)</span>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          {!verdict?.verified && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Upload Screenshot / Photo Evidence
                </label>
                <div className="border border-dashed border-[#283754] hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer bg-[#0c101a] transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="proof-file-input"
                  />
                  <label htmlFor="proof-file-input" className="cursor-pointer block">
                    {imagePreview ? (
                      <div className="space-y-1">
                        <img
                          src={imagePreview}
                          alt="Proof preview"
                          className="max-h-24 mx-auto rounded border border-slate-700 object-contain"
                        />
                        <span className="text-[11px] text-emerald-400">Image attached (click to change)</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-6 h-6 mx-auto text-slate-400" />
                        <div className="text-xs text-slate-300 font-medium">Click to select screenshot or photo</div>
                        <div className="text-[10px] text-slate-500">Supports PNG, JPG, WebP up to 10MB</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Or Describe Task Completion
                </label>
                <textarea
                  value={proofText}
                  onChange={e => setProofText(e.target.value)}
                  rows={3}
                  placeholder="Paste terminal log, LeetCode submission notes, or explanation of completed work..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0c101a] border border-[#232f48] focus:border-emerald-500 focus:outline-none text-xs text-slate-200"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 rounded-xl bg-[#141b2a] hover:bg-[#1a2336] text-xs font-semibold text-slate-300 border border-[#232f48]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <span className="animate-spin">⏳ Verifying with Gemini 2.5 Flash...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Submit Proof to Oracle</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {verdict?.verified && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 mt-2"
            >
              Done (View Forest)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
