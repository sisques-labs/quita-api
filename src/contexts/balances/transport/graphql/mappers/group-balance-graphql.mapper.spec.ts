import { GroupBalanceViewModel } from '@contexts/balances/domain/view-models/group-balance.view-model';
import { GroupBalanceGraphQLMapper } from '@contexts/balances/transport/graphql/mappers/group-balance-graphql.mapper';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('GroupBalanceGraphQLMapper', () => {
  const mapper = new GroupBalanceGraphQLMapper();

  it('maps a balance with a debt', () => {
    const viewModel = new GroupBalanceViewModel({
      groupId: GROUP_ID,
      currency: 'EUR',
      settled: false,
      memberBalances: [
        { userId: 'user_a', netCents: 500 },
        { userId: 'user_b', netCents: -500 },
      ],
      debts: [{ fromUserId: 'user_b', toUserId: 'user_a', amountCents: 500 }],
    });

    expect(mapper.toObject(viewModel)).toEqual({
      groupId: GROUP_ID,
      currency: 'EUR',
      settled: false,
      memberBalances: [
        { userId: 'user_a', netCents: 500 },
        { userId: 'user_b', netCents: -500 },
      ],
      debts: [{ fromUserId: 'user_b', toUserId: 'user_a', amountCents: 500 }],
    });
  });

  it('maps a settled balance without debts', () => {
    const viewModel = new GroupBalanceViewModel({
      groupId: GROUP_ID,
      currency: 'EUR',
      settled: true,
      memberBalances: [
        { userId: 'user_a', netCents: 0 },
        { userId: 'user_b', netCents: 0 },
      ],
      debts: [],
    });

    const object = mapper.toObject(viewModel);

    expect(object.settled).toBe(true);
    expect(object.debts).toEqual([]);
    expect(object.memberBalances).toHaveLength(2);
  });
});
