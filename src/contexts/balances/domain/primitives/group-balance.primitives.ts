import {
  BalanceDebt,
  MemberBalance,
} from '@contexts/balances/domain/interfaces/balance-entries.interface';

/** Primitive props of a group balance read model. */
export type GroupBalancePrimitives = {
  groupId: string;
  currency: string;
  settled: boolean;
  memberBalances: MemberBalance[];
  debts: BalanceDebt[];
};
