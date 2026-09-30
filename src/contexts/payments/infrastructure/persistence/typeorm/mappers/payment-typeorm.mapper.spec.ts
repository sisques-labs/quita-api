import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentEntity } from '@contexts/payments/infrastructure/persistence/typeorm/entities/payment.entity';
import { PaymentTypeormMapper } from '@contexts/payments/infrastructure/persistence/typeorm/mappers/payment-typeorm.mapper';

const PAYMENT_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const CREATED = new Date('2026-03-01T09:00:00Z');
const UPDATED = new Date('2026-03-02T09:00:00Z');
const DELETED = new Date('2026-03-03T09:00:00Z');

const fullEntity = Object.assign(new PaymentEntity(), {
  id: PAYMENT_ID,
  groupId: GROUP_ID,
  fromUserId: 'user_a',
  toUserId: 'user_b',
  amountCents: 1234,
  currency: 'EUR',
  paidOn: '2026-02-28',
  note: 'Rent',
  createdBy: 'user_a',
  updatedBy: 'user_b',
  deletedAt: DELETED,
  createdAt: CREATED,
  updatedAt: UPDATED,
});

describe('PaymentTypeormMapper', () => {
  const mapper = new PaymentTypeormMapper();

  it('hydrates the aggregate from a fully populated row', () => {
    expect(mapper.toAggregate(fullEntity).toPrimitives()).toEqual({
      id: PAYMENT_ID,
      groupId: GROUP_ID,
      fromUserId: 'user_a',
      toUserId: 'user_b',
      amountCents: 1234,
      currency: 'EUR',
      paidOn: '2026-02-28',
      note: 'Rent',
      createdBy: 'user_a',
      updatedBy: 'user_b',
      deletedAt: DELETED,
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });

  it('hydrates a row with nullable columns left empty', () => {
    const primitives = mapper
      .toAggregate(
        Object.assign(new PaymentEntity(), {
          ...fullEntity,
          note: null,
          deletedAt: null,
        }),
      )
      .toPrimitives();

    expect(primitives.note).toBeNull();
    expect(primitives.deletedAt).toBeNull();
  });

  it('builds the read-side view model, keeping the soft-delete flag', () => {
    const viewModel = mapper.toViewModel(fullEntity);

    expect(viewModel.fromUserId).toBe('user_a');
    expect(viewModel.toUserId).toBe('user_b');
    expect(viewModel.paidOn).toBe('2026-02-28');
    expect(viewModel.updatedBy).toBe('user_b');
    expect(viewModel.deletedAt).toEqual(DELETED);
  });

  it('flattens an aggregate back into a row shape', () => {
    const aggregate = new PaymentBuilder()
      .withId(PAYMENT_ID)
      .withGroupId(GROUP_ID)
      .withFromUserId('user_b')
      .withToUserId('user_a')
      .withAmountCents(500)
      .withPaidOn('2026-01-15')
      .withCreatedBy('user_b')
      .withCreatedAt(CREATED)
      .withUpdatedAt(UPDATED)
      .build();

    expect(mapper.toEntity(aggregate)).toEqual({
      id: PAYMENT_ID,
      groupId: GROUP_ID,
      fromUserId: 'user_b',
      toUserId: 'user_a',
      amountCents: 500,
      currency: 'EUR',
      paidOn: '2026-01-15',
      note: null,
      createdBy: 'user_b',
      updatedBy: 'user_b',
      deletedAt: null,
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });
});
