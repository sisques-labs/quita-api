import { AssertExpenseExistsService } from '@contexts/expenses/application/services/write/assert-expense-exists/assert-expense-exists.service';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseNotFoundException } from '@contexts/expenses/domain/exceptions/expense-not-found.exception';
import { ExpenseWriteRepository } from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Mocked } from 'vitest';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const OTHER_GROUP_ID = '9a7c2d10-1b2c-4d3e-8f40-5a6b7c8d9e00';

const expense = () =>
  new ExpenseBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withAmountCents(500)
    .withPaidBy('user_a')
    .withSpentOn('2026-09-01')
    .withCreatedBy('user_a')
    .build();

describe('AssertExpenseExistsService', () => {
  let repository: Mocked<ExpenseWriteRepository>;
  let service: AssertExpenseExistsService;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
    };
    service = new AssertExpenseExistsService(repository);
  });

  it('returns the expense when it belongs to the group', async () => {
    const aggregate = expense();
    repository.findById.mockResolvedValue(aggregate);

    await expect(
      service.execute(new UuidValueObject(ID), new UuidValueObject(GROUP_ID)),
    ).resolves.toBe(aggregate);
    expect(repository.findById).toHaveBeenCalledWith(ID);
  });

  it('reports a missing expense', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.execute(new UuidValueObject(ID), new UuidValueObject(GROUP_ID)),
    ).rejects.toThrow(ExpenseNotFoundException);
  });

  it('reports an expense of another group as not found (no cross-group leak)', async () => {
    repository.findById.mockResolvedValue(expense());

    await expect(
      service.execute(
        new UuidValueObject(ID),
        new UuidValueObject(OTHER_GROUP_ID),
      ),
    ).rejects.toThrow(ExpenseNotFoundException);
  });
});
