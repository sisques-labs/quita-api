import {
  BalanceDebt,
  MemberBalance,
} from '@contexts/balances/domain/interfaces/balance-entries.interface';

/** Read model computed on read; balances persists nothing. */
export class GroupBalanceViewModel {
  constructor(
    readonly groupId: string,
    readonly currency: string,
    readonly settled: boolean,
    readonly memberBalances: MemberBalance[],
    readonly debts: BalanceDebt[],
  ) {}
}
