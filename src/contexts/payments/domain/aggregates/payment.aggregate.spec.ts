import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentCreatedEvent } from '@contexts/payments/domain/events/payment-created/payment-created.event';
import { PaymentDeletedEvent } from '@contexts/payments/domain/events/payment-deleted/payment-deleted.event';
import { PaymentUpdatedEvent } from '@contexts/payments/domain/events/payment-updated/payment-updated.event';
import { PaymentAlreadyDeletedException } from '@contexts/payments/domain/exceptions/payment-already-deleted.exception';
import { PaymentDateInFutureException } from '@contexts/payments/domain/exceptions/payment-date-in-future.exception';
import { PaymentPartiesMustDifferException } from '@contexts/payments/domain/exceptions/payment-parties-must-differ.exception';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const TODAY = '2026-09-30';

const newPayment = () =>
  new PaymentBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withFromUserId('user_a')
    .withToUserId('user_b')
    .withAmountCents(1000)
    .withPaidOn('2026-09-29')
    .withCreatedBy('user_a')
    .withCreatedAt(new Date('2026-09-29T10:00:00Z'));

describe('PaymentAggregate', () => {
  it('defaults to EUR with no note and the creator as last editor', () => {
    const aggregate = newPayment().build();

    expect(aggregate.toPrimitives()).toEqual({
      id: ID,
      groupId: GROUP_ID,
      fromUserId: 'user_a',
      toUserId: 'user_b',
      amountCents: 1000,
      currency: 'EUR',
      paidOn: '2026-09-29',
      note: null,
      createdBy: 'user_a',
      updatedBy: 'user_a',
      deletedAt: null,
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
    });
    expect(aggregate.isDeleted()).toBe(false);
  });

  it('stores a trimmed note and treats a blank note as none', () => {
    expect(
      newPayment().withNote('  Rent share  ').build().toPrimitives().note,
    ).toBe('Rent share');
    expect(newPayment().withNote('   ').build().toPrimitives().note).toBeNull();
  });

  it('rejects invalid amount, parties, date and missing fields', () => {
    expect(() => newPayment().withAmountCents(0).build()).toThrow();
    expect(() => newPayment().withAmountCents(10.5).build()).toThrow();
    expect(() => newPayment().withFromUserId('').build()).toThrow();
    expect(() => newPayment().withToUserId('').build()).toThrow();
    expect(() => newPayment().withPaidOn('nope').build()).toThrow();
    expect(() =>
      new PaymentBuilder()
        .withId(ID)
        .withFromUserId('user_a')
        .withToUserId('user_b')
        .withAmountCents(100)
        .withPaidOn('2026-09-29')
        .withCreatedBy('user_a')
        .build(),
    ).toThrow();
  });

  it('rejects a payment from a member to themselves', () => {
    expect(() => newPayment().withToUserId('user_a').build()).toThrow(
      PaymentPartiesMustDifferException,
    );
  });

  it('emits PaymentCreatedEvent on create()', () => {
    const aggregate = newPayment().build();
    expect(aggregate.getUncommittedEvents()).toHaveLength(0);

    aggregate.create();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(PaymentCreatedEvent);
  });

  describe('update', () => {
    it('changes only the given fields and records the editor', () => {
      const aggregate = newPayment().withNote('Rent').build();

      aggregate.update({ amountCents: 2000 }, 'user_b', TODAY);

      expect(aggregate.toPrimitives()).toMatchObject({
        amountCents: 2000,
        fromUserId: 'user_a',
        toUserId: 'user_b',
        paidOn: '2026-09-29',
        note: 'Rent',
        createdBy: 'user_a',
        updatedBy: 'user_b',
      });
      expect(aggregate.updatedAt.value.getTime()).toBeGreaterThan(
        new Date('2026-09-29T10:00:00Z').getTime(),
      );
      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentUpdatedEvent);
    });

    it('can change every editable field and clear the note', () => {
      const aggregate = newPayment().withNote('Rent').build();

      aggregate.update(
        {
          amountCents: 500,
          fromUserId: 'user_b',
          toUserId: 'user_a',
          paidOn: TODAY,
          note: null,
        },
        'user_b',
        TODAY,
      );

      expect(aggregate.toPrimitives()).toMatchObject({
        amountCents: 500,
        fromUserId: 'user_b',
        toUserId: 'user_a',
        paidOn: TODAY,
        note: null,
      });
    });

    it('rejects a future date and leaves the payment unchanged', () => {
      const aggregate = newPayment().build();

      expect(() =>
        aggregate.update(
          { amountCents: 9999, paidOn: '2026-10-01' },
          'user_b',
          TODAY,
        ),
      ).toThrow(PaymentDateInFutureException);

      expect(aggregate.toPrimitives()).toMatchObject({
        amountCents: 1000,
        paidOn: '2026-09-29',
        updatedBy: 'user_a',
      });
      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });

    it('accepts today as the new date', () => {
      const aggregate = newPayment().build();
      aggregate.update({ paidOn: TODAY }, 'user_b', TODAY);
      expect(aggregate.toPrimitives().paidOn).toBe(TODAY);
    });

    it('rejects changes that would make both parties the same member', () => {
      const aggregate = newPayment().build();

      expect(() =>
        aggregate.update({ toUserId: 'user_a' }, 'user_b', TODAY),
      ).toThrow(PaymentPartiesMustDifferException);
      expect(() =>
        aggregate.update({ fromUserId: 'user_b' }, 'user_b', TODAY),
      ).toThrow(PaymentPartiesMustDifferException);
      expect(aggregate.toPrimitives()).toMatchObject({
        fromUserId: 'user_a',
        toUserId: 'user_b',
      });
      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });

    it('rejects editing a deleted payment', () => {
      const aggregate = newPayment().build();
      aggregate.delete('user_b', new Date('2026-09-30T08:00:00Z'));

      expect(() =>
        aggregate.update({ amountCents: 1 }, 'user_a', TODAY),
      ).toThrow(PaymentAlreadyDeletedException);
      expect(aggregate.toPrimitives().amountCents).toBe(1000);
    });
  });

  describe('delete', () => {
    it('soft-deletes, records who did it and emits PaymentDeletedEvent', () => {
      const aggregate = newPayment().build();
      const at = new Date('2026-09-30T08:00:00Z');

      aggregate.delete('user_b', at);

      expect(aggregate.isDeleted()).toBe(true);
      expect(aggregate.toPrimitives()).toMatchObject({
        deletedAt: at,
        updatedBy: 'user_b',
      });
      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentDeletedEvent);
    });

    it('rejects deleting twice and keeps the first deletion', () => {
      const aggregate = newPayment().build();
      const at = new Date('2026-09-30T08:00:00Z');
      aggregate.delete('user_b', at);

      expect(() =>
        aggregate.delete('user_a', new Date('2026-10-01T08:00:00Z')),
      ).toThrow(PaymentAlreadyDeletedException);
      expect(aggregate.toPrimitives().deletedAt).toEqual(at);
    });

    it('hydrates a deleted payment as deleted', () => {
      const aggregate = newPayment()
        .withDeletedAt(new Date('2026-09-30T08:00:00Z'))
        .build();
      expect(aggregate.isDeleted()).toBe(true);
    });
  });

  it('exposes typed accessors that mirror its state', () => {
    const deletedAt = new Date('2026-09-30T08:00:00Z');
    const aggregate = newPayment()
      .withNote('Rent')
      .withUpdatedBy('user_b')
      .withDeletedAt(deletedAt)
      .build();

    expect(aggregate.groupId.value).toBe(GROUP_ID);
    expect(aggregate.fromUserId.value).toBe('user_a');
    expect(aggregate.toUserId.value).toBe('user_b');
    expect(aggregate.amount.value).toBe(1000);
    expect(aggregate.paidOn.value).toBe('2026-09-29');
    expect(aggregate.note?.value).toBe('Rent');
    expect(aggregate.createdBy.value).toBe('user_a');
    expect(aggregate.updatedBy.value).toBe('user_b');
    expect(aggregate.deletedAt?.value).toEqual(deletedAt);
  });
});
