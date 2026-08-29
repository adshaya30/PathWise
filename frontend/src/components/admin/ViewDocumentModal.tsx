import type { FC } from 'react';
import { X, FileText, Calendar, Building2, Layers, CheckCircle2, Clock, Download, ShieldCheck } from 'lucide-react';
import type { DocumentItem } from '../../types/document';

interface ViewDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ViewDocumentModal: FC<ViewDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate max-w-sm">
                  {document.title}
                </h2>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Phase 1 Preview
                </span>
              </div>
              <p className="text-xs text-slate-500">{document.fileName || `${document.title}.pdf`}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Source</p>
                <p className="text-sm font-medium text-slate-800">{document.source}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Academic Year</p>
                <p className="text-sm font-medium text-slate-800">{document.academicYear}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Document Type</p>
                <p className="text-sm font-medium text-slate-800">{document.type}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Last Updated</p>
                <p className="text-sm font-medium text-slate-800">{document.lastUpdated}</p>
              </div>
            </div>
          </div>

          {/* Status & Page Details */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700">Verification Status:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                {document.status}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {document.pages ? `${document.pages} Pages` : 'PDF Document'} {document.fileSize ? `(${document.fileSize})` : ''}
            </div>
          </div>

          {/* Extracted Sample / Description */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Document Summary / Notes
            </h4>
            <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100">
              {document.description ||
                `Official ${document.source} handbook published for the ${document.academicYear} academic cycle. Contains university intake criteria, minimum Z-scores, subject prerequisites, and course eligibility tables.`}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-400">
            Document ID: <code className="bg-slate-200/60 px-1 py-0.5 rounded text-slate-600">{document.id}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => alert(`Phase 1 Notice: Download functionality for "${document.title}" is available in Phase 2.`)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
