import React from 'react';
import { Link } from 'react-router-dom';

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  buttonColor: 'deep-blue' | 'teal';
  rotation: 'rotate-3' | '-rotate-3';
  linkTo: string;
}

export function ActionCard({ icon, title, description, buttonText, buttonColor, rotation, linkTo }: ActionCardProps) {
  const btnColorClass = buttonColor === 'deep-blue' 
    ? 'bg-deep-blue hover:bg-[#153860] shadow-deep-blue/30 hover:shadow-deep-blue/50' 
    : 'bg-teal hover:bg-[#0f766e] shadow-teal/30 hover:shadow-teal/50';

  const rotationClass = rotation === 'rotate-3' ? 'group-hover:rotate-3' : 'group-hover:-rotate-3';

  return (
    <div className="bg-card-bg/80 backdrop-blur-xl border border-card-bg/60 p-10 rounded-3xl shadow-xl shadow-bg-main/50 hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 flex flex-col items-center text-center group">
      <div className={`w-20 h-20 bg-bg-main rounded-2xl flex items-center justify-center text-deep-blue mb-6 shadow-sm group-hover:scale-110 ${rotationClass} transition-transform duration-300`}>
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-text-main mb-4">{title}</h2>
      <p className="text-secondary mb-8 flex-1">
        {description}
      </p>
      <Link to={linkTo} className={`w-full py-3.5 px-6 text-card-bg rounded-full font-semibold shadow-lg transition-all duration-300 block text-center ${btnColorClass}`}>
        {buttonText}
      </Link>
    </div>
  );
}
