import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { getAccessToken } from '../services/enterpriseRepository';
import { CanonicalPlanId } from '../types/autolife';

export interface AdminUserRow {
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
  activePlan: CanonicalPlanId;
  subscriptionStatus: string;
  billingCycle: 'monthly' | 'annual';
  provider: string;
  currentPeriodEnd: string | null;
  vehiclesCount: number;
}

interface AdminPanelViewProps {
  adminEmail: string | null;
  onOwnPlanGranted: (planId: CanonicalPlanId) => Promise<void> | void;
}

const PLAN_OPTIONS: { id: CanonicalPlanId; label: string }[] = [
  { id: 'personal', label: 'Plano Particular (1 veículo)' },
  { id: 'fleet_10', label: 'Plano Frotas 10 (até 10 veículos)' },
  { id: 'fleet_25', label: 'Plano Frotas 25 (até 25 veículos)' },
  { id: 'fleet_50', label: 'Plano Frotas 50 (até 50 veículos)' },
  { id: 'fleet_100', label: 'Plano Frotas 100 (até 100 veículos)' },
  { id: 'enterprise', label: 'Empresarial Personalizado (Ilimitado)' },
];

const DURATION_OPTIONS = [
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
  { days: 365, label: '1 ano (365 dias)' },
  { days: 3650, label: '10 anos (VIP)' },
];

const ADMIN_SETUP_SQL = `create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  active_plan text,
  subscription_status text,
  billing_cycle text,
  provider text,
  current_period_end timestamptz,
  vehicles_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_caller_email <> 'picelador@gmail.com' then
    raise exception 'Acesso restrito ao administrador.';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      ''
    )::text as full_name,
    u.created_at,
    coalesce(s.plan_id, p.active_plan, 'personal')::text as active_plan,
    coalesce(s.status, 'active')::text as subscription_status,
    coalesce(s.billing_cycle, 'monthly')::text as billing_cycle,
    coalesce(s.provider, 'manual')::text as provider,
    s.current_period_end,
    (select count(*) from public.vehicles v where v.user_id = u.id) as vehicles_count
  from auth.users u
  left join public.user_subscriptions s on s.user_id = u.id
  left join public.user_preferences p on p.user_id = u.id
  order by u.created_at desc
  limit 200;
end;
$$;

create or replace function public.admin_grant_plan(
  target_email text,
  target_plan_id text,
  duration_days integer default 365
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_user_id uuid;
  v_user_email text;
  v_days integer := greatest(1, least(coalesce(duration_days, 365), 3650));
  v_period_end timestamptz := now() + make_interval(days => greatest(1, least(coalesce(duration_days, 365), 3650)));
  v_cycle text := case when v_days >= 300 then 'annual' else 'monthly' end;
begin
  if v_caller_email <> 'picelador@gmail.com' then
    raise exception 'Acesso restrito ao administrador.';
  end if;

  if target_plan_id not in ('personal', 'fleet_10', 'fleet_25', 'fleet_50', 'fleet_100', 'enterprise') then
    raise exception 'Plano invalido: %', target_plan_id;
  end if;

  select id, email::text
  into v_user_id, v_user_email
  from auth.users
  where lower(email) = lower(trim(coalesce(target_email, '')))
  limit 1;

  if v_user_id is null then
    raise exception 'Conta nao encontrada para o e-mail informado.';
  end if;

  insert into public.user_subscriptions (
    user_id, plan_id, country_code, currency_code, billing_cycle,
    status, auto_renew, current_period_start, current_period_end,
    grace_period_end, canceled_at, provider, updated_at
  ) values (
    v_user_id, target_plan_id, 'BR', 'BRL', v_cycle,
    'active', false, now(), v_period_end,
    null, null, 'manual', now()
  )
  on conflict (user_id) do update set
    plan_id = excluded.plan_id,
    billing_cycle = excluded.billing_cycle,
    status = 'active',
    auto_renew = false,
    current_period_start = now(),
    current_period_end = excluded.current_period_end,
    grace_period_end = null,
    canceled_at = null,
    provider = 'manual',
    updated_at = now();

  insert into public.user_preferences (user_id, active_plan, updated_at)
  values (v_user_id, target_plan_id, now())
  on conflict (user_id) do update set
    active_plan = excluded.active_plan,
    updated_at = now();

  return jsonb_build_object(
    'userId', v_user_id,
    'email', v_user_email,
    'planId', target_plan_id,
    'status', 'active',
    'currentPeriodEnd', v_period_end
  );
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

revoke all on function public.admin_grant_plan(text, text, integer) from public;
grant execute on function public.admin_grant_plan(text, text, integer) to authenticated;`;

function planLabel(planId: CanonicalPlanId): string {
  return PLAN_OPTIONS.find((p) => p.id === planId)?.label ?? planId;
}

export function AdminPanelView({ adminEmail, onOwnPlanGranted }: AdminPanelViewProps) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [needsSqlSetup, setNeedsSqlSetup] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [targetEmail, setTargetEmail] = useState('');
  const [targetPlanId, setTargetPlanId] = useState<CanonicalPlanId>('enterprise');
  const [durationDays, setDurationDays] = useState<number>(365);
  const [searchTerm, setSearchTerm] = useState('');

  const [grantBusy, setGrantBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ mode: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setFeedback({ mode: 'error', message: 'Sessão expirada. Faça login novamente.' });
        return;
      }
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        users?: AdminUserRow[];
        needsSqlSetup?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || `Erro HTTP ${res.status}`);
      }
      setNeedsSqlSetup(Boolean(data.needsSqlSetup));
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setFeedback({
        mode: 'error',
        message: err instanceof Error ? err.message : 'Não foi possível carregar os usuários.',
      });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.activePlan.toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  const handleGrantPlan = async (
    emailOverride?: string,
    planOverride?: CanonicalPlanId,
    daysOverride?: number
  ) => {
    const emailToUse = (emailOverride ?? targetEmail).trim().toLowerCase();
    const planToUse = planOverride ?? targetPlanId;
    const daysToUse = daysOverride ?? durationDays;

    if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      setFeedback({ mode: 'error', message: 'Digite um e-mail válido para liberar o plano.' });
      return;
    }

    setGrantBusy(true);
    setFeedback(null);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Sessão expirada. Entre novamente.');

      const res = await fetch('/api/admin/grant-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: emailToUse,
          planId: planToUse,
          durationDays: daysToUse,
        }),
      });
      const data = (await res.json()) as {
        granted?: boolean;
        email?: string;
        planId?: CanonicalPlanId;
        needsSqlSetup?: boolean;
        error?: string;
      };

      if (data.needsSqlSetup) {
        setNeedsSqlSetup(true);
      }

      if (!res.ok || !data.granted) {
        throw new Error(data.error || 'Falha ao liberar plano.');
      }

      setFeedback({
        mode: 'success',
        message: `Plano "${planLabel(planToUse)}" ativado para ${data.email ?? emailToUse} por ${daysToUse} dias.`,
      });

      if (adminEmail && emailToUse === adminEmail.trim().toLowerCase()) {
        await onOwnPlanGranted(planToUse);
      }

      await loadUsers();
    } catch (err) {
      setFeedback({
        mode: 'error',
        message: err instanceof Error ? err.message : 'Erro ao atualizar plano.',
      });
    } finally {
      setGrantBusy(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(ADMIN_SETUP_SQL);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Clipboard blocked fallback
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
            <h1 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Painel Admin — Liberação de Planos
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acesso exclusivo para <strong className="font-mono">{adminEmail}</strong>. Libere planos VIP, frotas ou cortesias em 1 clique sem abrir o Supabase.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loadingUsers}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl autolife-glass text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10 whitespace-nowrap shrink-0 disabled:opacity-60"
        >
          {loadingUsers ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>Atualizar contas</span>
        </button>
      </div>

      {needsSqlSetup && (
        <section className="bg-amber-50/70 dark:bg-amber-950/25 border border-amber-300 dark:border-amber-800/70 rounded-2xl p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Ativação única no SQL Editor do Supabase
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Como você usa apenas a chave pública no servidor, cole este SQL uma única vez no SQL Editor do Supabase e clique em <strong>Run</strong> para habilitar a listagem e liberação direto por aqui.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopySql()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 whitespace-nowrap shrink-0"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'SQL copiado' : 'Copiar SQL único'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-xl bg-[#040812] text-slate-200 text-[11px] font-mono overflow-x-auto max-h-48 border border-white/10">
            {ADMIN_SETUP_SQL}
          </pre>
        </section>
      )}

      {/* Grant / Upgrade Plan Form */}
      <section className="autolife-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Liberar ou Alterar Plano por E-mail
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleGrantPlan();
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-5">
            <label
              htmlFor="admin-target-email"
              className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              E-mail da conta
            </label>
            <input
              id="admin-target-email"
              type="email"
              required
              placeholder="cliente@gmail.com"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="admin-target-plan"
              className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Plano a liberar
            </label>
            <select
              id="admin-target-plan"
              value={targetPlanId}
              onChange={(e) => setTargetPlanId(e.target.value as CanonicalPlanId)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="admin-duration-days"
              className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Validade
            </label>
            <select
              id="admin-duration-days"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d.days} value={d.days}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              A pessoa precisa já ter entrado no app pelo menos uma vez (Google ou e-mail) para aparecer abaixo.
            </span>
            <button
              type="submit"
              disabled={grantBusy}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {grantBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Liberar Plano Agora</span>
            </button>
          </div>
        </form>

        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs ${
              feedback.mode === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </section>

      {/* Registered Accounts Directory */}
      <section className="autolife-glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Contas Cadastradas ({users.length})
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por e-mail ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {loadingUsers ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando contas...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            {needsSqlSetup
              ? 'Execute o SQL acima no Supabase e clique em "Atualizar contas" para listar os usuários.'
              : 'Nenhuma conta encontrada.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/10 tabular-nums">
            {filteredUsers.map((user) => {
              const expiryLabel = user.currentPeriodEnd
                ? new Date(user.currentPeriodEnd).toLocaleDateString('pt-BR')
                : 'Sem vencimento';
              return (
                <div
                  key={user.userId}
                  className="px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {user.email}
                      {user.fullName ? ` — ${user.fullName}` : ''}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                      <span>
                        Plano: <strong>{user.activePlan}</strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Status: {user.subscriptionStatus}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {user.vehiclesCount} veículo{user.vehiclesCount === 1 ? '' : 's'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Validade: {expiryLabel}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetEmail(user.email);
                        setTargetPlanId(user.activePlan);
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 whitespace-nowrap shrink-0"
                    >
                      Selecionar
                    </button>
                    {user.activePlan !== 'enterprise' && (
                      <button
                        type="button"
                        disabled={grantBusy}
                        onClick={() => void handleGrantPlan(user.email, 'enterprise', 365)}
                        className="px-3 py-1.5 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
                      >
                        Liberar Enterprise (1 ano)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
