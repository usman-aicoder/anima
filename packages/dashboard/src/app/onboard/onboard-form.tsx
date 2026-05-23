'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

const QUESTIONS = [
  { id: 1, question: 'What is the business name and its legal structure (e.g. Ltd, sole trader, LLC)?', placeholder: 'e.g. Hembuddy AB — Swedish limited company (aktiebolag)' },
  { id: 2, question: 'What product or service does this business sell?', placeholder: 'e.g. On-demand home cleaning, moving, and handyman services in Sweden' },
  { id: 3, question: 'Who is the target customer? Describe in 2–3 sentences.', placeholder: 'e.g. Swedish homeowners aged 30–60, dual-income households...' },
  { id: 4, question: 'What geography or market are you targeting first?', placeholder: 'e.g. Nyköping, Sweden — expanding to Stockholm in Phase 2' },
  { id: 5, question: 'What is the primary business challenge right now?', placeholder: 'e.g. No providers signed up yet, no website traffic...' },
  { id: 6, question: 'What does success look like in 1 month? In 3 months?', placeholder: 'e.g. 1 month: 5 providers signed, first job booked. 3 months: 50 jobs completed...' },
  { id: 7, question: 'What is the approximate monthly operations budget?', placeholder: 'e.g. SEK 15,000/month including agent API costs and marketing' },
  { id: 8, question: 'What tools and platforms are you already using or have access to?', placeholder: 'e.g. WordPress, Google Analytics, Stripe, Instagram...' },
  { id: 9, question: 'Are there any regulatory, legal, or compliance constraints we need to know about?', placeholder: 'e.g. RUT deduction rules (Swedish tax), GDPR, F-skatt requirement for providers...' },
  { id: 10, question: 'Who else will be involved — employees, contractors, advisors?', placeholder: 'e.g. Solo founder for now. Designer on contract for branding...' },
];

type Step = 'intro' | 'questions' | 'submitting' | 'done' | 'error';

interface Result {
  company_name: string;
  facts_written: number;
  goal_tree_queued: boolean;
  message: string;
}

export function OnboardForm({ companyName }: { companyName: string }) {
  const [step, setStep] = useState<Step>('intro');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''));
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  const q = QUESTIONS[current]!;
  const progress = Math.round(((current + 1) / QUESTIONS.length) * 100);
  const isLast = current === QUESTIONS.length - 1;

  function setAnswer(val: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = val;
      return next;
    });
  }

  function goNext() {
    if (!answers[current]?.trim()) return;
    if (isLast) {
      void submit();
    } else {
      setCurrent((c) => c + 1);
    }
  }

  function goPrev() {
    setCurrent((c) => Math.max(0, c - 1));
  }

  async function submit() {
    setStep('submitting');
    try {
      const payload = QUESTIONS.map((q, i) => ({
        question_id: q.id,
        question: q.question,
        answer: answers[i] ?? '',
      }));
      const res = await api.onboarding.run(companyName, payload);
      setResult(res);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onboarding failed');
      setStep('error');
    }
  }

  if (step === 'intro') {
    return (
      <div className="max-w-xl">
        <p className="text-slate-600 mb-6">
          Answer 10 questions and the Strategy Agent will populate the World Model,
          build your goal tree, and generate your first human task list — ready for approval.
        </p>
        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 mb-6 space-y-1">
          <p>• Takes about 5 minutes</p>
          <p>• AI processes each answer and extracts structured facts</p>
          <p>• Goal tree appears in the Goals page for your approval</p>
          <p>• You can re-run onboarding at any time to add more context</p>
        </div>
        <button
          onClick={() => setStep('questions')}
          className="bg-brand-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Start onboarding
        </button>
      </div>
    );
  }

  if (step === 'questions') {
    return (
      <div className="max-w-xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Question {current + 1} of {QUESTIONS.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <p className="text-base font-medium text-slate-900 mb-3">{q.question}</p>
          <textarea
            value={answers[current] ?? ''}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) goNext(); }}
            placeholder={q.placeholder}
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            autoFocus
          />
          <p className="text-xs text-slate-400 mt-1.5">⌘ + Enter to continue</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {current > 0 && (
            <button
              onClick={goPrev}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={goNext}
            disabled={!answers[current]?.trim()}
            className="px-5 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? 'Submit to Strategy Agent' : 'Next'}
          </button>
        </div>

        {/* Answered questions summary */}
        {current > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Previous answers</p>
            <div className="space-y-3">
              {QUESTIONS.slice(0, current).map((q, i) => (
                <div key={q.id} className="text-sm">
                  <p className="text-slate-500 text-xs">{q.id}. {q.question}</p>
                  <p className="text-slate-700 mt-0.5 truncate">{answers[i]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'submitting') {
    return (
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-700">Strategy Agent is processing your answers...</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-500 space-y-1">
          <p>Extracting facts from each answer</p>
          <p>Writing to World Model</p>
          <p>Queuing goal tree generation</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="max-w-xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
        <button
          onClick={() => setStep('questions')}
          className="text-sm text-brand-600 hover:underline"
        >
          Go back and retry
        </button>
      </div>
    );
  }

  // done
  return (
    <div className="max-w-xl">
      <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-6">
        <p className="text-sm font-semibold text-green-800 mb-1">Onboarding complete</p>
        <p className="text-sm text-green-700">{result?.message}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-slate-900">{result?.facts_written ?? 0}</p>
          <p className="text-xs text-slate-500 mt-1">Facts written to World Model</p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-brand-600">~30s</p>
          <p className="text-xs text-slate-500 mt-1">Until goal tree is ready</p>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-600 mb-6">
        <p>The Strategy Agent is now building your goal tree in the background.</p>
        <p>Go to the <strong>Goals</strong> page to review and approve each goal once it appears.</p>
        <p>Go to the <strong>Tasks</strong> page to see the human tasks generated for you.</p>
      </div>

      <div className="flex gap-3">
        <a
          href="/goals"
          className="px-4 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          View Goals
        </a>
        <a
          href="/tasks"
          className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          View Tasks
        </a>
        <button
          onClick={() => { setStep('intro'); setCurrent(0); setAnswers(Array(QUESTIONS.length).fill('')); }}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          Re-run onboarding
        </button>
      </div>
    </div>
  );
}
