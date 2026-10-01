import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const CREATED = new Date('2026-03-01T09:00:00Z');
const UPDATED = new Date('2026-03-02T09:00:00Z');
const DELETED = new Date('2026-03-03T09:00:00Z');

const withRequired = (builder: ExpenseBuilder): ExpenseBuilder =>
  builder
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withAmountCents(500)
    .withPaidBy('user_a')
    .withSpentOn('2026-02-28')
    .withCreatedBy('user_a');

const withOptionals = (builder: ExpenseBuilder): ExpenseBuilder =>
  withRequired(builder)
    .withDescription('Groceries')
    .withCategory(ExpenseCategory.FOOD)
    .withSplitType(ExpenseSplitType.OTHER_OWES_ALL)
    .withUpdatedBy('user_b')
    .withDeletedAt(DELETED)
    .withCreatedAt(CREATED)
    .withUpdatedAt(UPDATED);

describe('ExpenseBuilder state isolation', () => {
  let builder: ExpenseBuilder;

  beforeEach(() => {
    builder = new ExpenseBuilder();
  });

  it('does not leak optional fields from a previous build()', () => {
    withOptionals(builder).build();

    const primitives = withRequired(builder).build().toPrimitives();

    expect(primitives.description).toBeNull();
    expect(primitives.category).toBeNull();
    expect(primitives.splitType).toBe(ExpenseSplitType.EQUAL);
    expect(primitives.updatedBy).toBe('user_a');
    expect(primitives.deletedAt).toBeNull();
    expect(primitives.createdAt).not.toEqual(CREATED);
    expect(primitives.updatedAt).not.toEqual(UPDATED);
  });

  it('does not leak optional fields from a previous buildViewModel()', () => {
    withOptionals(builder).buildViewModel();

    const viewModel = withRequired(builder).buildViewModel();

    expect(viewModel.description).toBeNull();
    expect(viewModel.category).toBeNull();
    expect(viewModel.splitType).toBe(ExpenseSplitType.EQUAL);
    expect(viewModel.deletedAt).toBeNull();
  });

  it('forgets the id after build()', () => {
    withOptionals(builder).build();

    expect(() =>
      builder
        .withGroupId(GROUP_ID)
        .withAmountCents(500)
        .withPaidBy('user_a')
        .withSpentOn('2026-02-28')
        .withCreatedBy('user_a')
        .build(),
    ).toThrow(FieldIsRequiredException);
  });

  it('is not contaminated by a build() that failed validation', () => {
    expect(() =>
      builder
        .withGroupId(GROUP_ID)
        .withDescription('Leaked')
        .withCategory(ExpenseCategory.FOOD)
        .withDeletedAt(DELETED)
        .withCreatedAt(CREATED)
        .build(),
    ).toThrow(FieldIsRequiredException);

    const primitives = withRequired(builder).build().toPrimitives();

    expect(primitives.description).toBeNull();
    expect(primitives.category).toBeNull();
    expect(primitives.deletedAt).toBeNull();
    expect(primitives.createdAt).not.toEqual(CREATED);
  });

  it('is not contaminated by a buildViewModel() that failed validation', () => {
    expect(() =>
      builder
        .withGroupId(GROUP_ID)
        .withDescription('Leaked')
        .withDeletedAt(DELETED)
        .buildViewModel(),
    ).toThrow(FieldIsRequiredException);

    const viewModel = withRequired(builder).buildViewModel();

    expect(viewModel.description).toBeNull();
    expect(viewModel.deletedAt).toBeNull();
  });
});
