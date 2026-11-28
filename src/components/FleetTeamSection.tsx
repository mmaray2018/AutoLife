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
import {
  DEFAULT_ROLE_PERMISSIONS,
  inviteOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMember,
  updateOrganizationProfile,
} from '../services/enterpriseRepository';
import {
  CountryCode,
  OrganizationMember,
  OrganizationMemberRole,
  OrganizationPermissions,
  OrganizationProfile,
} from '../types/autolife';
import { COUNTRY_LIST } from '../utils/billing';

interface FleetTeamSectionProps {
  organization: OrganizationProfile | null;
  members: OrganizationMember[];
  cloudUserId: string | null;
  maxTeamMembers: number | null;
  onOrganizationUpdated: (org: OrganizationProfile) => void;
  onMembersChanged: (next: OrganizationMember[]) => void;
  onOpenCloudSettings: () => void;
}

const ROLE_LABELS: Record<OrganizationMemberRole, string> = {
  admin: 'Administrador',
  fleet_manager: 'Gestor de Frota',
  driver: 'Motorista / Responsável',
  viewer: 'Auditor / Leitura',
};

const PERMISSION_LABELS: Array<{ key: keyof OrganizationPermissions; label: string }> = [
  { key: 'canViewVehicles', label: 'Ver veículos' },
  { key: 'canEditVehicles', label: 'Editar frota' },
  { key: 'canLogMaintenance', label: 'Lançar manutenção' },
  { key: 'canViewExpenses', label: 'Ver despesas' },
  { key: 'canManageTeam', label: 'Gerir equipe' },
];

export function FleetTeamSection({
  organization,
  members,
  cloudUserId,
  maxTeamMembers,
  onOrganizationUpdated,
  onMembersChanged,
  onOpenCloudSettings,
}: FleetTeamSectionProps) {
  const [companyName, setCompanyName] = useState(organization?.name ?? '');
  const [taxId, setTaxId] = useState(organization?.taxId ?? '');
  const [orgCountry, setOrgCountry] = useState<CountryCode>(
    (organization?.countryCode as CountryCode) || 'BR'
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
    setOrgCountry((organization?.countryCode as CountryCode) || 'BR');
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
      setFeedback(err instanceof Error ? err.message : 'Erro ao atualizar dados da empresa.');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !cloudUserId) return;
    if (maxTeamMembers !== null && members.length >= maxTeamMembers) {
      setFeedback(
        `Limite de ${maxTeamMembers} responsáveis atingido no plano atual. Faça upgrade da frota para adicionar mais usuários.`
      );
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
      setFeedback(`Convite registrado para ${created.memberEmail} com permissões personalizadas.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Não foi possível convidar o funcionário.');
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
            Empresa &amp; Equipe de Motoristas
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Conecte-se à sua conta na nuvem para cadastrar sua empresa, convidar funcionários com permissões granulares e isolar os veículos da organização.
        </p>
        <button
          type="button"
          onClick={onOpenCloudSettings}
          className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white"
        >
          Conectar Conta Empresarial
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
              Estrutura Empresarial &amp; Responsáveis da Frota
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Dados isolados por empresa (nenhuma organização acessa veículos ou documentos de outra).
            </span>
          </p>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
          Equipe: {members.length}
          {maxTeamMembers !== null ? ` / ${maxTeamMembers}` : ''}
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Organization Details */}
        <form onSubmit={handleSaveOrg} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Razão Social / Nome da Empresa
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex.: Transportes Silva Ltda"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              CNPJ / VAT / EIN
            </label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Documento fiscal"
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
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={orgSaving || !organization}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {orgSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : orgSaved ? '✓ Salvo' : 'Salvar'}
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
            <span>Convidar Funcionário / Responsável</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Nome completo"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
            <input
              type="email"
              required
              placeholder="funcionario@empresa.com"
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
              {(Object.keys(ROLE_LABELS) as OrganizationMemberRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
              {PERMISSION_LABELS.map((perm) => (
                <label key={perm.key} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={invitePerms[perm.key]}
                    onChange={(e) =>
                      setInvitePerms((prev) => ({ ...prev, [perm.key]: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-sky-600"
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={inviteBusy || !organization}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {inviteBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>Convidar Funcionário</span>
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
                      · {ROLE_LABELS[member.role]} ·{' '}
                      {member.inviteStatus === 'active'
                        ? 'Ativo'
                        : member.inviteStatus === 'pending'
                        ? 'Convite pendente'
                        : 'Revogado'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {member.memberEmail}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {PERMISSION_LABELS.map((perm) => (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => void handleToggleMemberPermission(member, perm.key)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        member.permissions[perm.key]
                          ? 'border-sky-300 dark:border-sky-500/40 bg-sky-50/70 dark:bg-sky-950/35 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-white/10 text-slate-400'
                      }`}
                    >
                      {member.permissions[perm.key] && <Check className="w-3 h-3" />}
                      <span>{perm.label}</span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(member)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    {member.inviteStatus === 'revoked' ? 'Reativar' : 'Suspender'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDeleteMember(member.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    aria-label="Remover funcionário"
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
