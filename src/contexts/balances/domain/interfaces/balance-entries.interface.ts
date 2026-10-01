import { BalanceSplitType } from '@contexts/balances/domain/enums/balance-split-type.enum';

/** An active expense, reduced to what the balance needs. */
export interface BalanceExpenseEntry {
  amountCents: number;
  paidBy: string;
  splitType: BalanceSplitType;
}

/** An active payment ("fromUserId paid toUserId"), reduced to what the balance needs. */
export interface BalancePaymentEntry {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export interface BalanceCalculationInput {
  groupId: string;
  memberIds: string[];
  expenses: BalanceExpenseEntry[];
  payments: BalancePaymentEntry[];
}

/** Positive `netCents` means the member is owed money; negative means they owe. */
export interface MemberBalance {
  userId: string;
  netCents: number;
}

export interface BalanceDebt {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export interface BalanceCalculationResult {
  memberBalances: MemberBalance[];
  debts: BalanceDebt[];
  settled: boolean;
}
