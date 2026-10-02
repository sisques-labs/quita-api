import { GroupBalanceViewModel } from '@contexts/balances/domain/view-models/group-balance.view-model';
import { GroupBalanceResponseDto } from '@contexts/balances/transport/graphql/dtos/responses/group-balance.response.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GroupBalanceGraphQLMapper {
  toResponseDtoFromViewModel(
    viewModel: GroupBalanceViewModel,
  ): GroupBalanceResponseDto {
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
