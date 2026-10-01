import { BalancePaymentEntry } from '@contexts/balances/domain/interfaces/balance-entries.interface';

export const PAYMENTS_PORT = Symbol('PAYMENTS_PORT');

/** Consumer-owned port towards the payments context (non-deleted payments only). */
export interface PaymentsPort {
  listActivePayments(groupId: string): Promise<BalancePaymentEntry[]>;
}
