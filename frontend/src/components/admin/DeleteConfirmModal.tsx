import type { FC } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { DocumentItem } from '../../types/document';

interface DeleteConfirmModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string | number) => void;
}

export const DeleteConfirmModal: FC<DeleteConfirmModalProps> = ({
  document,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            Delete Document?
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Are you sure you want to remove <span className="font-semibold text-slate-800">"{document.title}"</span>? This will unpublish the document from the knowledge base.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(document.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
};
