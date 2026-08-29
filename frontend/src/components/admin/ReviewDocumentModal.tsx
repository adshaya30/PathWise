import { useState, useEffect, type FC } from 'react';
import { X, CheckCircle2, XCircle, Clock, ShieldCheck, FileText, Loader2, BookOpen, Edit3, Save, RotateCcw } from 'lucide-react';
import type { DocumentItem, DocumentPageItem, DocumentStatus } from '../../types/document';
import { documentApiService } from '../../services/documentApiService';

interface ReviewDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string | number, newStatus: DocumentStatus) => void;
}

export const ReviewDocumentModal: FC<ReviewDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus>('APPROVED');
  const [notes, setNotes] = useState('');
  const [pages, setPages] = useState<DocumentPageItem[]>([]);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'text' | 'decision'>('text');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inline Page Editor States
  const [isEditingPage, setIsEditingPage] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [isSavingPage, setIsSavingPage] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      setSelectedStatus(document.status === 'Verified' || document.status === 'APPROVED' ? 'APPROVED' : 'PENDING_REVIEW');
      setNotes('');
      setSelectedPageNum(1);
      setIsEditingPage(false);
      setSaveSuccessMessage(null);
      loadDocumentPages(document.id);
    }
  }, [isOpen, document]);

  // When selected page changes, sync edited text
  useEffect(() => {
    const currentPage = pages.find((p) => p.pageNumber === selectedPageNum);
    if (currentPage) {
      setEditedText(currentPage.extractedText);
    }
    setIsEditingPage(false);
    setSaveSuccessMessage(null);
  }, [selectedPageNum, pages]);

  const loadDocumentPages = async (docId: string | number) => {
    setIsLoadingPages(true);
    try {
      const data = await documentApiService.getDocumentPages(docId);
      setPages(data);
    } catch (err) {
      console.warn('Could not fetch pages from backend, using placeholder preview:', err);
      // Fallback sample extracted text if backend is offline
      setPages([
        {
          id: 1,
          documentId: Number(docId) || 1,
          pageNumber: 1,
          extractedText: `${document?.title || 'Document'}\n\nAcademic Year: ${document?.academicYear || '2026/27'}\nSource Authority: ${document?.source || 'UGC'}\n\nGeneral Overview & Instructions:\nThis handbook sets forth the minimum admission criteria, subject combinations, and district quota allocations for state universities.`,
          hasTables: false,
        },
        {
          id: 2,
          documentId: Number(docId) || 1,
          pageNumber: 2,
          extractedText: `Course Requirements & Stream Criteria:\n\n1. Physical Science Stream:\n- Minimum of 3 passes in Combined Mathematics, Physics, and Chemistry/ICT.\n\n2. Biological Science Stream:\n- Minimum of 3 passes in Biology, Chemistry, and Physics/Agricultural Science.\n\n3. Engineering & Technology:\n- Minimum Z-scores per district published in Annexure B.`,
          hasTables: true,
        }
      ]);
    } finally {
      setIsLoadingPages(false);
    }
  };

  if (!isOpen || !document) return null;

  const handleStartEdit = () => {
    const currentPage = pages.find((p) => p.pageNumber === selectedPageNum);
    setEditedText(currentPage?.extractedText || '');
    setIsEditingPage(true);
    setSaveSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    const currentPage = pages.find((p) => p.pageNumber === selectedPageNum);
    setEditedText(currentPage?.extractedText || '');
    setIsEditingPage(false);
  };

  const handleSavePageText = async () => {
    setIsSavingPage(true);
    try {
      await documentApiService.updatePageText(document.id, selectedPageNum, editedText);
      // Update local pages state
      setPages((prev) =>
        prev.map((p) => (p.pageNumber === selectedPageNum ? { ...p, extractedText: editedText } : p))
      );
      setSaveSuccessMessage(`Page ${selectedPageNum} updated successfully!`);
      setIsEditingPage(false);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.warn('Backend update failed, saving locally:', err);
      setPages((prev) =>
        prev.map((p) => (p.pageNumber === selectedPageNum ? { ...p, extractedText: editedText } : p))
      );
      setSaveSuccessMessage(`Page ${selectedPageNum} updated locally!`);
      setIsEditingPage(false);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } finally {
      setIsSavingPage(false);
    }
  };

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const backendStatus = selectedStatus === 'Verified' ? 'APPROVED' : selectedStatus;
      await documentApiService.updateStatus(document.id, backendStatus as any, notes);
      onUpdateStatus(document.id, selectedStatus);
    } catch (err) {
      console.warn('Backend update failed, applying local state:', err);
      onUpdateStatus(document.id, selectedStatus);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const selectedPage = pages.find((p) => p.pageNumber === selectedPageNum) || pages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Admin Document Review</h2>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">{document.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'text' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Extracted Text ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('decision')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'decision' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Verification Action
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'text' ? (
            <div className="space-y-4">
              {isLoadingPages ? (
                <div className="py-16 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-sm font-medium">Loading extracted document pages...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Left: Page Navigator */}
                  <div className="md:col-span-1 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-[500px] overflow-y-auto space-y-1.5">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                      Pages ({pages.length})
                    </div>
                    {pages.map((p) => (
                      <button
                        key={p.pageNumber}
                        type="button"
                        onClick={() => setSelectedPageNum(p.pageNumber)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          selectedPageNum === p.pageNumber
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          Page {p.pageNumber}
                        </span>
                        {p.hasTables && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            selectedPageNum === p.pageNumber ? 'bg-blue-700 text-white' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Table
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Right: Extracted Page Content & Editor */}
                  <div className="md:col-span-3 border border-slate-200 rounded-xl p-4 bg-white max-h-[500px] flex flex-col">
                    {/* Header with Title & Edit / Save Buttons */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 flex-shrink-0">
                      <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                        <span>Page {selectedPage?.pageNumber || 1} Extracted Text</span>
                        {selectedPage?.hasTables && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                            Contains Structured Tables
                          </span>
                        )}
                        {saveSuccessMessage && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 animate-in fade-in">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {saveSuccessMessage}
                          </span>
                        )}
                      </div>

                      {/* Edit Actions */}
                      <div className="flex items-center gap-2">
                        {isEditingPage ? (
                          <>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSavingPage}
                              onClick={handleSavePageText}
                              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              {isSavingPage ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Save Page
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStartEdit}
                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200/60 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit Page Text
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content View or Inline Editor */}
                    {isEditingPage ? (
                      <div className="flex-1 flex flex-col">
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          rows={14}
                          className="flex-1 w-full text-xs text-slate-900 font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none overflow-y-auto"
                          placeholder="Edit page text directly here..."
                        />
                        <p className="text-[11px] text-slate-400 mt-2">
                          💡 You can correct OCR spelling typos, course names, or cutoff rows directly before approving.
                        </p>
                      </div>
                    ) : (
                      <pre className="flex-1 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100 overflow-y-auto">
                        {selectedPage?.extractedText || 'No text extracted on this page.'}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Decision Tab */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Select Verification Status
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('APPROVED')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      selectedStatus === 'APPROVED' || selectedStatus === 'Verified'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-1.5" />
                    Approve (Trusted Knowledge)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('PENDING_REVIEW')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      selectedStatus === 'PENDING_REVIEW' || selectedStatus === 'Pending' || selectedStatus === 'Under Review'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-6 h-6 text-amber-600 mb-1.5" />
                    Pending Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('REJECTED')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      selectedStatus === 'REJECTED'
                        ? 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-500/20 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-6 h-6 text-red-600 mb-1.5" />
                    Reject Document
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reviewer Notes / Verification Log
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Verified against UGC gazette published on 2026-08-28. Page count and cutoffs confirmed."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="text-xs text-slate-400">
            {document.fileName} • {document.fileSize || 'PDF Document'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {selectedStatus === 'APPROVED' ? 'Approve as Trusted' : selectedStatus === 'REJECTED' ? 'Reject Document' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
