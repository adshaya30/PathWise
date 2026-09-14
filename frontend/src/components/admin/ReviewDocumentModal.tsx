import { useState, useEffect, type FC } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  FileText,
  Loader2,
  BookOpen,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Table as TableIcon,
  Code2,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import type { DocumentItem, DocumentPageItem, DocumentStatus } from '../../types/document';
import { documentApiService } from '../../services/documentApiService';

interface ReviewDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string | number, newStatus: DocumentStatus) => void;
}

interface ParsedTableData {
  headers: string[];
  rows: string[][];
  category: string;
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

  // View Mode: Interactive Table Grid vs Raw Text
  const [viewMode, setViewMode] = useState<'grid' | 'raw'>('grid');

  // Inline Page Editor States
  const [isEditingPage, setIsEditingPage] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
  const [parsedTable, setParsedTable] = useState<ParsedTableData>({ headers: [], rows: [], category: 'General Table' });
  const [isSavingPage, setIsSavingPage] = useState<boolean>(false);
  const [isAiExtracting, setIsAiExtracting] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [pageFetchError, setPageFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      setSelectedStatus(document.status === 'Verified' || document.status === 'APPROVED' ? 'APPROVED' : 'PENDING_REVIEW');
      setNotes('');
      setSelectedPageNum(1);
      setIsEditingPage(false);
      setSaveSuccessMessage(null);
      setPageFetchError(null);
      loadDocumentPages(document.id);
    }
  }, [isOpen, document]);

  // When selected page changes, sync edited text and parse table rows
  useEffect(() => {
    const currentPage = pages.find((p) => p.pageNumber === selectedPageNum);
    const text = currentPage ? currentPage.extractedText : '';
    setEditedText(text);
    const table = parseMarkdownTable(text);
    setParsedTable(table);
    if (table.rows.length > 0) {
      setViewMode('grid');
    }
    setIsEditingPage(false);
    setSaveSuccessMessage(null);
  }, [selectedPageNum, pages]);

  const parseMarkdownTable = (text: string): ParsedTableData => {
    if (!text || !text.includes('|')) {
      return { headers: [], rows: [], category: 'General Table' };
    }

    const lines = text.split('\n');
    const tableLines: string[][] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|') || trimmed.includes('---')) {
        continue;
      }
      const cells = trimmed
        .split('|')
        .map((p) => p.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - (trimmed.endsWith('|') ? 1 : 0));

      if (cells.length > 0) {
        tableLines.push(cells);
      }
    }

    if (tableLines.length < 2) {
      return { headers: [], rows: [], category: 'General Table' };
    }

    const headers = tableLines[0];
    const rows = tableLines.slice(1);

    // Auto-classify table category based on full table content & header keywords
    const contentStr = text.toLowerCase();
    const headerStr = headers.join(' ').toLowerCase();
    let category = 'UGC Handbook Structured Table';

    const hasDistrictHeaderOrRows =
      headerStr.includes('district') ||
      (contentStr.includes('colombo') && contentStr.includes('gampaha') && contentStr.includes('kalutara') && (contentStr.includes('kandy') || contentStr.includes('galle') || contentStr.includes('jaffna')));
    const hasCutoffHeaderOrKeywords =
      contentStr.includes('minimum z-score') ||
      contentStr.includes("minimum 'z' - score") ||
      contentStr.includes("minimum 'z' score") ||
      contentStr.includes('cutoff mark') ||
      contentStr.includes('cut-off mark') ||
      contentStr.includes('minimum marks for university admission') ||
      headerStr.includes('z-score') ||
      headerStr.includes('cutoff');

    // 7. Aptitude & Practical Test Requirements (Check first so introductory sentence mentioning 'cut-off mark' doesn't misclassify it)
    if (
      contentStr.includes('requirement to pass the practical') ||
      contentStr.includes('aptitude test') ||
      contentStr.includes('practical test') ||
      contentStr.includes('practical/ aptitude test') ||
      headerStr.includes('aptitude')
    ) {
      category = 'Aptitude & Practical Test Requirements';
    }
    // 8. Cutoff Marks Matrix (Strict Cutoff check - requires district columns or decimal Z-scores)
    else if (
      (hasDistrictHeaderOrRows && (hasCutoffHeaderOrKeywords || contentStr.includes('0.') || contentStr.includes('1.') || contentStr.includes('2.'))) ||
      (hasCutoffHeaderOrKeywords && (contentStr.includes('colombo') || contentStr.includes('gampaha') || headerStr.includes('z-score') || headerStr.includes('cutoff')))
    ) {
      category = 'Cutoff Marks Matrix';
    }
    // 2. Distribution of Places (Annex B - University-Wise Intake)
    else if (
      !hasDistrictHeaderOrRows &&
      (contentStr.includes('distribution of the total number of places') ||
        contentStr.includes('distribution of places') ||
        contentStr.includes('annex (b)') ||
        contentStr.includes('annex b') ||
        (headerStr.includes('university') && (headerStr.includes('intake') || headerStr.includes('places') || headerStr.includes('proposed') || headerStr.includes('no.'))) ||
        ((contentStr.includes('medicine') || contentStr.includes('biological science')) && contentStr.includes('university of colombo') && (contentStr.includes('224') || contentStr.includes('155') || contentStr.includes('proposed') || contentStr.includes('places') || contentStr.includes('intake'))))
    ) {
      category = 'Distribution of Places (Annex B / University-Wise Intake)';
    }
    // 1. Places Available (Annex A - Total Proposed Intake per Course)
    else if (
      !hasDistrictHeaderOrRows &&
      (contentStr.includes('places available for admission') ||
        contentStr.includes('proposed intake') ||
        contentStr.includes('annex (a)') ||
        contentStr.includes('annex a') ||
        contentStr.includes('total proposed intake') ||
        contentStr.includes('total intake') ||
        (headerStr.includes('course') && (headerStr.includes('intake') || headerStr.includes('places') || headerStr.includes('proposed'))) ||
        (headerStr.includes('code') && headerStr.includes('course') && headerStr.includes('intake')))
    ) {
      category = 'Places Available (Proposed Intake / Annex A)';
    }
    // 6. G.C.E. (O/L) Requirements
    else if (
      contentStr.includes('ordinary level') ||
      contentStr.includes('o/l requirement') ||
      contentStr.includes('g.c.e. (o/l)') ||
      headerStr.includes('sin. lang') ||
      headerStr.includes('tam. lang') ||
      (headerStr.includes('eng.') && headerStr.includes('mat.') && headerStr.includes('sci.')) ||
      (contentStr.includes('sin. lang') && contentStr.includes('tam. lang'))
    ) {
      category = 'G.C.E. (O/L) Requirements Table';
    }
    // 5. Special Admission / Differently Abled
    else if (
      contentStr.includes('differently abled') ||
      contentStr.includes('blind (braille)') ||
      contentStr.includes('blind') ||
      contentStr.includes('braille') ||
      contentStr.includes('special admission') ||
      contentStr.includes('disabled categories')
    ) {
      category = 'Special Categories & Quotas';
    }
    // 4. Medium of Instruction
    else if (
      contentStr.includes('medium of instruction') ||
      headerStr.includes('medium of instruction') ||
      (contentStr.includes('sinhala') && contentStr.includes('tamil') && contentStr.includes('english') && contentStr.includes('medium'))
    ) {
      category = 'Medium of Instruction Table';
    }
    // 3. Uni-Codes Assigned
    else if (
      headerStr.includes('uni - code') ||
      headerStr.includes('uni-code') ||
      headerStr.includes('unicode') ||
      headerStr.includes('uni code') ||
      contentStr.includes('uni-codes assigned') ||
      contentStr.includes('uni - codes assigned') ||
      (headerStr.includes('university') && headerStr.includes('course') && (contentStr.includes('001a') || contentStr.includes('012c') || contentStr.includes('013d')))
    ) {
      category = 'Uni-Codes Assigned Table';
    }
    else if (
      contentStr.includes('prerequisite') ||
      contentStr.includes('stream') ||
      contentStr.includes('subject')
    ) {
      category = 'Course Prerequisites & Requirements';
    }

    return { headers, rows, category };
  };

  const stringifyRowsToMarkdown = (headers: string[], rows: string[][]): string => {
    if (headers.length === 0) return '';
    let md = '| ' + headers.join(' | ') + ' |\n';
    md += '| ' + headers.map(() => ':---').join(' | ') + ' |\n';
    for (const r of rows) {
      md += '| ' + r.join(' | ') + ' |\n';
    }
    return md.trim();
  };

  const loadDocumentPages = async (docId: string | number) => {
    setIsLoadingPages(true);
    setPageFetchError(null);
    try {
      const data = await documentApiService.getDocumentPages(docId);
      setPages(data);
    } catch (err: any) {
      console.error('Could not fetch pages from backend:', err);
      setPageFetchError('Failed to load document pages from server. Please ensure the backend is running.');
      setPages([]);
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
    const text = currentPage?.extractedText || '';
    setEditedText(text);
    setParsedTable(parseMarkdownTable(text));
    setIsEditingPage(false);
  };

  const handleSavePageText = async (textToSave?: string) => {
    setIsSavingPage(true);
    const finalContent = textToSave !== undefined ? textToSave : editedText;
    try {
      await documentApiService.updatePageText(document.id, selectedPageNum, finalContent);
      setPages((prev) =>
        prev.map((p) => (p.pageNumber === selectedPageNum ? { ...p, extractedText: finalContent } : p))
      );
      setEditedText(finalContent);
      setParsedTable(parseMarkdownTable(finalContent));
      setSaveSuccessMessage(`Page ${selectedPageNum} updated successfully!`);
      setIsEditingPage(false);
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(`Failed to save page text: ${err?.message || 'Server error'}`);
    } finally {
      setIsSavingPage(false);
    }
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const updatedRows = parsedTable.rows.map((row, rI) =>
      rI === rowIdx ? row.map((cell, cI) => (cI === colIdx ? value : cell)) : row
    );
    setParsedTable((prev) => ({ ...prev, rows: updatedRows }));
  };

  const handleSaveTableGrid = () => {
    const markdown = stringifyRowsToMarkdown(parsedTable.headers, parsedTable.rows);
    handleSavePageText(markdown);
  };

  const handleAddRow = () => {
    const colCount = parsedTable.headers.length || 4;
    const newRow = new Array(colCount).fill('');
    setParsedTable((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow],
    }));
  };

  const handleDeleteRow = (index: number) => {
    setParsedTable((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, idx) => idx !== index),
    }));
  };

  const handleAiExtractPageTable = async () => {
    setIsAiExtracting(true);
    setSaveSuccessMessage(null);
    try {
      const updatedPage = await documentApiService.aiExtractPageTable(document.id, selectedPageNum);
      setPages((prev) =>
        prev.map((p) => (p.pageNumber === selectedPageNum ? updatedPage : p))
      );
      setEditedText(updatedPage.extractedText);
      const table = parseMarkdownTable(updatedPage.extractedText);
      setParsedTable(table);
      if (table.rows.length > 0) {
        setViewMode('grid');
      }
      setSaveSuccessMessage(`✨ Page ${selectedPageNum} extracted with Gemini AI!`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('AI Table extraction failed:', err);
      alert(`AI Extraction Error: ${err.message || 'Could not extract table.'}`);
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleApply = async () => {
    if (!document) return;
    setIsSubmitting(true);
    try {
      const backendStatus = selectedStatus === 'Verified' ? 'APPROVED' : selectedStatus;
      await documentApiService.updateStatus(document.id, backendStatus as any, notes);
      onUpdateStatus(document.id, selectedStatus);
      onClose();
    } catch (err: any) {
      console.error('Backend update failed:', err);
      alert(`Failed to update document status: ${err?.message || 'Server error. Please verify the backend is running.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPage = pages.find((p) => p.pageNumber === selectedPageNum) || pages[0];
  const downloadUrl = documentApiService.getDocumentDownloadUrl(document.id);
  const docTypeStr = (document?.type || document?.documentType || '').toLowerCase();
  const isCutoffDoc = docTypeStr.includes('cutoff') || docTypeStr.includes('rank') || docTypeStr.includes('mark');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-xs border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Admin Document Review & Ingestion</h2>
                <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {document.academicYear || '2026/27'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-lg">{document.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Tabs */}
            <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'text' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Review Pages ({pages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('decision')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'decision' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Approve & Sync
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'text' ? (
            <div>
              {isLoadingPages ? (
                <div className="py-20 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                  <p className="text-sm font-medium">Loading extracted document pages...</p>
                </div>
              ) : pageFetchError ? (
                <div className="py-12 text-center text-slate-500 bg-red-50/50 border border-red-200/60 rounded-xl p-6">
                  <p className="text-sm font-semibold text-red-600 mb-3">{pageFetchError}</p>
                  <button
                    type="button"
                    onClick={() => loadDocumentPages(document.id)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : pages.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-sm">No pages extracted for this document.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Left: Page Navigator & PDF Link */}
                  <div className="md:col-span-1 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-[560px] overflow-y-auto flex flex-col space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Pages ({pages.length})
                      </span>
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
                        title="Download / Preview original PDF in new tab"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Original PDF
                      </a>
                    </div>
                    
                    <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
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
                              selectedPageNum === p.pageNumber ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'
                            }`}>
                              Table
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Extracted Page Content & Interactive Grid Editor */}
                  <div className="md:col-span-3 border border-slate-200 rounded-xl p-4 bg-white max-h-[560px] flex flex-col">
                    {/* Header with Title, Mode Switcher & Edit Actions */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 flex-shrink-0">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>Page {selectedPage?.pageNumber || 1} Data</span>
                        {selectedPage?.hasTables && parsedTable.headers.length > 0 && (
                          <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            {parsedTable.category} (AI Extracted)
                          </span>
                        )}
                        {saveSuccessMessage && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 animate-in fade-in">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {saveSuccessMessage}
                          </span>
                        )}
                      </div>

                      {/* Right View Toggle & Action Buttons */}
                      <div className="flex items-center gap-2">
                        {parsedTable.rows.length > 0 && !isEditingPage && (
                          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium mr-2">
                            <button
                              type="button"
                              onClick={() => setViewMode('grid')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'text-slate-600'
                              }`}
                            >
                              <TableIcon className="w-3 h-3" />
                              Grid Table ({parsedTable.rows.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewMode('raw')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                viewMode === 'raw' ? 'bg-white text-blue-600 shadow-2xs font-semibold' : 'text-slate-600'
                              }`}
                            >
                              <Code2 className="w-3 h-3" />
                              Raw Text
                            </button>
                          </div>
                        )}

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
                              onClick={() => handleSavePageText()}
                              className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              {isSavingPage ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              Save Changes
                            </button>
                          </>
                        ) : (
                          <>
                            {/* On-Demand Gemini Vision Extract Button */}
                            <button
                              type="button"
                              disabled={isAiExtracting}
                              onClick={handleAiExtractPageTable}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                              title="Extract structured table from this page using Gemini Vision"
                            >
                              {isAiExtracting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Gemini Extracting...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Extract with Gemini AI</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handleStartEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200/60 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit Text
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Content View: Interactive Table Grid / Raw Text Editor */}
                    {isEditingPage ? (
                      <div className="flex-1 flex flex-col">
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          rows={16}
                          className="flex-1 w-full text-xs text-slate-900 font-mono leading-relaxed bg-slate-50 p-3 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none overflow-y-auto"
                          placeholder="Edit page markdown text directly here..."
                        />
                        <p className="text-[11px] text-slate-400 mt-2">
                          💡 You can correct OCR typos, course names, or table entries directly before final approval.
                        </p>
                      </div>
                    ) : viewMode === 'grid' && parsedTable.rows.length > 0 ? (
                      /* Interactive Table Grid */
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200 shadow-2xs">
                              <tr>
                                {parsedTable.headers.map((header, hIdx) => (
                                  <th
                                    key={hIdx}
                                    className="p-2 border-r border-slate-200 uppercase tracking-wider text-[11px] font-semibold text-slate-700"
                                  >
                                    {header}
                                  </th>
                                ))}
                                <th className="p-2 w-12 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                              {parsedTable.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-blue-50/40 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-1.5 border-r border-slate-100">
                                      <input
                                        type="text"
                                        value={cell}
                                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                        className={`w-full bg-transparent px-1.5 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none ${
                                          cIdx === 0
                                            ? 'font-semibold text-slate-900'
                                            : cIdx === row.length - 1 && (/^[\d.]+$|^NQC$/i.test(cell) || parsedTable.category.includes('Cutoff'))
                                            ? 'font-mono font-bold text-blue-700'
                                            : 'text-slate-800'
                                        }`}
                                      />
                                    </td>
                                  ))}
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(rIdx)}
                                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Delete Row"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Table Footer Actions */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Add Row
                          </button>

                          <button
                            type="button"
                            disabled={isSavingPage}
                            onClick={handleSaveTableGrid}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {isSavingPage ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            Save Table Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Raw Preformatted Text View */
                      <pre className="flex-1 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-3 rounded-lg border border-slate-100 overflow-y-auto">
                        {selectedPage?.extractedText || 'No text extracted on this page.'}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Decision / Verification Tab */
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Verification Decision
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('APPROVED')}
                    className={`flex items-start gap-4 p-5 rounded-2xl border transition-all text-left cursor-pointer ${
                      selectedStatus === 'APPROVED'
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">
                        {isCutoffDoc ? 'Approve Cutoff Document & Sync Cutoffs' : 'Approve UGC Handbook Reference'}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {isCutoffDoc
                          ? 'Promotes all extracted cutoff marks into the production database for the Eligibility Engine.'
                          : 'Approves the handbook as an official guideline reference (preserves cutoff tables without changes).'}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatus('REJECTED')}
                    className={`flex items-start gap-4 p-5 rounded-2xl border transition-all text-left cursor-pointer ${
                      selectedStatus === 'REJECTED'
                        ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">Reject / Needs Correction</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Marks the document as rejected. No data will be ingested into production.
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Audit Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Verified against UGC 2026/27 Gazette..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-900">
                      {isCutoffDoc ? 'Eligibility Engine Integration' : 'Official Reference Integration'}
                    </div>
                    <div className="text-[11px] text-blue-700">
                      {isCutoffDoc
                        ? 'Approved cutoffs will be instantly queryable by students evaluating degree requirements.'
                        : 'Approved handbook will be available for students as an official reference guide.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApply}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save & Apply Decision'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
