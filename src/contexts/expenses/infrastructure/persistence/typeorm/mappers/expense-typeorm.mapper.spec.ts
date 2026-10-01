import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseEntity } from '@contexts/expenses/infrastructure/persistence/typeorm/entities/expense.entity';
import { ExpenseTypeormMapper } from '@contexts/expenses/infrastructure/persistence/typeorm/mappers/expense-typeorm.mapper';

const EXPENSE_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const CREATED = new Date('2026-03-01T09:00:00Z');
const UPDATED = new Date('2026-03-02T09:00:00Z');
const DELETED = new Date('2026-03-03T09:00:00Z');

const fullEntity = Object.assign(new ExpenseEntity(), {
  id: EXPENSE_ID,
  groupId: GROUP_ID,
  amountCents: 1234,
  currency: 'EUR',
  paidBy: 'user_a',
  spentOn: '2026-02-28',
  description: 'Groceries',
  category: ExpenseCategory.FOOD,
  splitType: ExpenseSplitType.OTHER_OWES_ALL,
  createdBy: 'user_a',
  updatedBy: 'user_b',
  deletedAt: DELETED,
  createdAt: CREATED,
  updatedAt: UPDATED,
});

const minimalEntity = Object.assign(new ExpenseEntity(), {
  ...fullEntity,
  description: null,
  category: null,
  splitType: ExpenseSplitType.EQUAL,
  updatedBy: 'user_a',
  deletedAt: null,
});

describe('ExpenseTypeormMapper', () => {
  const mapper = new ExpenseTypeormMapper(new ExpenseBuilder());

  it('hydrates the aggregate from a fully populated row', () => {
    expect(mapper.toAggregate(fullEntity).toPrimitives()).toEqual({
      id: EXPENSE_ID,
      groupId: GROUP_ID,
      amountCents: 1234,
      currency: 'EUR',
      paidBy: 'user_a',
      spentOn: '2026-02-28',
      description: 'Groceries',
      category: ExpenseCategory.FOOD,
      splitType: ExpenseSplitType.OTHER_OWES_ALL,
      createdBy: 'user_a',
      updatedBy: 'user_b',
      deletedAt: DELETED,
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });

  it('hydrates a row with nullable columns left empty', () => {
    const primitives = mapper.toAggregate(minimalEntity).toPrimitives();

    expect(primitives.description).toBeNull();
    expect(primitives.category).toBeNull();
    expect(primitives.deletedAt).toBeNull();
    expect(primitives.splitType).toBe(ExpenseSplitType.EQUAL);
  });

  it('builds the read-side view model, keeping the soft-delete flag', () => {
    const viewModel = mapper.toViewModel(fullEntity);

    expect(viewModel.groupId).toBe(GROUP_ID);
    expect(viewModel.amountCents).toBe(1234);
    expect(viewModel.spentOn).toBe('2026-02-28');
    expect(viewModel.category).toBe(ExpenseCategory.FOOD);
    expect(viewModel.updatedBy).toBe('user_b');
    expect(viewModel.deletedAt).toEqual(DELETED);
  });

  it('flattens an aggregate back into a row shape', () => {
    const aggregate = new ExpenseBuilder()
      .withId(EXPENSE_ID)
      .withGroupId(GROUP_ID)
      .withAmountCents(500)
      .withPaidBy('user_b')
      .withSpentOn('2026-01-15')
      .withCreatedBy('user_b')
      .withCreatedAt(CREATED)
      .withUpdatedAt(UPDATED)
      .build();

    expect(mapper.toEntity(aggregate)).toEqual({
      id: EXPENSE_ID,
      groupId: GROUP_ID,
      amountCents: 500,
      currency: 'EUR',
      paidBy: 'user_b',
      spentOn: '2026-01-15',
      description: null,
      category: null,
      splitType: ExpenseSplitType.EQUAL,
      createdBy: 'user_b',
      updatedBy: 'user_b',
      deletedAt: null,
      createdAt: CREATED,
      updatedAt: UPDATED,
    });
  });
});
