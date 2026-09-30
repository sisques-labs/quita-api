import { GroupBalanceQuery } from '@contexts/balances/application/queries/group-balance/group-balance.query';
import { GroupBalanceViewModel } from '@contexts/balances/domain/view-models/group-balance.view-model';
import { GroupBalanceGraphQLMapper } from '@contexts/balances/transport/graphql/mappers/group-balance-graphql.mapper';
import { GroupBalanceObject } from '@contexts/balances/transport/graphql/objects/group-balance.object';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';

@Resolver(() => GroupBalanceObject)
@UseGuards(ClerkAuthGuard)
export class BalancesResolver {
  private readonly logger = new Logger(BalancesResolver.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: GroupBalanceGraphQLMapper,
  ) {}

  @Query(() => GroupBalanceObject, {
    name: 'balance',
    description:
      'Who owes whom in a group, computed from its active expenses and payments. Members only.',
  })
  async balance(
    @Args('groupId', { type: () => ID }) groupId: string,
    @AuthUser() user: AuthUser,
  ): Promise<GroupBalanceObject> {
    this.logger.log(`balance group=${groupId} requester=${user.userId}`);

    const balance = await this.queryBus.execute<
      GroupBalanceQuery,
      GroupBalanceViewModel
    >(new GroupBalanceQuery({ groupId, requesterId: user.userId }));

    return this.mapper.toObject(balance);
  }
}
