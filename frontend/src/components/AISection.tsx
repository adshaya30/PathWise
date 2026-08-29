export function AISection() {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 mb-24">
      <div className="w-full bg-text-main rounded-[2.5rem] p-10 md:p-16 flex flex-col lg:flex-row gap-16 items-center shadow-2xl">
        
        {/* Left Side: Content */}
        <div className="flex-1 flex flex-col items-start text-left">
          <span className="text-amber font-mono font-bold tracking-widest text-sm mb-6 uppercase">
            PATHWISE AI
          </span>
          <h2 className="text-4xl md:text-[2.75rem] font-bold text-white mb-6 leading-tight font-heading">
            An assistant that explains — it doesn't decide
          </h2>
          <p className="text-slate-300 leading-relaxed text-lg mb-8 font-medium">
            Eligibility is always calculated by the rules engine using structured UGC data. PathWise AI explains the result in plain language and always shows its source.
          </p>
          <p className="text-secondary leading-relaxed text-sm">
            "I couldn't verify this requirement from the available official data. Please check the latest UGC publication." — what PathWise AI says when a source isn't available.
          </p>
        </div>

        {/* Right Side: Chat UI */}
        <div className="flex-1 w-full">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
            
            {/* User Message */}
            <div className="flex justify-end w-full">
              <div className="bg-deep-blue text-white rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[90%] shadow-md">
                <p className="text-[15px] font-medium leading-relaxed">Why am I not eligible for Software Engineering?</p>
              </div>
            </div>

            {/* AI Message */}
            <div className="flex justify-start w-full flex-col items-start">
              <div className="bg-slate-700/80 border border-slate-600/30 text-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 max-w-[95%] shadow-md mb-3">
                <p className="text-[15px] leading-relaxed">
                  Your Combined Maths grade (C) is below the published minimum (B) for this degree in 2026/27. Your other subjects meet the requirement.
                </p>
              </div>
              <p className="text-[13px] text-slate-400 font-mono pl-2">
                Source: UGC Admissions Handbook 2026/27, p. 62
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
