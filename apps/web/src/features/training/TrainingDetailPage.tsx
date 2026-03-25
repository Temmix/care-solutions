import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useTraining,
  type TrainingRecord,
  type TrainingCertificate,
  type TrainingType,
} from './hooks/use-training';
import { TrainingStatusBadge } from './components/TrainingStatusBadge';
import { TrainingPriorityBadge } from './components/TrainingPriorityBadge';
import { ErrorAlert } from '../../components/ErrorAlert';
import toast from 'react-hot-toast';

const statusOptions = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'OVERDUE'];

export function TrainingDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    getTrainingTypes,
    loading,
    error,
  } = useTraining();

  const [record, setRecord] = useState<TrainingRecord | null>(null);
  const [trainingTypes, setTrainingTypes] = useState<TrainingType[]>([]);
  const [editing, setEditing] = useState(false);

  // Edit fields
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editScore, setEditScore] = useState('');
  const [editHours, setEditHours] = useState('');
  const [editCompletedDate, setEditCompletedDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');

  // Certificate form
  const [showCertForm, setShowCertForm] = useState(false);
  const [editingCert, setEditingCert] = useState<TrainingCertificate | null>(null);
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [certIssueDate, setCertIssueDate] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');

  // Build a lookup map from training types
  const typeLabels: Record<string, string> = {};
  for (const t of trainingTypes) {
    typeLabels[t.code] = t.name;
  }

  const load = async () => {
    if (!id) return;
    try {
      const data = await getTrainingRecord(id);
      setRecord(data);
    } catch {
      // handled by hook
    }
  };

  useEffect(() => {
    load();
    getTrainingTypes()
      .then(setTrainingTypes)
      .catch(() => {});
  }, [id]);

  const startEditing = () => {
    if (!record) return;
    setEditStatus(record.status);
    setEditNotes(record.notes ?? '');
    setEditScore(record.score?.toString() ?? '');
    setEditHours(record.hoursCompleted?.toString() ?? '');
    setEditCompletedDate(record.completedDate ? record.completedDate.split('T')[0] : '');
    setEditExpiryDate(record.expiryDate ? record.expiryDate.split('T')[0] : '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateTrainingRecord(id, {
        status: editStatus || undefined,
        notes: editNotes || undefined,
        score: editScore ? parseFloat(editScore) : undefined,
        hoursCompleted: editHours ? parseFloat(editHours) : undefined,
        completedDate: editCompletedDate || undefined,
        expiryDate: editExpiryDate || undefined,
      });
      toast.success('Training record updated');
      setEditing(false);
      load();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTrainingRecord(id);
      toast.success('Training record deleted');
      navigate('/app/training');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const openCertForm = (cert?: TrainingCertificate) => {
    if (cert) {
      setEditingCert(cert);
      setCertName(cert.name);
      setCertIssuer(cert.issuer);
      setCertNumber(cert.certificateNumber ?? '');
      setCertIssueDate(cert.issueDate.split('T')[0]);
      setCertExpiryDate(cert.expiryDate ? cert.expiryDate.split('T')[0] : '');
    } else {
      setEditingCert(null);
      setCertName('');
      setCertIssuer('');
      setCertNumber('');
      setCertIssueDate('');
      setCertExpiryDate('');
    }
    setShowCertForm(true);
  };

  const handleCertSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const data = {
      name: certName,
      issuer: certIssuer,
      certificateNumber: certNumber || undefined,
      issueDate: certIssueDate,
      expiryDate: certExpiryDate || undefined,
    };
    try {
      if (editingCert) {
        await updateCertificate(id, editingCert.id, data);
        toast.success('Certificate updated');
      } else {
        await addCertificate(id, data);
        toast.success('Certificate added');
      }
      setShowCertForm(false);
      load();
    } catch {
      toast.error('Failed to save certificate');
    }
  };

  const handleDeleteCert = async (certId: string) => {
    if (!id) return;
    try {
      await deleteCertificate(id, certId);
      toast.success('Certificate deleted');
      load();
    } catch {
      toast.error('Failed to delete certificate');
    }
  };

  if (!record && !loading) {
    return <div className="p-8 text-center text-slate-500">Training record not found</div>;
  }

  if (!record) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {error && <ErrorAlert message={error} />}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={() => navigate('/app/training')}
            className="text-sm text-slate-400 hover:text-slate-600 mb-2 inline-block"
          >
            &larr; Back to Training
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{record.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {record.user.firstName} {record.user.lastName} &middot;{' '}
            {typeLabels[record.category] ?? record.category}
          </p>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={startEditing}
              className="px-4 py-2 text-sm text-[var(--color-accent)] border border-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Status</p>
            {editing ? (
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-1">
                <TrainingStatusBadge status={record.status} />
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Priority</p>
            <div className="mt-1">
              <TrainingPriorityBadge priority={record.priority} />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Provider</p>
            <p className="text-sm text-slate-700 mt-1">{record.provider ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Scheduled Date</p>
            <p className="text-sm text-slate-700 mt-1">
              {record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Completed Date</p>
            {editing ? (
              <input
                type="date"
                value={editCompletedDate}
                onChange={(e) => setEditCompletedDate(e.target.value)}
                className="mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full"
              />
            ) : (
              <p className="text-sm text-slate-700 mt-1">
                {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Expiry Date</p>
            {editing ? (
              <input
                type="date"
                value={editExpiryDate}
                onChange={(e) => setEditExpiryDate(e.target.value)}
                className="mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full"
              />
            ) : (
              <p className="text-sm text-slate-700 mt-1">
                {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Hours</p>
            {editing ? (
              <input
                type="number"
                value={editHours}
                onChange={(e) => setEditHours(e.target.value)}
                min={0}
                step={0.5}
                className="mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full"
              />
            ) : (
              <p className="text-sm text-slate-700 mt-1">
                {record.hoursCompleted != null ? `${record.hoursCompleted}h` : '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Score</p>
            {editing ? (
              <input
                type="number"
                value={editScore}
                onChange={(e) => setEditScore(e.target.value)}
                min={0}
                max={100}
                className="mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full"
              />
            ) : (
              <p className="text-sm text-slate-700 mt-1">
                {record.score != null ? `${record.score}%` : '—'}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Renewal</p>
            <p className="text-sm text-slate-700 mt-1">
              {record.renewalPeriodMonths ? `Every ${record.renewalPeriodMonths} months` : '—'}
            </p>
          </div>
        </div>

        {/* Description */}
        {record.description && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-slate-700">{record.description}</p>
          </div>
        )}

        {/* Notes */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes</p>
          {editing ? (
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          ) : (
            <p className="text-sm text-slate-700">{record.notes ?? 'No notes'}</p>
          )}
        </div>

        {editing && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 text-sm text-white bg-[var(--color-accent)] rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        <p className="text-xs text-slate-400 mt-4">
          Created by {record.createdBy.firstName} {record.createdBy.lastName} on{' '}
          {new Date(record.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Certificates Section */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Certificates</h2>
          <button
            onClick={() => openCertForm()}
            className="px-3 py-1.5 text-sm text-[var(--color-accent)] border border-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-colors"
          >
            + Add Certificate
          </button>
        </div>

        {record.certificates.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No certificates attached</p>
        ) : (
          <div className="space-y-3">
            {record.certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex justify-between items-start p-3 border border-slate-100 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{cert.name}</p>
                  <p className="text-xs text-slate-500">
                    Issued by {cert.issuer}
                    {cert.certificateNumber && ` · #${cert.certificateNumber}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Issued: {new Date(cert.issueDate).toLocaleDateString()}
                    {cert.expiryDate &&
                      ` · Expires: ${new Date(cert.expiryDate).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openCertForm(cert)}
                    className="text-xs text-slate-400 hover:text-[var(--color-accent)]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCert(cert.id)}
                    className="text-xs text-slate-400 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificate Form Modal */}
      {showCertForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {editingCert ? 'Edit Certificate' : 'Add Certificate'}
            </h2>
            <form onSubmit={handleCertSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Certificate Name *</label>
                <input
                  type="text"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Issuer *</label>
                <input
                  type="text"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Certificate Number</label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Issue Date *</label>
                  <input
                    type="date"
                    value={certIssueDate}
                    onChange={(e) => setCertIssueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={certExpiryDate}
                    onChange={(e) => setCertExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCertForm(false)}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !certName || !certIssuer || !certIssueDate}
                  className="px-4 py-2 text-sm text-white bg-[var(--color-accent)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : editingCert ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
