import type { FC } from 'react';
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';

export const ErrorBoundaryPage: FC = () => {
  const error = useRouteError();

  let errorMessage = 'An unexpected error occurred.';
  let statusCode = 404;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    errorMessage = error.statusText || error.data?.message || 'Page not found';
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-[#FBFBF9] flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-6 shadow-xs">
        <AlertCircle className="w-8 h-8" />
      </div>

      <span className="text-xs font-bold text-amber-700 uppercase tracking-widest font-mono mb-2">
        {statusCode === 404 ? 'Page Not Found' : `Error ${statusCode}`}
      </span>

      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 font-heading tracking-tight">
        {statusCode === 404 ? "We couldn't find that page" : 'Something went wrong'}
      </h1>

      <p className="text-slate-500 max-w-md mb-8 text-sm leading-relaxed">
        {statusCode === 404
          ? "The page you are looking for doesn't exist or is currently being updated with the latest educational data."
          : errorMessage}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </button>
      </div>
    </div>
  );
};
