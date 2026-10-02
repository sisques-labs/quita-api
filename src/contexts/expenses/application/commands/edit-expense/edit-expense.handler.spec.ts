import { EditExpenseCommand } from '@contexts/expenses/application/commands/edit-expense/edit-expense.command';
import { EditExpenseHandler } from '@contexts/expenses/application/commands/edit-expense/edit-expense.handler';
import { GroupMembersPort } from '@contexts/expenses/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertExpenseExistsService } from '@contexts/expenses/application/services/write/assert-expense-exists/assert-expense-exists.service';
import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseAccessDeniedException } from '@contexts/expenses/domain/exceptions/expense-access-denied.exception';
import { ExpenseAlreadyDeletedException } from '@contexts/expenses/domain/exceptions/expense-already-deleted.exception';
import { ExpenseDateInFutureException } from '@contexts/expenses/domain/exceptions/expense-date-in-future.exception';
import { ExpenseNotFoundException } from '@contexts/expenses/domain/exceptions/expense-not-found.exception';
import { ExpensePayerNotMemberException } from '@contexts/expenses/domain/exceptions/expense-payer-not-member.exception';
import { IExpenseWriteRepository } from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { ClockPort } from '@core/clock/domain/clock.port';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const TODAY = '2026-09-30';

const command = (
  changes: Record<string, unknown> = {},
  requesterId = 'user_b',
) =>
  new EditExpenseCommand({
    expenseId: ID,
    groupId: GROUP_ID,
    requesterId,
    ...changes,
  });

const activeExpense = () =>
  new ExpenseBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withAmountCents(1250)
    .withPaidBy('user_a')
    .withSpentOn('2026-09-29')
    .withCreatedBy('user_a')
    .build();

describe('EditExpenseHandler', () => {
  let repository: Mocked<IExpenseWriteRepository>;
  let membersPort: Mocked<GroupMembersPort>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let assertExists: Mocked<AssertExpenseExistsService>;
  let clock: Mocked<ClockPort>;
  let eventBus: Mocked<EventBus>;
  let handler: EditExpenseHandler;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      save: vi.fn().mockImplementation(async (e: ExpenseAggregate) => e),
      delete: vi.fn(),
    };
    membersPort = {
      isMember: vi.fn().mockResolvedValue(true),
      listMemberIds: vi.fn(),
    };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    assertExists = {
      execute: vi.fn().mockResolvedValue(activeExpense()),
    } as unknown as Mocked<AssertExpenseExistsService>;
    clock = { today: vi.fn().mockReturnValue(TODAY) };
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new EditExpenseHandler(
      repository,
      membersPort,
      assertMember,
      assertExists,
      clock,
      eventBus,
    );
  });

  it('lets another member change the amount and records them as editor', async () => {
    await handler.execute(command({ amountCents: 2000 }));

    expect(assertMember.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: GROUP_ID }),
      expect.objectContaining({ value: 'user_b' }),
    );
    expect(assertExists.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: ID }),
      expect.objectContaining({ value: GROUP_ID }),
    );
    const saved = repository.save.mock.calls[0][0];
    expect(saved.toPrimitives()).toMatchObject({
      amountCents: 2000,
      paidBy: 'user_a',
      createdBy: 'user_a',
      updatedBy: 'user_b',
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('changes category, description and split, and can clear them', async () => {
    await handler.execute(
      command({
        category: 'travel',
        description: 'Train',
        splitType: 'OTHER_OWES_ALL',
      }),
    );
    expect(repository.save.mock.calls[0][0].toPrimitives()).toMatchObject({
      category: 'travel',
      description: 'Train',
      splitType: 'OTHER_OWES_ALL',
    });

    await handler.execute(command({ category: null, description: null }));
    expect(repository.save.mock.calls[1][0].toPrimitives()).toMatchObject({
      category: null,
      description: null,
    });
  });

  it('rejects an invalid category when the command is built', () => {
    expect(() => command({ category: 'pets' })).toThrow();
  });

  it('rejects a future date from the clock and does not save', async () => {
    await expect(
      handler.execute(command({ spentOn: '2026-10-01' })),
    ).rejects.toThrow(ExpenseDateInFutureException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('accepts today as the new date', async () => {
    await handler.execute(command({ spentOn: TODAY }));
    expect(repository.save.mock.calls[0][0].toPrimitives().spentOn).toBe(TODAY);
  });

  it('rejects editing a deleted expense', async () => {
    const deleted = activeExpense();
    deleted.delete('user_a', new Date('2026-09-30T08:00:00Z'));
    assertExists.execute.mockResolvedValue(deleted);

    await expect(handler.execute(command({ amountCents: 1 }))).rejects.toThrow(
      ExpenseAlreadyDeletedException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('checks the new payer is a member only when the payer changes', async () => {
    await handler.execute(command({ amountCents: 300 }));
    expect(membersPort.isMember).not.toHaveBeenCalled();

    await handler.execute(command({ paidBy: 'user_b' }));
    expect(membersPort.isMember).toHaveBeenCalledWith(GROUP_ID, 'user_b');
    expect(repository.save.mock.calls[1][0].toPrimitives().paidBy).toBe(
      'user_b',
    );
  });

  it('rejects a new payer who is not a member', async () => {
    membersPort.isMember.mockResolvedValue(false);

    await expect(
      handler.execute(command({ paidBy: 'stranger' })),
    ).rejects.toThrow(ExpensePayerNotMemberException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('denies a non-member without loading the expense', async () => {
    assertMember.execute.mockRejectedValue(
      new ExpenseAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(command({ amountCents: 5 }, 'stranger')),
    ).rejects.toThrow(ExpenseAccessDeniedException);
    expect(assertExists.execute).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates not found for an unknown expense', async () => {
    assertExists.execute.mockRejectedValue(new ExpenseNotFoundException(ID));

    await expect(handler.execute(command({ amountCents: 5 }))).rejects.toThrow(
      ExpenseNotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
