import { GroupBalanceViewModel } from '@contexts/balances/domain/view-models/group-balance.view-model';
import { GroupBalanceObject } from '@contexts/balances/transport/graphql/objects/group-balance.object';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupBalanceGraphQLMapper {
  toObject(viewModel: GroupBalanceViewModel): GroupBalanceObject {
    return {
      groupId: viewModel.groupId,
      currency: viewModel.currency,
      settled: viewModel.settled,
      memberBalances: viewModel.memberBalances.map((member) => ({
        userId: member.userId,
        netCents: member.netCents,
      })),
      debts: viewModel.debts.map((debt) => ({
        fromUserId: debt.fromUserId,
        toUserId: debt.toUserId,
        amountCents: debt.amountCents,
      })),
    };
  }
}
