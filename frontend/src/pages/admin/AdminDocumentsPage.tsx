import { useState, useMemo, useEffect, type FC } from 'react';
import {
  Search,
  Upload,
  Eye,
  CheckSquare,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Info,
  Plus,
  XCircle,
  Loader2,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import type { DocumentItem, DocumentStatus } from '../../types/document';
import { UploadDocumentModal } from '../../components/admin/UploadDocumentModal';
import { ViewDocumentModal } from '../../components/admin/ViewDocumentModal';
import { EditDocumentModal } from '../../components/admin/EditDocumentModal';
import { ReviewDocumentModal } from '../../components/admin/ReviewDocumentModal';
import { DeleteConfirmModal } from '../../components/admin/DeleteConfirmModal';
import { documentApiService } from '../../services/documentApiService';

export const AdminDocumentsPage: FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<DocumentItem | null>(null);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<DocumentItem | null>(null);
  const [selectedDocForReview, setSelectedDocForReview] = useState<DocumentItem | null>(null);
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<DocumentItem | null>(null);

  // Phase 1 / Coming Soon Banner or Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await documentApiService.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.warn('Backend documents API unavailable, operating in local memory state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered documents calculation
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.fileName && doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSource = sourceFilter === 'All' || doc.source === sourceFilter;
      const matchesYear = yearFilter === 'All' || doc.academicYear === yearFilter;
      
      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Verified' && (doc.status === 'Verified' || doc.status === 'APPROVED')) ||
        (statusFilter === 'Pending' && (doc.status === 'Pending' || doc.status === 'PENDING_REVIEW')) ||
        (statusFilter === 'Rejected' && doc.status === 'REJECTED') ||
        doc.status === statusFilter;

      const matchesType = typeFilter === 'All' || doc.type === typeFilter;

      return matchesSearch && matchesSource && matchesYear && matchesStatus && matchesType;
    });
  }, [documents, searchQuery, sourceFilter, yearFilter, statusFilter, typeFilter]);

  // Handlers
  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`Document "${newDoc.title}" uploaded & processed!`);
  };

  const handleEditSave = (updatedDoc: DocumentItem) => {
    setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
    showToast(`Document "${updatedDoc.title}" updated.`);
  };

  const handleReviewStatusUpdate = (id: string | number, newStatus: DocumentStatus) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus, lastUpdated: 'Just now' } : d))
    );
    showToast(`Verification status updated to "${newStatus}".`);
  };

  const handleDeleteConfirm = async (id: string | number) => {
    const docToDelete = documents.find((d) => d.id === id);
    try {
      await documentApiService.deleteDocument(id);
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    showToast(`Document "${docToDelete?.title || id}" deleted.`);
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'Verified':
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'Pending':
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Pending Review
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
            Under Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Rejected
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  return (
    <AdminLayout
      title="Documents"
      subtitle="Upload, review, and verify knowledge-base source documents."
    >
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs md:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Top Header Actions Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs md:text-sm text-slate-500 font-medium flex items-center gap-2">
            <span>
              <span className="text-slate-900 font-semibold">{filteredDocuments.length}</span> of {documents.length} documents shown
            </span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDocuments}
              title="Refresh list"
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="admin-upload-document-btn"
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:shadow-lg"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Source Dropdown */}
          <div className="flex items-center">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="All">Source: All</option>
              <option value="UGC">UGC</option>
              <option value="NIE">NIE</option>
              <option value="MoHE">MoHE</option>
              <option value="DoE">DoE</option>
            </select>
          </div>

          {/* Academic Year Dropdown */}
          <div className="flex items-center">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="All">Academic Year: All</option>
              <option value="2026/27">2026/27</option>
              <option value="2026">2026</option>
              <option value="2025/26">2025/26</option>
              <option value="2025">2025</option>
              <option value="2024/25">2024/25</option>
            </select>
          </div>

          {/* Verified / Status Dropdown */}
          <div className="flex items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="All">Status: All</option>
              <option value="Verified">Approved</option>
              <option value="Pending">Pending Review</option>
              <option value="Under Review">Under Review</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Document Type Dropdown */}
          <div className="flex items-center">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="All">Document Type: All</option>
              <option value="Admissions">Admissions</option>
              <option value="Curriculum">Curriculum</option>
              <option value="Cutoff Ranks">Cutoff Ranks</option>
              <option value="Syllabus">Syllabus</option>
              <option value="Requirements">Requirements</option>
              <option value="General Policy">General Policy</option>
            </select>
          </div>

          {/* Reset Filters button if any active */}
          {(searchQuery || sourceFilter !== 'All' || yearFilter !== 'All' || statusFilter !== 'All' || typeFilter !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSourceFilter('All');
                setYearFilter('All');
                setStatusFilter('All');
                setTypeFilter('All');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Pipeline Info Banner */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Document Pipeline:</strong> PDF uploads are saved to Supabase Storage, parsed page-by-page via Apache PDFBox, and require Admin Approval before AI activation.
            </span>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Document</th>
                  <th className="py-4 px-4">Source</th>
                  <th className="py-4 px-4">Academic Year</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Uploaded</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-700 text-base">
                        {documents.length === 0 ? 'No documents uploaded yet' : 'No matching documents found'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {documents.length === 0
                          ? 'Upload official handbooks, curriculum guides, or cutoff datasets to get started.'
                          : 'Try adjusting your search query or active filter selections.'}
                      </p>
                      {documents.length === 0 && (
                        <button
                          onClick={() => setIsUploadOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Upload Document
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Document Title & Pages */}
                      <td className="py-4 px-6">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                              {doc.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {doc.pages ? `${doc.pages} pages` : 'PDF Document'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-4 px-4">
                        <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {doc.source}
                        </span>
                      </td>

                      {/* Year */}
                      <td className="py-4 px-4 text-slate-600 text-xs font-medium">
                        {doc.academicYear}
                      </td>

                      {/* Document Type */}
                      <td className="py-4 px-4 text-slate-600 text-xs">
                        {doc.type}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {getStatusBadge(doc.status)}
                      </td>

                      {/* Last Updated / Uploaded */}
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {(() => {
                          const rawDate = doc.uploadedAt || doc.lastUpdated;
                          if (!rawDate) return '-';
                          try {
                            const parsed = new Date(rawDate);
                            return isNaN(parsed.getTime())
                              ? rawDate.split('T')[0]
                              : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          } catch {
                            return rawDate.split('T')[0] || rawDate;
                          }
                        })()}
                      </td>

                      {/* Actions: View, Review, Edit, Delete */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. View Action */}
                          <button
                            onClick={() => setSelectedDocForView(doc)}
                            title="View Document Details"
                            aria-label={`View ${doc.title}`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* 2. Review Action (Page-by-Page & Approve) */}
                          <button
                            onClick={() => setSelectedDocForReview(doc)}
                            title="Review Pages & Verify"
                            aria-label={`Review ${doc.title}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>

                          {/* 3. Edit Action */}
                          <button
                            onClick={() => setSelectedDocForEdit(doc)}
                            title="Edit Metadata"
                            aria-label={`Edit ${doc.title}`}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* 4. Delete Action */}
                          <button
                            onClick={() => setSelectedDocForDelete(doc)}
                            title="Delete Document"
                            aria-label={`Delete ${doc.title}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <ViewDocumentModal
        document={selectedDocForView}
        isOpen={!!selectedDocForView}
        onClose={() => setSelectedDocForView(null)}
      />

      <EditDocumentModal
        document={selectedDocForEdit}
        isOpen={!!selectedDocForEdit}
        onClose={() => setSelectedDocForEdit(null)}
        onSave={handleEditSave}
      />

      <ReviewDocumentModal
        document={selectedDocForReview}
        isOpen={!!selectedDocForReview}
        onClose={() => setSelectedDocForReview(null)}
        onUpdateStatus={handleReviewStatusUpdate}
      />

      <DeleteConfirmModal
        document={selectedDocForDelete}
        isOpen={!!selectedDocForDelete}
        onClose={() => setSelectedDocForDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </AdminLayout>
  );
};
