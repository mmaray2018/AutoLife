import { useState } from 'react';
import {
  Building2,
  Check,
  Loader2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { getUi } from '../data/uiTranslations';
import {
  DEFAULT_ROLE_PERMISSIONS,
  inviteOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMember,
  updateOrganizationProfile,
} from '../services/enterpriseRepository';
import {
  CountryCode,
  LanguageCode,
  OrganizationMember,
  OrganizationMemberRole,
  OrganizationPermissions,
  OrganizationProfile,
} from '../types/autolife';
import { COUNTRY_LIST, getLocalizedCountryName } from '../utils/billing';

interface FleetTeamSectionProps {
  organization: OrganizationProfile | null;
  members: OrganizationMember[];
  cloudUserId: string | null;
  maxTeamMembers: number | null;
  language?: LanguageCode;
  onOrganizationUpdated: (org: OrganizationProfile) => void;
  onMembersChanged: (next: OrganizationMember[]) => void;
  onOpenCloudSettings: () => void;
}

const PERMISSION_KEYS: Array<keyof OrganizationPermissions> = [
  'canViewVehicles',
  'canEditVehicles',
  'canLogMaintenance',
  'canViewExpenses',
  'canManageTeam',
];

export function FleetTeamSection({
  organization,
  members,
  cloudUserId,
  maxTeamMembers,
  language = 'pt',
  onOrganizationUpdated,
  onMembersChanged,
  onOpenCloudSettings,
}: FleetTeamSectionProps) {
  const ui = getUi(language).teamUi;

  const [companyName, setCompanyName] = useState(organization?.name ?? '');
  const [taxId, setTaxId] = useState(organization?.taxId ?? '');
  const [orgCountry, setOrgCountry] = useState<CountryCode>(
    (organization?.countryCode as CountryCode) || 'US'
  );
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationMemberRole>('driver');
  const [invitePerms, setInvitePerms] = useState<OrganizationPermissions>(
    DEFAULT_ROLE_PERMISSIONS.driver
  );
  const [inviteBusy, setInviteBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [syncedOrgId, setSyncedOrgId] = useState(organization?.id ?? '');
  if ((organization?.id ?? '') !== syncedOrgId) {
    setSyncedOrgId(organization?.id ?? '');
    setCompanyName(organization?.name ?? '');
    setTaxId(organization?.taxId ?? '');
    setOrgCountry((organization?.countryCode as CountryCode) || 'US');
  }

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setOrgSaving(true);
    setFeedback(null);
    try {
      const updated = await updateOrganizationProfile(organization.id, {
        name: companyName,
        taxId,
        countryCode: orgCountry,
      });
      if (updated) {
        onOrganizationUpdated(updated);
        setOrgSaved(true);
        window.setTimeout(() => setOrgSaved(false), 2500);
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !cloudUserId) return;
    if (maxTeamMembers !== null && members.length >= maxTeamMembers) {
      setFeedback(`${ui.limitReachedMsg} (${maxTeamMembers})`);
      return;
    }
    setInviteBusy(true);
    setFeedback(null);
    try {
      const created = await inviteOrganizationMember({
        organizationId: organization.id,
        invitedBy: cloudUserId,
        memberName: inviteName,
        memberEmail: inviteEmail,
        role: inviteRole,
        permissions: invitePerms,
      });
      const existingIdx = members.findIndex((m) => m.id === created.id);
      const nextList =
        existingIdx >= 0
          ? members.map((m) => (m.id === created.id ? created : m))
          : [created, ...members];
      onMembersChanged(nextList);
      setInviteName('');
      setInviteEmail('');
      setFeedback(`${ui.inviteSuccessMsg} ${created.memberEmail}`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error');
    } finally {
      setInviteBusy(false);
    }
  };

  const handleToggleMemberPermission = async (
    member: OrganizationMember,
    permKey: keyof OrganizationPermissions
  ) => {
    const nextPerms: OrganizationPermissions = {
      ...member.permissions,
      [permKey]: !member.permissions[permKey],
    };
    try {
      const updated = await updateOrganizationMember(member.id, { permissions: nextPerms });
      onMembersChanged(members.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      // Ignore transient failure
    }
  };

  const handleToggleStatus = async (member: OrganizationMember) => {
    const nextStatus = member.inviteStatus === 'revoked' ? 'active' : 'revoked';
    try {
      const updated = await updateOrganizationMember(member.id, { inviteStatus: nextStatus });
      onMembersChanged(members.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      // Ignore transient failure
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    try {
      await removeOrganizationMember(memberId);
      onMembersChanged(members.filter((m) => m.id !== memberId));
    } catch {
      // Ignore failure
    }
  };

  if (!cloudUserId) {
    return (
      <section className="autolife-glass rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {ui.disconnectedTitle}
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {ui.disconnectedDesc}
        </p>
        <button
          type="button"
          onClick={onOpenCloudSettings}
          className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white"
        >
          {ui.connectBtn}
        </button>
      </section>
    );
  }

  return (
    <section className="autolife-glass rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {ui.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{ui.isolatedNote}</span>
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
          {ui.teamCountLabel}: {members.length}
          {maxTeamMembers !== null ? ` / ${maxTeamMembers}` : ''}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Organization Details */}
        <form onSubmit={handleSaveOrg} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {ui.companyNameLabel}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={ui.companyPlaceholder}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {ui.taxIdLabel}
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder={ui.taxIdPlaceholder}
              className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={orgCountry}
              onChange={(e) => setOrgCountry(e.target.value as CountryCode)}
              className="flex-1 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            >
              {COUNTRY_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {getLocalizedCountryName(c.code, language)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={orgSaving || !organization}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {orgSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : orgSaved ? ui.savedBtn : ui.saveBtn}
            </button>
          </div>
        </form>

        {/* Invite Employee Form */}
        <form
          onSubmit={handleInviteMember}
          className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/60 space-y-3"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
            <UserPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{ui.inviteTitle}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder={ui.namePlaceholder}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
            <input
              type="email"
              required
              placeholder={ui.emailPlaceholder}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
            <select
              value={inviteRole}
              onChange={(e) => {
                const nextRole = e.target.value as OrganizationMemberRole;
                setInviteRole(nextRole);
                setInvitePerms(DEFAULT_ROLE_PERMISSIONS[nextRole]);
              }}
              className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            >
              {(Object.keys(ui.roles) as OrganizationMemberRole[]).map((role) => (
                <option key={role} value={role}>
                  {ui.roles[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
              {PERMISSION_KEYS.map((permKey) => (
                <label key={permKey} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invitePerms[permKey]}
                    onChange={(e) =>
                      setInvitePerms((prev) => ({ ...prev, [permKey]: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-sky-600"
                  />
                  <span>{ui.permissions[permKey]}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={inviteBusy || !organization}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {inviteBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{ui.inviteBtn}</span>
            </button>
          </div>
        </form>

        {feedback && <p className="text-xs text-sky-600 dark:text-sky-400">{feedback}</p>}

        {/* Team Member List */}
        {members.length > 0 && (
          <div className="divide-y divide-slate-200/80 dark:divide-white/10">
            {members.map((member) => (
              <div
                key={member.id}
                className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {member.memberName || member.memberEmail}{' '}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      · {ui.roles[member.role] ?? member.role} ·{' '}
                      {member.inviteStatus === 'active'
                        ? ui.statusActive
                        : member.inviteStatus === 'pending'
                        ? ui.statusPending
                        : ui.statusRevoked}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {member.memberEmail}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {PERMISSION_KEYS.map((permKey) => (
                    <button
                      key={permKey}
                      type="button"
                      onClick={() => void handleToggleMemberPermission(member, permKey)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        member.permissions[permKey]
                          ? 'border-sky-300 dark:border-sky-500/40 bg-sky-50/70 dark:bg-sky-950/35 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-white/10 text-slate-400'
                      }`}
                    >
                      {member.permissions[permKey] && <Check className="w-3 h-3" />}
                      <span>{ui.permissions[permKey]}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(member)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    {member.inviteStatus === 'revoked' ? ui.reactivateBtn : ui.suspendBtn}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteMember(member.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={ui.removeMemberAria}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
