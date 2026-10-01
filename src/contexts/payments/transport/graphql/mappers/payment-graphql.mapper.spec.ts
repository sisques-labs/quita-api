import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentGraphQLMapper } from '@contexts/payments/transport/graphql/mappers/payment-graphql.mapper';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

const ID_1 = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const ID_2 = '1c7f7c1f-7f1f-4e9b-8e1b-8e7f3f4b2d22';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const CREATED = new Date('2026-03-01T09:00:00Z');
const DELETED = new Date('2026-03-03T09:00:00Z');

const viewModel = (id: string, deletedAt: Date | null) =>
  new PaymentBuilder()
    .withId(id)
    .withGroupId(GROUP_ID)
    .withFromUserId('user_a')
    .withToUserId('user_b')
    .withAmountCents(1234)
    .withPaidOn('2026-02-28')
    .withNote('Rent')
    .withCreatedBy('user_a')
    .withUpdatedBy('user_b')
    .withCreatedAt(CREATED)
    .withUpdatedAt(CREATED)
    .withDeletedAt(deletedAt)
    .buildViewModel();

describe('PaymentGraphQLMapper', () => {
  const mapper = new PaymentGraphQLMapper();

  it('maps a view model to a GraphQL object, flagging a deleted row', () => {
    expect(mapper.toObject(viewModel(ID_1, DELETED))).toEqual({
      id: ID_1,
      groupId: GROUP_ID,
      fromUserId: 'user_a',
      toUserId: 'user_b',
      amountCents: 1234,
      currency: 'EUR',
      paidOn: '2026-02-28',
      note: 'Rent',
      createdBy: 'user_a',
      updatedBy: 'user_b',
      createdAt: CREATED,
      updatedAt: CREATED,
      deletedAt: DELETED,
    });
    expect(mapper.toObject(viewModel(ID_1, null)).deletedAt).toBeNull();
  });

  it('maps a page, keeping order and paging metadata', () => {
    const page = mapper.toPaginated(
      new PaginatedResult(
        [viewModel(ID_2, null), viewModel(ID_1, DELETED)],
        12,
        2,
        5,
      ),
    );

    expect(page.items.map((item) => item.id)).toEqual([ID_2, ID_1]);
    expect(page.total).toBe(12);
    expect(page.page).toBe(2);
    expect(page.perPage).toBe(5);
    expect(page.totalPages).toBe(3);
  });
});
