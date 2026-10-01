import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseCreatedEvent } from '@contexts/expenses/domain/events/expense-created/expense-created.event';
import { ExpenseDeletedEvent } from '@contexts/expenses/domain/events/expense-deleted/expense-deleted.event';
import { ExpenseUpdatedEvent } from '@contexts/expenses/domain/events/expense-updated/expense-updated.event';
import { ExpenseAlreadyDeletedException } from '@contexts/expenses/domain/exceptions/expense-already-deleted.exception';
import { ExpenseDateInFutureException } from '@contexts/expenses/domain/exceptions/expense-date-in-future.exception';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const TODAY = '2026-09-30';

const newExpense = () =>
  new ExpenseBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withAmountCents(1250)
    .withPaidBy('user_a')
    .withSpentOn('2026-09-29')
    .withCreatedBy('user_a')
    .withCreatedAt(new Date('2026-09-29T10:00:00Z'));

describe('ExpenseAggregate', () => {
  it('defaults to an EQUAL split in EUR with no description or category', () => {
    const aggregate = newExpense().build();

    expect(aggregate.toPrimitives()).toEqual({
      id: ID,
      groupId: GROUP_ID,
      amountCents: 1250,
      currency: 'EUR',
      paidBy: 'user_a',
      spentOn: '2026-09-29',
      description: null,
      category: null,
      splitType: ExpenseSplitType.EQUAL,
      createdBy: 'user_a',
      updatedBy: 'user_a',
      deletedAt: null,
      createdAt: new Date('2026-09-29T10:00:00Z'),
      updatedAt: new Date('2026-09-29T10:00:00Z'),
    });
    expect(aggregate.isDeleted()).toBe(false);
  });

  it('stores an optional category, description and split', () => {
    const aggregate = newExpense()
      .withCategory(ExpenseCategory.FOOD)
      .withDescription('  Dinner  ')
      .withSplitType(ExpenseSplitType.OTHER_OWES_ALL)
      .build();

    expect(aggregate.toPrimitives()).toMatchObject({
      category: 'food',
      description: 'Dinner',
      splitType: 'OTHER_OWES_ALL',
    });
  });

  it('treats a blank description as no description', () => {
    expect(
      newExpense().withDescription('   ').build().toPrimitives().description,
    ).toBeNull();
  });

  it('rejects invalid amount, payer, date, category and split', () => {
    expect(() => newExpense().withAmountCents(0).build()).toThrow();
    expect(() => newExpense().withAmountCents(10.5).build()).toThrow();
    expect(() => newExpense().withPaidBy('').build()).toThrow();
    expect(() => newExpense().withSpentOn('nope').build()).toThrow();
    expect(() => newExpense().withCategory('pets').build()).toThrow();
    expect(() => newExpense().withSplitType('PERCENT').build()).toThrow();
    expect(() =>
      new ExpenseBuilder()
        .withId(ID)
        .withAmountCents(100)
        .withPaidBy('user_a')
        .withSpentOn('2026-09-29')
        .withCreatedBy('user_a')
        .build(),
    ).toThrow();
  });

  it('emits ExpenseCreatedEvent on create()', () => {
    const aggregate = newExpense().build();
    expect(aggregate.getUncommittedEvents()).toHaveLength(0);

    aggregate.create();

    const events = aggregate.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(ExpenseCreatedEvent);
  });

  describe('update', () => {
    it('changes only the given fields and records the editor', () => {
      const aggregate = newExpense().withCategory(ExpenseCategory.HOME).build();

      aggregate.update({ amountCents: 2000 }, 'user_b', TODAY);

      expect(aggregate.toPrimitives()).toMatchObject({
        amountCents: 2000,
        paidBy: 'user_a',
        spentOn: '2026-09-29',
        category: 'home',
        createdBy: 'user_a',
        updatedBy: 'user_b',
      });
      expect(aggregate.updatedAt.value.getTime()).toBeGreaterThan(
        new Date('2026-09-29T10:00:00Z').getTime(),
      );
      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ExpenseUpdatedEvent);
    });

    it('can change every editable field, and clear description and category', () => {
      const aggregate = newExpense()
        .withCategory(ExpenseCategory.HOME)
        .withDescription('Rent')
        .build();

      aggregate.update(
        {
          amountCents: 500,
          paidBy: 'user_b',
          spentOn: TODAY,
          splitType: ExpenseSplitType.OTHER_OWES_ALL,
          description: null,
          category: null,
        },
        'user_b',
        TODAY,
      );

      expect(aggregate.toPrimitives()).toMatchObject({
        amountCents: 500,
        paidBy: 'user_b',
        spentOn: TODAY,
        splitType: 'OTHER_OWES_ALL',
        description: null,
        category: null,
      });
    });

    it('accepts a category change from the fixed list and rejects others', () => {
      const aggregate = newExpense().build();

      aggregate.update({ category: ExpenseCategory.TRAVEL }, 'user_b', TODAY);
      expect(aggregate.toPrimitives().category).toBe('travel');

      expect(() =>
        aggregate.update(
          { category: 'pets' as ExpenseCategory },
          'user_b',
          TODAY,
        ),
      ).toThrow();
      expect(aggregate.toPrimitives().category).toBe('travel');
    });

    it('rejects a future date and leaves the expense unchanged', () => {
      const aggregate = newExpense().build();

      expect(() =>
        aggregate.update(
          { amountCents: 9999, spentOn: '2026-10-01' },
          'user_b',
          TODAY,
        ),
      ).toThrow(ExpenseDateInFutureException);

      expect(aggregate.toPrimitives()).toMatchObject({
        amountCents: 1250,
        spentOn: '2026-09-29',
        updatedBy: 'user_a',
      });
      expect(aggregate.getUncommittedEvents()).toHaveLength(0);
    });

    it('accepts today as the new date', () => {
      const aggregate = newExpense().build();
      aggregate.update({ spentOn: TODAY }, 'user_b', TODAY);
      expect(aggregate.toPrimitives().spentOn).toBe(TODAY);
    });

    it('rejects editing a deleted expense', () => {
      const aggregate = newExpense().build();
      aggregate.delete('user_b', new Date('2026-09-30T08:00:00Z'));

      expect(() =>
        aggregate.update({ amountCents: 1 }, 'user_a', TODAY),
      ).toThrow(ExpenseAlreadyDeletedException);
      expect(aggregate.toPrimitives().amountCents).toBe(1250);
    });
  });

  describe('delete', () => {
    it('soft-deletes, records who did it and emits ExpenseDeletedEvent', () => {
      const aggregate = newExpense().build();
      const at = new Date('2026-09-30T08:00:00Z');

      aggregate.delete('user_b', at);

      expect(aggregate.isDeleted()).toBe(true);
      expect(aggregate.toPrimitives()).toMatchObject({
        deletedAt: at,
        updatedBy: 'user_b',
      });
      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(ExpenseDeletedEvent);
    });

    it('rejects deleting twice and keeps the first deletion', () => {
      const aggregate = newExpense().build();
      const at = new Date('2026-09-30T08:00:00Z');
      aggregate.delete('user_b', at);

      expect(() =>
        aggregate.delete('user_a', new Date('2026-10-01T08:00:00Z')),
      ).toThrow(ExpenseAlreadyDeletedException);
      expect(aggregate.toPrimitives().deletedAt).toEqual(at);
    });

    it('hydrates a deleted expense as deleted', () => {
      const aggregate = newExpense()
        .withDeletedAt(new Date('2026-09-30T08:00:00Z'))
        .build();
      expect(aggregate.isDeleted()).toBe(true);
    });
  });

  it('exposes typed accessors that mirror its state', () => {
    const deletedAt = new Date('2026-09-30T08:00:00Z');
    const aggregate = newExpense()
      .withCategory(ExpenseCategory.TRAVEL)
      .withDescription('Train')
      .withSplitType(ExpenseSplitType.OTHER_OWES_ALL)
      .withUpdatedBy('user_b')
      .withDeletedAt(deletedAt)
      .build();

    expect(aggregate.groupId.value).toBe(GROUP_ID);
    expect(aggregate.amount.value).toBe(1250);
    expect(aggregate.paidBy.value).toBe('user_a');
    expect(aggregate.spentOn.value).toBe('2026-09-29');
    expect(aggregate.description?.value).toBe('Train');
    expect(aggregate.category?.value).toBe('travel');
    expect(aggregate.splitType.value).toBe('OTHER_OWES_ALL');
    expect(aggregate.createdBy.value).toBe('user_a');
    expect(aggregate.updatedBy.value).toBe('user_b');
    expect(aggregate.deletedAt?.value).toEqual(deletedAt);
  });
});
