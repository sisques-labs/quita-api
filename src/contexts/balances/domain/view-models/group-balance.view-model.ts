import {
  BalanceDebt,
  MemberBalance,
} from '@contexts/balances/domain/interfaces/balance-entries.interface';
import { IGroupBalancePrimitives } from '@contexts/balances/domain/primitives/group-balance.primitives';

/** Read model computed on read; balances persists nothing. */
export class GroupBalanceViewModel {
  readonly groupId: string;
  readonly currency: string;
  readonly settled: boolean;
  readonly memberBalances: MemberBalance[];
  readonly debts: BalanceDebt[];

  constructor(props: IGroupBalancePrimitives) {
    this.groupId = props.groupId;
    this.currency = props.currency;
    this.settled = props.settled;
    this.memberBalances = props.memberBalances;
    this.debts = props.debts;
  }
}
