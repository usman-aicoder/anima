import { OnboardForm } from './onboard-form';

const COMPANY_NAME = process.env['NEXT_PUBLIC_COMPANY_NAME'] ?? 'hembuddy';

export default function OnboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Onboarding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Answer 10 questions. The Strategy Agent will populate the World Model and build your goal tree.
        </p>
      </div>
      <OnboardForm companyName={COMPANY_NAME} />
    </div>
  );
}
