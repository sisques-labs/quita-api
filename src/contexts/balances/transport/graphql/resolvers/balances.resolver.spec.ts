import { GroupBalanceQuery } from '@contexts/balances/application/queries/group-balance/group-balance.query';
import { BalanceAccessDeniedException } from '@contexts/balances/domain/exceptions/balance-access-denied.exception';
import { GroupBalanceViewModel } from '@contexts/balances/domain/view-models/group-balance.view-model';
import { GroupBalanceGraphQLMapper } from '@contexts/balances/transport/graphql/mappers/group-balance-graphql.mapper';
import { BalancesResolver } from '@contexts/balances/transport/graphql/resolvers/balances.resolver';
import { QueryBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('BalancesResolver', () => {
  let queryBus: Mocked<QueryBus>;
  let resolver: BalancesResolver;

  beforeEach(() => {
    queryBus = { execute: vi.fn() } as unknown as Mocked<QueryBus>;
    resolver = new BalancesResolver(queryBus, new GroupBalanceGraphQLMapper());
  });

  it('reads the balance on behalf of the authenticated user, never of input', async () => {
    queryBus.execute.mockResolvedValue(
      new GroupBalanceViewModel({
        groupId: GROUP_ID,
        currency: 'EUR',
        settled: false,
        memberBalances: [
          { userId: 'user_a', netCents: 500 },
          { userId: 'user_b', netCents: -500 },
        ],
        debts: [{ fromUserId: 'user_b', toUserId: 'user_a', amountCents: 500 }],
      }),
    );

    const result = await resolver.balance(GROUP_ID, { userId: 'user_b' });

    const query = queryBus.execute.mock.calls[0][0] as GroupBalanceQuery;
    expect(query).toBeInstanceOf(GroupBalanceQuery);
    expect(query.groupId.value).toBe(GROUP_ID);
    expect(query.requesterId.value).toBe('user_b');
    expect(result.debts).toEqual([
      { fromUserId: 'user_b', toUserId: 'user_a', amountCents: 500 },
    ]);
  });

  it('propagates the access denial for a non-member', async () => {
    queryBus.execute.mockRejectedValue(
      new BalanceAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      resolver.balance(GROUP_ID, { userId: 'stranger' }),
    ).rejects.toThrow(BalanceAccessDeniedException);
  });
});
