/**
 * Resolve commission rate and cleaning-only flag for journal generation.
 * Lookup order: property > owner > default.
 * commission_rate: default 0.175, override per property_id or per owner_id.
 * cleaning_only: from property; when true, Right Stay does NOT collect rental.
 */

import { supabase } from '@/lib/supabase';
import {
  DEFAULT_COMMISSION_RATE,
  DEFAULT_CLEANING_DEPOSIT_ACCOUNT,
  type CommissionConfig,
} from './commissionConstants';
import { ACCOUNT_4030_OTHER_INCOME } from './chartOfAccounts';

export type { CommissionConfig } from './commissionConstants';
export { DEFAULT_COMMISSION_RATE } from './commissionConstants';

/**
 * Resolve commission rate and cleaning-only from DB.
 * property_id takes precedence for commission_rate (property > owner > default).
 * cleaning_only comes from property; if no property_id, defaults to false.
 */
export async function resolveCommissionConfig(
  propertyId: string | null | undefined,
  ownerId: string | null | undefined
): Promise<CommissionConfig> {
  let commissionRate: number | null = null;
  let cleaningOnly = false;
  let cleaningDepositAccount = DEFAULT_CLEANING_DEPOSIT_ACCOUNT;

  if (propertyId) {
    const { data: prop } = await supabase
      .from('properties')
      .select('commission_rate, cleaning_only, cleaning_deposit_account')
      .eq('id', propertyId)
      .single();
    if (prop) {
      if (prop.commission_rate != null) commissionRate = Number(prop.commission_rate);
      cleaningOnly = Boolean(prop.cleaning_only);
      if (prop.cleaning_deposit_account === '4030') cleaningDepositAccount = ACCOUNT_4030_OTHER_INCOME;
    }
  }

  if (commissionRate == null && ownerId) {
    const { data: owner } = await supabase
      .from('owners')
      .select('commission_rate')
      .eq('id', ownerId)
      .single();
    if (owner?.commission_rate != null) commissionRate = Number(owner.commission_rate);
  }

  if (commissionRate == null) commissionRate = DEFAULT_COMMISSION_RATE;

  return { commissionRate, cleaningOnly, cleaningDepositAccount };
}
