import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useChc, type ChcCase } from './hooks/use-chc';
import { api } from '../../lib/api-client';
import { ErrorAlert } from '../../components/ErrorAlert';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

interface CarePlanOption {
  id: string;
  title: string;
  status: string;
}

const PANEL_ROLES = [
  'Chair',
  'Nurse Assessor',
  'Social Worker',
  'GP',
  'Clinician',
  'Physiotherapist',
  'Occupational Therapist',
  'Psychiatrist',
  'Other',
] as const;

const TABS = [
  'Overview',
  'Screening',
  'Domain Scores',
  'MDT Panel',
  'Decision',
  'Care Package',
  'Notes',
] as const;
type Tab = (typeof TABS)[number];

const CHC_DOMAINS = [
  'BEHAVIOUR',
  'COGNITION',
  'COMMUNICATION',
  'PSYCHOLOGICAL',
  'MOBILITY',
  'NUTRITION',
  'CONTINENCE',
  'SKIN',
  'BREATHING',
  'DRUG_THERAPIES',
  'ALTERED_STATES',
  'OTHER',
] as const;

const DOMAIN_LEVELS = ['NO_NEEDS', 'LOW', 'MODERATE', 'HIGH', 'SEVERE', 'PRIORITY'] as const;

const statusColors: Record<string, string> = {
  REFERRAL: 'bg-blue-50 text-blue-700',
  SCREENING: 'bg-amber-50 text-amber-700',
  ASSESSMENT: 'bg-purple-50 text-purple-700',
  DECISION: 'bg-orange-50 text-orange-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-600',
  CARE_PACKAGE_LIVE: 'bg-green-50 text-green-700',
  ANNUAL_REVIEW: 'bg-indigo-50 text-indigo-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

function formatDate(d: string | undefined | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ChcDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const {
    getCase,
    updateScreening,
    upsertDomainScore,
    addPanelMember,
    removePanelMember,
    recordDecision,
    setupCarePackage,
    triggerAnnualReview,
    closeCase,
    addNote,
    loading,
    error,
  } = useChc();

  const [chcCase, setChcCase] = useState<ChcCase | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Team members for MDT panel dropdown
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  // Care plans for care package dropdown
  const [carePlans, setCarePlans] = useState<CarePlanOption[]>([]);

  const loadCase = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getCase(id);
      setChcCase(data);
    } catch {
      // error handled by hook
    }
  }, [id, getCase]);

  useEffect(() => {
    loadCase();
  }, [loadCase]);

  // Load team members once
  useEffect(() => {
    api
      .get<{ data: TeamMember[] }>('/users?limit=100')
      .then((result) => setTeamMembers(result.data.filter((m) => m.isActive)))
      .catch(() => {});
  }, []);

  // Load care plans for this patient when case loads
  useEffect(() => {
    if (!chcCase?.patient.id) return;
    api
      .get<{ entry?: { resource?: CarePlanOption }[] }>(
        `/care-plans?patientId=${chcCase.patient.id}&limit=50`,
      )
      .then((result) =>
        setCarePlans(
          (result.entry ?? []).map((e) => e.resource).filter((r): r is CarePlanOption => !!r),
        ),
      )
      .catch(() => {});
  }, [chcCase?.patient.id]);

  // ── Screening form state ────────────────────────────────
  const [screeningOutcome, setScreeningOutcome] = useState('');
  const [screeningNotes, setScreeningNotes] = useState('');

  async function handleScreening(): Promise<void> {
    if (!id || !screeningOutcome) return;
    setActionLoading(true);
    setActionError('');
    try {
      await updateScreening(id, { screeningOutcome, screeningNotes: screeningNotes || undefined });
      await loadCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Domain score form state ─────────────────────────────
  const [scoreDomain, setScoreDomain] = useState('');
  const [scoreLevel, setScoreLevel] = useState('');
  const [scoreEvidence, setScoreEvidence] = useState('');

  async function handleDomainScore(): Promise<void> {
    if (!id || !scoreDomain || !scoreLevel) return;
    setActionLoading(true);
    setActionError('');
    try {
      await upsertDomainScore(id, {
        domain: scoreDomain,
        level: scoreLevel,
        evidence: scoreEvidence || undefined,
      });
      await loadCase();
      setScoreDomain('');
      setScoreLevel('');
      setScoreEvidence('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Panel member form state ─────────────────────────────
  const [panelUserId, setPanelUserId] = useState('');
  const [panelRole, setPanelRole] = useState('');

  async function handleAddPanel(): Promise<void> {
    if (!id || !panelUserId || !panelRole) return;
    setActionLoading(true);
    setActionError('');
    try {
      await addPanelMember(id, { userId: panelUserId, role: panelRole });
      await loadCase();
      setPanelUserId('');
      setPanelRole('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemovePanel(memberId: string): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      await removePanelMember(id, memberId);
      await loadCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Decision form state ─────────────────────────────────
  const [decision, setDecision] = useState('');
  const [fundingBand, setFundingBand] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  async function handleDecision(): Promise<void> {
    if (!id || !decision) return;
    setActionLoading(true);
    setActionError('');
    try {
      await recordDecision(id, {
        decision,
        fundingBand: fundingBand || undefined,
        decisionNotes: decisionNotes || undefined,
      });
      await loadCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Care package form state ─────────────────────────────
  const [cpStartDate, setCpStartDate] = useState('');
  const [cpReviewDate, setCpReviewDate] = useState('');
  const [cpCarePlanId, setCpCarePlanId] = useState('');

  async function handleCarePackage(): Promise<void> {
    if (!id || !cpStartDate) return;
    setActionLoading(true);
    setActionError('');
    try {
      await setupCarePackage(id, {
        carePackageStartDate: cpStartDate,
        annualReviewDate: cpReviewDate || undefined,
        carePlanId: cpCarePlanId || undefined,
      });
      await loadCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Notes form state ────────────────────────────────────
  const [noteContent, setNoteContent] = useState('');

  async function handleAddNote(): Promise<void> {
    if (!id || !noteContent.trim()) return;
    setActionLoading(true);
    setActionError('');
    try {
      await addNote(id, noteContent);
      setNoteContent('');
      await loadCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Status actions ──────────────────────────────────────
  async function handleAnnualReview(): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      await triggerAnnualReview(id);
      await loadCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClose(): Promise<void> {
    if (!id) return;
    setActionLoading(true);
    try {
      await closeCase(id);
      await loadCase();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !chcCase) {
    return <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>;
  }

  if (!chcCase) {
    return (
      <div className="text-center py-12">
        <ErrorAlert message={error || 'Case not found'} />
      </div>
    );
  }

  return (
    <div>
      <Link to="/app/chc" className="text-sm text-slate-500 hover:text-accent mb-4 inline-block">
        &larr; Back to CHC Cases
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {chcCase.patient.givenName} {chcCase.patient.familyName}
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[chcCase.status] ?? 'bg-slate-100 text-slate-600'}`}
            >
              {chcCase.status.replace(/_/g, ' ')}
            </span>
            {chcCase.isFastTrack && (
              <span className="text-red-600 font-medium text-xs">FAST TRACK</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {chcCase.status === 'CARE_PACKAGE_LIVE' && (
            <button
              onClick={handleAnnualReview}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Trigger Annual Review
            </button>
          )}
          {chcCase.status !== 'CLOSED' && (
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer disabled:opacity-50"
            >
              Close Case
            </button>
          )}
        </div>
      </div>

      <ErrorAlert message={error || actionError} className="mb-4" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer ${
              tab === t
                ? 'border-accent text-accent'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        {/* ── Overview ─────────────────────────────── */}
        {tab === 'Overview' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-slate-500 mb-1">Referral Date</div>
              <div className="text-sm font-medium">{formatDate(chcCase.referralDate)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Referral Reason</div>
              <div className="text-sm">{chcCase.referralReason}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Referrer</div>
              <div className="text-sm">
                {chcCase.referrer.firstName} {chcCase.referrer.lastName}
              </div>
            </div>
            {chcCase.screeningDate && (
              <>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Screening Date</div>
                  <div className="text-sm">{formatDate(chcCase.screeningDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Screening Outcome</div>
                  <div className="text-sm">{chcCase.screeningOutcome}</div>
                </div>
              </>
            )}
            {chcCase.decision && (
              <>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Decision</div>
                  <div className="text-sm font-medium">{chcCase.decision}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Funding Band</div>
                  <div className="text-sm">{chcCase.fundingBand ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Decision Date</div>
                  <div className="text-sm">{formatDate(chcCase.decisionDate)}</div>
                </div>
              </>
            )}
            {chcCase.carePackageStartDate && (
              <>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Care Package Start</div>
                  <div className="text-sm">{formatDate(chcCase.carePackageStartDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Annual Review Date</div>
                  <div className="text-sm">{formatDate(chcCase.annualReviewDate)}</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Screening ────────────────────────────── */}
        {tab === 'Screening' && (
          <div>
            {chcCase.screeningDate ? (
              <div className="space-y-3">
                <p className="text-sm">
                  <strong>Date:</strong> {formatDate(chcCase.screeningDate)}
                </p>
                <p className="text-sm">
                  <strong>Outcome:</strong> {chcCase.screeningOutcome}
                </p>
                {chcCase.screeningNotes && (
                  <p className="text-sm">
                    <strong>Notes:</strong> {chcCase.screeningNotes}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">No screening recorded yet.</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
                  <input
                    value={screeningOutcome}
                    onChange={(e) => setScreeningOutcome(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="Screening outcome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={screeningNotes}
                    onChange={(e) => setScreeningNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleScreening}
                  disabled={actionLoading || !screeningOutcome}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Record Screening'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Domain Scores ────────────────────────── */}
        {tab === 'Domain Scores' && (
          <div>
            {/* Existing scores grid */}
            {(chcCase.domainScores ?? []).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                {chcCase.domainScores!.map((s) => (
                  <div key={s.id} className="border border-slate-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-500 mb-1">
                      {s.domain.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm font-semibold">{s.level.replace(/_/g, ' ')}</div>
                    {s.evidence && (
                      <div className="text-xs text-slate-500 mt-1 truncate">{s.evidence}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add/update score form */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Add / Update Score</h3>
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={scoreDomain}
                  onChange={(e) => setScoreDomain(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select domain</option>
                  {CHC_DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <select
                  value={scoreLevel}
                  onChange={(e) => setScoreLevel(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select level</option>
                  {DOMAIN_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                <input
                  value={scoreEvidence}
                  onChange={(e) => setScoreEvidence(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Evidence (optional)"
                />
              </div>
              <button
                onClick={handleDomainScore}
                disabled={actionLoading || !scoreDomain || !scoreLevel}
                className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </div>
        )}

        {/* ── MDT Panel ────────────────────────────── */}
        {tab === 'MDT Panel' && (
          <div>
            {(chcCase.panelMembers ?? []).length > 0 && (
              <div className="space-y-2 mb-6">
                {chcCase.panelMembers!.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between border border-slate-200 rounded-lg p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {m.user.firstName} {m.user.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{m.role}</div>
                    </div>
                    <button
                      onClick={() => handleRemovePanel(m.id)}
                      className="text-red-500 text-xs hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Add Panel Member</h3>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={panelUserId}
                  onChange={(e) => setPanelUserId(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Select team member</option>
                  {teamMembers
                    .filter(
                      (m) =>
                        !(chcCase.panelMembers ?? []).some(
                          (pm) =>
                            pm.user.firstName === m.firstName && pm.user.lastName === m.lastName,
                        ),
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.role})
                      </option>
                    ))}
                </select>
                <select
                  value={panelRole}
                  onChange={(e) => setPanelRole(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Select role</option>
                  {PANEL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddPanel}
                disabled={actionLoading || !panelUserId || !panelRole}
                className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        )}

        {/* ── Decision ─────────────────────────────── */}
        {tab === 'Decision' && (
          <div>
            {chcCase.decision ? (
              <div className="space-y-3">
                <p className="text-sm">
                  <strong>Decision:</strong> {chcCase.decision}
                </p>
                <p className="text-sm">
                  <strong>Funding Band:</strong> {chcCase.fundingBand ?? '-'}
                </p>
                <p className="text-sm">
                  <strong>Date:</strong> {formatDate(chcCase.decisionDate)}
                </p>
                {chcCase.decisionNotes && (
                  <p className="text-sm">
                    <strong>Notes:</strong> {chcCase.decisionNotes}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">No decision recorded yet.</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Decision</label>
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Select decision</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="DEFERRED">Deferred</option>
                  </select>
                </div>
                {decision === 'APPROVED' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Funding Band
                    </label>
                    <select
                      value={fundingBand}
                      onChange={(e) => setFundingBand(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="">Select band</option>
                      <option value="STANDARD">Standard</option>
                      <option value="HIGH">High</option>
                      <option value="ENHANCED">Enhanced</option>
                      <option value="EXCEPTIONAL">Exceptional</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>
                <button
                  onClick={handleDecision}
                  disabled={actionLoading || !decision}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Record Decision'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Care Package ─────────────────────────── */}
        {tab === 'Care Package' && (
          <div>
            {chcCase.carePackageStartDate ? (
              <div className="space-y-3">
                <p className="text-sm">
                  <strong>Start Date:</strong> {formatDate(chcCase.carePackageStartDate)}
                </p>
                <p className="text-sm">
                  <strong>Annual Review:</strong> {formatDate(chcCase.annualReviewDate)}
                </p>
                {chcCase.carePlan && (
                  <p className="text-sm">
                    <strong>Care Plan:</strong>{' '}
                    <Link
                      to={`/app/care-plans/${chcCase.carePlan.id}`}
                      className="text-accent hover:underline"
                    >
                      {chcCase.carePlan.title}
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">No care package set up yet.</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={cpStartDate}
                    onChange={(e) => setCpStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Annual Review Date <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={cpReviewDate}
                    onChange={(e) => setCpReviewDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Care Plan <span className="text-slate-400">(optional)</span>
                  </label>
                  <select
                    value={cpCarePlanId}
                    onChange={(e) => setCpCarePlanId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">
                      {carePlans.length === 0
                        ? 'No care plans for this patient'
                        : 'Select a care plan'}
                    </option>
                    {carePlans.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.title} ({cp.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCarePackage}
                  disabled={actionLoading || !cpStartDate}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Setup Care Package'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Notes ────────────────────────────────── */}
        {tab === 'Notes' && (
          <div>
            {/* Add note */}
            <div className="mb-6 space-y-3">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                rows={3}
                placeholder="Add a note..."
              />
              <button
                onClick={handleAddNote}
                disabled={actionLoading || !noteContent.trim()}
                className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Adding...' : 'Add Note'}
              </button>
            </div>

            {/* Notes list */}
            {(chcCase.notes ?? []).length > 0 ? (
              <div className="space-y-3">
                {chcCase.notes!.map((n) => (
                  <div key={n.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">
                        {n.author.firstName} {n.author.lastName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDate(n.createdAt)} &middot; {n.phase.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 m-0">{n.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No notes yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
