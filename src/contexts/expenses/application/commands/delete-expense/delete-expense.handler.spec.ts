import { DeleteExpenseCommand } from '@contexts/expenses/application/commands/delete-expense/delete-expense.command';
import { DeleteExpenseHandler } from '@contexts/expenses/application/commands/delete-expense/delete-expense.handler';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertExpenseExistsService } from '@contexts/expenses/application/services/write/assert-expense-exists/assert-expense-exists.service';
import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseAccessDeniedException } from '@contexts/expenses/domain/exceptions/expense-access-denied.exception';
import { ExpenseAlreadyDeletedException } from '@contexts/expenses/domain/exceptions/expense-already-deleted.exception';
import { ExpenseNotFoundException } from '@contexts/expenses/domain/exceptions/expense-not-found.exception';
import { IExpenseWriteRepository } from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

const command = (requesterId = 'user_b') =>
  new DeleteExpenseCommand({ expenseId: ID, groupId: GROUP_ID, requesterId });

const activeExpense = () =>
  new ExpenseBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withAmountCents(1250)
    .withPaidBy('user_a')
    .withSpentOn('2026-09-29')
    .withCreatedBy('user_a')
    .build();

describe('DeleteExpenseHandler', () => {
  let repository: Mocked<IExpenseWriteRepository>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let assertExists: Mocked<AssertExpenseExistsService>;
  let eventBus: Mocked<EventBus>;
  let handler: DeleteExpenseHandler;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      save: vi.fn().mockImplementation(async (e: ExpenseAggregate) => e),
      delete: vi.fn(),
    };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    assertExists = {
      execute: vi.fn().mockResolvedValue(activeExpense()),
    } as unknown as Mocked<AssertExpenseExistsService>;
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new DeleteExpenseHandler(
      repository,
      assertMember,
      assertExists,
      eventBus,
    );
  });

  it('lets another member soft-delete the expense, keeping the row', async () => {
    await handler.execute(command('user_b'));

    expect(assertMember.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: GROUP_ID }),
      expect.objectContaining({ value: 'user_b' }),
    );
    expect(repository.delete).not.toHaveBeenCalled();
    const saved = repository.save.mock.calls[0][0].toPrimitives();
    expect(saved.deletedAt).toBeInstanceOf(Date);
    expect(saved.updatedBy).toBe('user_b');
    expect(saved.createdBy).toBe('user_a');
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('rejects deleting an already deleted expense', async () => {
    const deleted = activeExpense();
    deleted.delete('user_a', new Date('2026-09-30T08:00:00Z'));
    assertExists.execute.mockResolvedValue(deleted);

    await expect(handler.execute(command())).rejects.toThrow(
      ExpenseAlreadyDeletedException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('denies a non-member without loading the expense', async () => {
    assertMember.execute.mockRejectedValue(
      new ExpenseAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(handler.execute(command('stranger'))).rejects.toThrow(
      ExpenseAccessDeniedException,
    );
    expect(assertExists.execute).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates not found', async () => {
    assertExists.execute.mockRejectedValue(new ExpenseNotFoundException(ID));

    await expect(handler.execute(command())).rejects.toThrow(
      ExpenseNotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
