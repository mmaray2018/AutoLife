import { supabase } from '../lib/supabaseClient';
import {
  BillingCycle,
  CanonicalPlanId,
  CountryCode,
  CurrencyCode,
  OdometerEvent,
  OrganizationMember,
  OrganizationMemberRole,
  OrganizationPermissions,
  OrganizationProfile,
  PassportSnapshotPayload,
  PlanCountryPrice,
  SubscriptionPaymentRecord,
  SubscriptionPlanCatalogItem,
  UserSubscriptionRecord,
  VehiclePassportShare,
} from '../types/autolife';
import {
  COUNTRY_CATALOG,
  buildFallbackPlanCatalog,
  normalizePlanTier,
} from '../utils/billing';

function toNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function fetchBillingCatalog(
  countryCode: CountryCode,
  currencyCode: CurrencyCode
): Promise<{ plans: SubscriptionPlanCatalogItem[]; source: 'database' | 'fallback' }> {
  try {
    const res = await fetch(
      `/api/billing/catalog?country=${encodeURIComponent(countryCode)}&currency=${encodeURIComponent(
        currencyCode
      )}`
    );
    if (res.ok) {
      const data = (await res.json()) as {
        plans?: SubscriptionPlanCatalogItem[];
        source?: 'database' | 'fallback';
      };
      if (Array.isArray(data.plans) && data.plans.length > 0) {
        return {
          plans: data.plans,
          source: data.source === 'database' ? 'database' : 'fallback',
        };
      }
    }
  } catch {
    // Fallback to direct Supabase query or offline catalog
  }

  if (supabase) {
    try {
      const [plansRes, pricesRes] = await Promise.all([
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('plan_country_prices')
          .select('*')
          .eq('is_active', true)
          .eq('currency_code', currencyCode),
      ]);

      if (!plansRes.error && Array.isArray(plansRes.data) && plansRes.data.length > 0) {
        const prices = (pricesRes.data ?? []) as Array<Record<string, unknown>>;
        const fallbackRegion = COUNTRY_CATALOG[countryCode]?.fallbackCountryCode ?? 'GLOBAL';
        const fallbackCatalog = buildFallbackPlanCatalog(countryCode, currencyCode);

        const mapped: SubscriptionPlanCatalogItem[] = plansRes.data.map((row) => {
          const planId = normalizePlanTier(String(row.id));
          const exact =
            prices.find((p) => p.plan_id === planId && p.country_code === countryCode) ||
            prices.find((p) => p.plan_id === planId && p.country_code === fallbackRegion) ||
            prices.find((p) => p.plan_id === planId);
          const fb = fallbackCatalog.find((f) => f.id === planId)?.price;
          const resolvedPrice: PlanCountryPrice = exact
            ? {
                planId,
                countryCode: String(exact.country_code || countryCode),
                currencyCode: (String(exact.currency_code || currencyCode) as CurrencyCode) || currencyCode,
                monthlyPriceMinor: toNumber(exact.monthly_price_minor, fb?.monthlyPriceMinor ?? 0),
                annualPriceMinor: toNumber(exact.annual_price_minor, fb?.annualPriceMinor ?? 0),
                taxRatePercent: toNumber(exact.tax_rate_percent, fb?.taxRatePercent ?? 0),
                taxLabel: String(exact.tax_label ?? fb?.taxLabel ?? ''),
                processingFeePercent: toNumber(
                  exact.processing_fee_percent,
                  fb?.processingFeePercent ?? 0
                ),
                processingFeeFixedMinor: toNumber(
                  exact.processing_fee_fixed_minor,
                  fb?.processingFeeFixedMinor ?? 0
                ),
              }
            : fb!;

          return {
            id: planId,
            slug: String(row.slug || planId),
            accountScope: row.account_scope === 'business' ? 'business' : 'personal',
            name: String(row.name || planId),
            description: String(row.description || ''),
            vehicleLimit: row.vehicle_limit === null ? null : toNumber(row.vehicle_limit, 1),
            allowFleetPanel: Boolean(row.allow_fleet_panel),
            allowTeamMembers: Boolean(row.allow_team_members),
            maxTeamMembers:
              row.max_team_members === null ? null : toNumber(row.max_team_members, 1),
            features: Array.isArray(row.features) ? row.features.map(String) : [],
            sortOrder: toNumber(row.sort_order, 0),
            price: resolvedPrice,
          };
        });

        return { plans: mapped, source: 'database' };
      }
    } catch {
      // Ignore fallback DB error
    }
  }

  return {
    plans: buildFallbackPlanCatalog(countryCode, currencyCode),
    source: 'fallback',
  };
}

function mapSubscriptionRow(row: Record<string, unknown>): UserSubscriptionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    planId: normalizePlanTier(String(row.plan_id)),
    countryCode: String(row.country_code || 'BR'),
    currencyCode: (String(row.currency_code || 'BRL') as CurrencyCode) || 'BRL',
    billingCycle: row.billing_cycle === 'annual' ? 'annual' : 'monthly',
    status: (String(row.status || 'active') as UserSubscriptionRecord['status']) || 'active',
    autoRenew: Boolean(row.auto_renew ?? true),
    currentPeriodStart: String(row.current_period_start || new Date().toISOString()),
    currentPeriodEnd: String(row.current_period_end || new Date().toISOString()),
    gracePeriodEnd: row.grace_period_end ? String(row.grace_period_end) : null,
    canceledAt: row.canceled_at ? String(row.canceled_at) : null,
    provider: String(row.provider || 'manual'),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapPaymentRow(row: Record<string, unknown>): SubscriptionPaymentRecord {
  return {
    id: String(row.id),
    planId: normalizePlanTier(String(row.plan_id)),
    amountMinor: toNumber(row.amount_minor, 0),
    taxMinor: toNumber(row.tax_minor, 0),
    processingFeeMinor: toNumber(row.processing_fee_minor, 0),
    currencyCode: (String(row.currency_code || 'BRL') as CurrencyCode) || 'BRL',
    countryCode: String(row.country_code || 'BR'),
    paymentMethod: String(row.payment_method || 'card'),
    provider: String(row.provider || 'stripe'),
    providerPaymentId: row.provider_payment_id ? String(row.provider_payment_id) : undefined,
    status: (String(row.status || 'paid') as SubscriptionPaymentRecord['status']) || 'paid',
    paidAt: String(row.paid_at || row.created_at || new Date().toISOString()),
  };
}

export async function fetchUserSubscriptionState(
  accessToken: string | null,
  userId: string | null
): Promise<{
  subscription: UserSubscriptionRecord | null;
  payments: SubscriptionPaymentRecord[];
}> {
  if (!accessToken && !userId) {
    return { subscription: null, payments: [] };
  }

  if (accessToken) {
    try {
      const res = await fetch('/api/billing/subscription', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          subscription?: UserSubscriptionRecord | null;
          payments?: SubscriptionPaymentRecord[];
        };
        if (data.subscription !== undefined || Array.isArray(data.payments)) {
          return {
            subscription: data.subscription ?? null,
            payments: Array.isArray(data.payments) ? data.payments : [],
          };
        }
      }
    } catch {
      // Fall through to direct Supabase read
    }
  }

  if (supabase && userId) {
    try {
      const [subRes, payRes] = await Promise.all([
        supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('subscription_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);
      return {
        subscription: subRes.data ? mapSubscriptionRow(subRes.data as Record<string, unknown>) : null,
        payments: Array.isArray(payRes.data)
          ? payRes.data.map((r) => mapPaymentRow(r as Record<string, unknown>))
          : [],
      };
    } catch {
      return { subscription: null, payments: [] };
    }
  }

  return { subscription: null, payments: [] };
}

export async function manageUserSubscription(
  accessToken: string | null,
  userId: string | null,
  payload: {
    action: 'cancel' | 'toggle_auto_renew' | 'change_plan';
    autoRenew?: boolean;
    planId?: CanonicalPlanId;
    countryCode?: CountryCode;
    currencyCode?: CurrencyCode;
    billingCycle?: BillingCycle;
  }
): Promise<UserSubscriptionRecord | null> {
  if (accessToken) {
    try {
      const res = await fetch('/api/billing/subscription/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as { subscription?: UserSubscriptionRecord | null };
        return data.subscription ?? null;
      }
    } catch {
      // Fallback to direct Supabase upsert
    }
  }

  if (!supabase || !userId) return null;

  const nowIso = new Date().toISOString();
  const periodDays = payload.billingCycle === 'annual' ? 365 : 30;
  const periodEndIso = new Date(Date.now() + periodDays * 86_400_000).toISOString();

  if (payload.action === 'cancel') {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        auto_renew: false,
        canceled_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? mapSubscriptionRow(data as Record<string, unknown>) : null;
  }

  if (payload.action === 'toggle_auto_renew') {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        auto_renew: Boolean(payload.autoRenew),
        updated_at: nowIso,
      })
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? mapSubscriptionRow(data as Record<string, unknown>) : null;
  }

  if (payload.action === 'change_plan' && payload.planId) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_id: payload.planId,
          country_code: payload.countryCode ?? 'BR',
          currency_code: payload.currencyCode ?? 'BRL',
          billing_cycle: payload.billingCycle ?? 'monthly',
          status: 'active',
          auto_renew: true,
          current_period_start: nowIso,
          current_period_end: periodEndIso,
          canceled_at: null,
          provider: 'manual',
          updated_at: nowIso,
        },
        { onConflict: 'user_id' }
      )
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data ? mapSubscriptionRow(data as Record<string, unknown>) : null;
  }

  return null;
}

// ============================================================================
// Multi-tenant Organizations & Employees
// ============================================================================
export const DEFAULT_ROLE_PERMISSIONS: Record<OrganizationMemberRole, OrganizationPermissions> = {
  admin: {
    canViewVehicles: true,
    canEditVehicles: true,
    canLogMaintenance: true,
    canViewExpenses: true,
    canManageTeam: true,
  },
  fleet_manager: {
    canViewVehicles: true,
    canEditVehicles: true,
    canLogMaintenance: true,
    canViewExpenses: true,
    canManageTeam: false,
  },
  driver: {
    canViewVehicles: true,
    canEditVehicles: false,
    canLogMaintenance: true,
    canViewExpenses: false,
    canManageTeam: false,
  },
  viewer: {
    canViewVehicles: true,
    canEditVehicles: false,
    canLogMaintenance: false,
    canViewExpenses: false,
    canManageTeam: false,
  },
};

function mapOrgRow(row: Record<string, unknown>): OrganizationProfile {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    name: String(row.name || 'My Fleet'),
    taxId: String(row.tax_id || ''),
    countryCode: String(row.country_code || 'US'),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapMemberRow(row: Record<string, unknown>): OrganizationMember {
  const role = (String(row.role || 'driver') as OrganizationMemberRole) || 'driver';
  const rawPerms = (row.permissions as Partial<OrganizationPermissions> | null) ?? {};
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    userId: row.user_id ? String(row.user_id) : null,
    memberEmail: String(row.member_email || ''),
    memberName: String(row.member_name || ''),
    role,
    permissions: {
      ...DEFAULT_ROLE_PERMISSIONS[role],
      ...rawPerms,
    },
    inviteStatus: (String(row.invite_status || 'pending') as OrganizationMember['inviteStatus']) || 'pending',
    inviteToken: String(row.invite_token || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function fetchOrCreateOrganization(
  userId: string,
  countryCode: CountryCode,
  defaultName = 'My Fleet'
): Promise<OrganizationProfile | null> {
  if (!supabase || !userId) return null;
  try {
    const existing = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existing.data) {
      return mapOrgRow(existing.data as Record<string, unknown>);
    }

    const created = await supabase
      .from('organizations')
      .insert({
        owner_user_id: userId,
        name: defaultName,
        tax_id: '',
        country_code: countryCode,
      })
      .select('*')
      .single();

    if (created.error || !created.data) return null;
    return mapOrgRow(created.data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function updateOrganizationProfile(
  orgId: string,
  patch: { name: string; taxId: string; countryCode: CountryCode }
): Promise<OrganizationProfile | null> {
  if (!supabase || !orgId) return null;
  const { data, error } = await supabase
    .from('organizations')
    .update({
      name: patch.name.trim() || 'My Fleet',
      tax_id: patch.taxId.trim(),
      country_code: patch.countryCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)
    .select('*')
    .single();
  if (error) throw error;
  return data ? mapOrgRow(data as Record<string, unknown>) : null;
}

export async function fetchOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  if (!supabase || !orgId) return [];
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data.map((r) => mapMemberRow(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function inviteOrganizationMember(params: {
  organizationId: string;
  invitedBy: string;
  memberName: string;
  memberEmail: string;
  role: OrganizationMemberRole;
  permissions: OrganizationPermissions;
}): Promise<OrganizationMember> {
  if (!supabase) {
    throw new Error('Connect to Supabase to manage team invites.');
  }
  const { data, error } = await supabase
    .from('organization_members')
    .upsert(
      {
        organization_id: params.organizationId,
        invited_by: params.invitedBy,
        member_name: params.memberName.trim(),
        member_email: params.memberEmail.trim().toLowerCase(),
        role: params.role,
        permissions: params.permissions,
        invite_status: 'pending',
      },
      { onConflict: 'organization_id,member_email' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return mapMemberRow(data as Record<string, unknown>);
}

export async function updateOrganizationMember(
  memberId: string,
  patch: {
    role?: OrganizationMemberRole;
    permissions?: OrganizationPermissions;
    inviteStatus?: OrganizationMember['inviteStatus'];
  }
): Promise<OrganizationMember> {
  if (!supabase) throw new Error('Supabase not configured.');
  const updateBody: Record<string, unknown> = {};
  if (patch.role) updateBody.role = patch.role;
  if (patch.permissions) updateBody.permissions = patch.permissions;
  if (patch.inviteStatus) updateBody.invite_status = patch.inviteStatus;

  const { data, error } = await supabase
    .from('organization_members')
    .update(updateBody)
    .eq('id', memberId)
    .select('*')
    .single();
  if (error) throw error;
  return mapMemberRow(data as Record<string, unknown>);
}

export async function removeOrganizationMember(memberId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
  if (error) throw error;
}

// ============================================================================
// Immutable Odometer Events (append-only)
// ============================================================================
export async function fetchOdometerEvents(
  userId: string,
  vehicleId?: string
): Promise<OdometerEvent[]> {
  if (!supabase || !userId) return [];
  try {
    let query = supabase
      .from('odometer_events')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true });
    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => ({
      id: String(row.id),
      vehicleId: String(row.vehicle_id),
      odometerKm: toNumber(row.odometer_km, 0),
      source: (String(row.source || 'manual') as OdometerEvent['source']) || 'manual',
      recordedAt: String(row.recorded_at || new Date().toISOString()),
    }));
  } catch {
    return [];
  }
}

export async function appendOdometerEvent(
  userId: string,
  vehicleId: string,
  odometerKm: number,
  source: OdometerEvent['source']
): Promise<OdometerEvent | null> {
  if (!supabase || !userId || !vehicleId) return null;
  try {
    const { data, error } = await supabase
      .from('odometer_events')
      .insert({
        user_id: userId,
        vehicle_id: vehicleId,
        odometer_km: Math.max(0, Math.round(odometerKm)),
        source,
      })
      .select('*')
      .single();
    if (error || !data) return null;
    return {
      id: String(data.id),
      vehicleId: String(data.vehicle_id),
      odometerKm: toNumber(data.odometer_km, 0),
      source: (String(data.source || source) as OdometerEvent['source']) || source,
      recordedAt: String(data.recorded_at || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Digital Vehicle Passport Authorized Shares + QR Code Verification
// ============================================================================
function mapShareRow(row: Record<string, unknown>): VehiclePassportShare {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    shareToken: String(row.share_token),
    isActive: Boolean(row.is_active),
    includeExpenses: Boolean(row.include_expenses),
    includeDocuments: Boolean(row.include_documents),
    passportSnapshot: row.passport_snapshot as PassportSnapshotPayload,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export async function getOrCreatePassportShare(params: {
  userId: string;
  vehicleId: string;
  includeExpenses: boolean;
  includeDocuments: boolean;
  snapshot: PassportSnapshotPayload;
}): Promise<VehiclePassportShare | null> {
  if (!supabase || !params.userId) return null;
  try {
    const existing = await supabase
      .from('vehicle_passport_shares')
      .select('*')
      .eq('user_id', params.userId)
      .eq('vehicle_id', params.vehicleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing.data) {
      const updated = await supabase
        .from('vehicle_passport_shares')
        .update({
          include_expenses: params.includeExpenses,
          include_documents: params.includeDocuments,
          passport_snapshot: params.snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.data.id)
        .select('*')
        .single();
      if (!updated.error && updated.data) {
        return mapShareRow(updated.data as Record<string, unknown>);
      }
      return mapShareRow(existing.data as Record<string, unknown>);
    }

    const created = await supabase
      .from('vehicle_passport_shares')
      .insert({
        user_id: params.userId,
        vehicle_id: params.vehicleId,
        is_active: true,
        include_expenses: params.includeExpenses,
        include_documents: params.includeDocuments,
        passport_snapshot: params.snapshot,
      })
      .select('*')
      .single();

    if (created.error || !created.data) return null;
    return mapShareRow(created.data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function updatePassportShareSettings(
  shareId: string,
  patch: {
    isActive?: boolean;
    includeExpenses?: boolean;
    includeDocuments?: boolean;
    snapshot?: PassportSnapshotPayload;
  }
): Promise<VehiclePassportShare | null> {
  if (!supabase || !shareId) return null;
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.isActive !== undefined) body.is_active = patch.isActive;
  if (patch.includeExpenses !== undefined) body.include_expenses = patch.includeExpenses;
  if (patch.includeDocuments !== undefined) body.include_documents = patch.includeDocuments;
  if (patch.snapshot !== undefined) body.passport_snapshot = patch.snapshot;

  const { data, error } = await supabase
    .from('vehicle_passport_shares')
    .update(body)
    .eq('id', shareId)
    .select('*')
    .single();
  if (error) throw error;
  return data ? mapShareRow(data as Record<string, unknown>) : null;
}

export async function fetchPublicPassportByToken(
  token: string
): Promise<VehiclePassportShare | null> {
  const clean = token.trim();
  if (!/^[a-f0-9]{16,64}$/i.test(clean)) return null;

  try {
    const res = await fetch(`/api/passport/${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = (await res.json()) as { share?: VehiclePassportShare | null };
      if (data.share) return data.share;
    }
  } catch {
    // Fallback to direct anon Supabase select
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('vehicle_passport_shares')
        .select('*')
        .eq('share_token', clean)
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) return null;
      return mapShareRow(data as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  return null;
}
