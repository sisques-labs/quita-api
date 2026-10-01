import { BalanceExpenseEntry } from '@contexts/balances/domain/interfaces/balance-entries.interface';

export const EXPENSES_PORT = Symbol('EXPENSES_PORT');

/** Consumer-owned port towards the expenses context (non-deleted expenses only). */
export interface ExpensesPort {
  listActiveExpenses(groupId: string): Promise<BalanceExpenseEntry[]>;
}
