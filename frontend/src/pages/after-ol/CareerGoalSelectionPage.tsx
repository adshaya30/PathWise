import { useState, useMemo, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight } from 'lucide-react';
import { AfterOlLayout } from '../../components/after-ol/AfterOlLayout';

interface CareerGoal {
  id: string;
  title: string;
  category?: string;
}

const INITIAL_CAREER_GOALS: CareerGoal[] = [
  { id: 'software-engineer', title: 'Software Engineer', category: 'Technology' },
  { id: 'doctor', title: 'Doctor', category: 'Medicine & Health' },
  { id: 'engineer', title: 'Engineer', category: 'Engineering' },
  { id: 'accountant', title: 'Accountant', category: 'Commerce & Finance' },
  { id: 'architect', title: 'Architect', category: 'Architecture & Design' },
  { id: 'lawyer', title: 'Lawyer', category: 'Law & Governance' },
  { id: 'teacher', title: 'Teacher', category: 'Education' },
  { id: 'data-scientist', title: 'Data Scientist', category: 'Technology' },
  { id: 'cybersecurity-professional', title: 'Cybersecurity Professional', category: 'Technology' },
  { id: 'designer', title: 'Designer', category: 'Creative & Media' },
  { id: 'business-professional', title: 'Business Professional', category: 'Business' },
  { id: 'pharmacist', title: 'Pharmacist', category: 'Medicine & Health' },
  { id: 'quantity-surveyor', title: 'Quantity Surveyor', category: 'Engineering' },
  { id: 'biomedical-scientist', title: 'Biomedical Scientist', category: 'Science' },
  { id: 'financial-analyst', title: 'Financial Analyst', category: 'Commerce & Finance' },
  { id: 'veterinary-surgeon', title: 'Veterinary Surgeon', category: 'Medicine & Health' },
];

export const CareerGoalSelectionPage: FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('doctor'); // 'doctor' default selected as in screenshot

  useEffect(() => {
    localStorage.setItem('pathwise_ol_starting_point', 'goal');
  }, []);

  const filteredGoals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return INITIAL_CAREER_GOALS;
    return INITIAL_CAREER_GOALS.filter(
      (goal) =>
        goal.title.toLowerCase().includes(query) ||
        (goal.category && goal.category.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const handleSelect = (id: string) => {
    setSelectedGoalId(id);
  };

  const handleExplore = () => {
    if (!selectedGoalId) return;
    navigate(`/after-ol/pathways?goal=${selectedGoalId}`);
  };

  return (
    <AfterOlLayout
      title="Select Career Goal"
      subtitle="Choose a career or study goal to discover which A/L streams and university degrees unlock your destination."
    >
      <div className="space-y-6">
        {/* Search Input Bar */}
        <div className="max-w-xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a career or study goal..."
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/90 rounded-2xl text-[14.5px] text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D645B]/20 focus:border-[#0D645B] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Career Goal Grid (3 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {filteredGoals.map((goal) => {
            const isSelected = selectedGoalId === goal.id;

            return (
              <div
                key={goal.id}
                onClick={() => handleSelect(goal.id)}
                className={`flex items-center p-5 rounded-2xl border transition-all duration-150 cursor-pointer select-none shadow-2xs group ${
                  isSelected
                    ? 'bg-[#E6F5F2] border-[#0D645B] text-[#0D645B] shadow-xs ring-2 ring-[#0D645B]/20'
                    : 'bg-white border-slate-200/90 hover:border-[#B3E5DC] hover:bg-[#E6F5F2]/60 hover:text-[#0D645B] hover:shadow-xs text-[#1E293B]'
                }`}
              >
                {/* Title */}
                <span className="text-[15px] font-bold tracking-tight font-heading">
                  {goal.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* If no match found */}
        {filteredGoals.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/90 shadow-2xs">
            <p className="text-sm font-semibold text-slate-700 mb-1">
              No career goals matched "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Try searching for a different keyword like "Engineer", "Doctor", or "Designer".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 text-xs font-bold text-[#0D645B] bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors cursor-pointer"
            >
              Show all career goals
            </button>
          </div>
        )}

        {/* Bottom Bar with CTA */}
        <div className="pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {selectedGoalId ? (
              <span>
                Selected goal:{' '}
                <strong className="text-slate-800 font-bold">
                  {INITIAL_CAREER_GOALS.find((g) => g.id === selectedGoalId)?.title || selectedGoalId}
                </strong>
              </span>
            ) : (
              <span>Select a career goal to proceed</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleExplore}
            disabled={!selectedGoalId}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0D645B] hover:bg-[#0A4E46] text-white text-sm font-bold rounded-xl shadow-md shadow-[#0D645B]/20 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Explore possible pathways</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </AfterOlLayout>
  );
};
