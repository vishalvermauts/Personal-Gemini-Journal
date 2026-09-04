import React, { useState } from 'react';
import type { Interaction } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  downloadFile,
  exportUserDataAsJSON,
  exportUserDataAsMarkdown,
  deleteAllUserInteractions,
} from '../lib/firebase';
import {
  Shield,
  Download,
  Trash2,
  Lock,
  Database,
  BrainCircuit,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  FileText,
  Loader2,
} from 'lucide-react';

interface PrivacyCenterViewProps {
  interactions: Interaction[];
  onDataPurged: () => void;
}

export const PrivacyCenterView: React.FC<PrivacyCenterViewProps> = ({
  interactions,
  onDataPurged,
}) => {
  const { currentUser } = useAuth();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportJSON = () => {
    try {
      const jsonContent = exportUserDataAsJSON(interactions);
      const filename = `gemini-lifelog-export-${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(jsonContent, filename, 'application/json');
      setExportNotice('JSON archive successfully downloaded to your device.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error('JSON export error:', err);
    }
  };

  const handleExportMarkdown = () => {
    try {
      const mdContent = exportUserDataAsMarkdown(interactions);
      const filename = `gemini-lifelog-export-${new Date().toISOString().slice(0, 10)}.md`;
      downloadFile(mdContent, filename, 'text/markdown');
      setExportNotice('Markdown archive successfully downloaded to your device.');
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      console.error('Markdown export error:', err);
    }
  };

  const handleDeleteAllData = async () => {
    if (!currentUser || deleteConfirmation.trim() !== 'DELETE') return;

    setIsDeleting(true);
    setDeleteError(null);
    setDeleteSuccess(null);

    try {
      const count = await deleteAllUserInteractions(currentUser.uid);
      setDeleteSuccess(`Successfully removed all ${count} journal entries and memories.`);
      setDeleteConfirmation('');
      onDataPurged();
    } catch (err: any) {
      console.error('Failed to purge user data:', err);
      setDeleteError(err.message || 'Failed to delete entries from Firestore.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="privacy-center-view" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F9FAFB] font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-black" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Privacy & Security Center</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Control your personal data, export your memories anytime, and inspect our architectural security guarantees.
          </p>
        </div>

        {/* Section 1: Data Export */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Export Personal Data</span>
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                Download a complete, offline copy of all {interactions.length} reflections, structured insights, and
                geotags. Zero lock-in.
              </p>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700 shrink-0">
              {interactions.length} {interactions.length === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              id="btn-export-json"
              onClick={handleExportJSON}
              disabled={interactions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-xs"
            >
              <FileCode className="h-4 w-4" />
              <span>Download JSON Archive</span>
            </button>

            <button
              id="btn-export-md"
              onClick={handleExportMarkdown}
              disabled={interactions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-50 text-gray-800 text-xs sm:text-sm font-semibold rounded-lg border border-gray-300 transition-colors shadow-xs"
            >
              <FileText className="h-4 w-4 text-gray-600" />
              <span>Download Markdown Notes</span>
            </button>
          </div>

          {exportNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{exportNotice}</span>
            </div>
          )}
        </div>

        {/* Section 2: Privacy Guarantees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <Database className="h-4 w-4 text-blue-600" />
              <span>Per-User Data Isolation</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Every journal record is stored in path <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">/users/{'{userId}'}/interactions</code>.
              Cloud Firestore security rules mathematically prevent any other authenticated user from reading or modifying your data.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <Lock className="h-4 w-4 text-emerald-600" />
              <span>Zero Password Handling</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Google Sign-In via Firebase Auth handles federated authentication. We never handle, transmit, or store
              passwords on custom servers, completely eliminating credential leak risks.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <BrainCircuit className="h-4 w-4 text-purple-600" />
              <span>AI Prompt Isolation</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Journal text is passed to Gemini API strictly inside untrusted data tags (<code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">&lt;untrusted_journal_entry&gt;</code>).
              Your thoughts are isolated from model instructions and never leaked to third parties.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <MapPin className="h-4 w-4 text-rose-600" />
              <span>Opt-In Geolocation</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Location capture is completely optional. No background tracking exists. Location data is stored only when
              you explicitly click "Add Location" and can be removed at any time.
            </p>
          </div>
        </div>

        {/* Section 3: Danger Zone - Delete All Data */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-rose-900">Danger Zone: Purge All Journal Data</h2>
              <p className="text-xs text-rose-700 leading-relaxed">
                Permanently delete all journal entries, dialogue turns, and AI insights belonging to your account from
                Cloud Firestore. This action is irreversible and cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-3 max-w-md">
            <label className="block text-xs font-semibold text-rose-900">
              Type <span className="font-mono bg-rose-100 px-1.5 py-0.5 rounded text-rose-800">DELETE</span> to confirm
              permanent deletion:
            </label>
            <input
              id="delete-confirmation-input"
              type="text"
              placeholder="Type DELETE"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              disabled={isDeleting}
              className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-rose-600 font-mono"
            />

            <button
              id="btn-delete-all-data"
              onClick={handleDeleteAllData}
              disabled={deleteConfirmation.trim() !== 'DELETE' || isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Deleting Vault Entries...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Permanently Delete All Journal Data</span>
                </>
              )}
            </button>
          </div>

          {deleteSuccess && (
            <p className="text-xs font-medium text-emerald-800 bg-emerald-50 p-2.5 rounded border border-emerald-200">
              {deleteSuccess}
            </p>
          )}

          {deleteError && (
            <p className="text-xs font-medium text-rose-800 bg-white p-2.5 rounded border border-rose-300">
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
