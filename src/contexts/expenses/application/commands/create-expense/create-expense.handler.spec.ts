import { CreateExpenseCommand } from '@contexts/expenses/application/commands/create-expense/create-expense.command';
import { CreateExpenseHandler } from '@contexts/expenses/application/commands/create-expense/create-expense.handler';
import { GroupMembersPort } from '@contexts/expenses/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member.service';
import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpenseAccessDeniedException } from '@contexts/expenses/domain/exceptions/expense-access-denied.exception';
import { ExpenseDateInFutureException } from '@contexts/expenses/domain/exceptions/expense-date-in-future.exception';
import { ExpensePayerNotMemberException } from '@contexts/expenses/domain/exceptions/expense-payer-not-member.exception';
import { GroupNotReadyException } from '@contexts/expenses/domain/exceptions/group-not-ready.exception';
import { ExpenseWriteRepository } from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { ClockPort } from '@core/clock/domain/clock.port';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const TODAY = '2026-09-30';

const input = (overrides: Record<string, unknown> = {}) => ({
  groupId: GROUP_ID,
  requesterId: 'user_a',
  amountCents: 1250,
  paidBy: 'user_a',
  spentOn: TODAY,
  ...overrides,
});

describe('CreateExpenseHandler', () => {
  let repository: Mocked<ExpenseWriteRepository>;
  let membersPort: Mocked<GroupMembersPort>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let clock: Mocked<ClockPort>;
  let eventBus: Mocked<EventBus>;
  let handler: CreateExpenseHandler;

  const savedExpense = (): ExpenseAggregate =>
    repository.save.mock.calls[0][0] as ExpenseAggregate;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      save: vi.fn().mockImplementation(async (e: ExpenseAggregate) => e),
      delete: vi.fn(),
    };
    membersPort = {
      isMember: vi.fn(),
      listMemberIds: vi.fn().mockResolvedValue(['user_a', 'user_b']),
    };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    clock = { today: vi.fn().mockReturnValue(TODAY) };
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new CreateExpenseHandler(
      repository,
      membersPort,
      assertMember,
      clock,
      new ExpenseBuilder(),
      eventBus,
    );
  });

  it('creates an EQUAL expense without category by default and publishes its event', async () => {
    const id = await handler.execute(new CreateExpenseCommand(input()));

    expect(assertMember.execute).toHaveBeenCalledWith(GROUP_ID, 'user_a');
    expect(savedExpense().toPrimitives()).toMatchObject({
      id,
      groupId: GROUP_ID,
      amountCents: 1250,
      currency: 'EUR',
      paidBy: 'user_a',
      spentOn: TODAY,
      splitType: 'EQUAL',
      category: null,
      description: null,
      createdBy: 'user_a',
      updatedBy: 'user_a',
      deletedAt: null,
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('stores a valid category, description and split, and lets the payer be the other member', async () => {
    await handler.execute(
      new CreateExpenseCommand(
        input({
          paidBy: 'user_b',
          category: 'food',
          description: 'Dinner',
          splitType: 'OTHER_OWES_ALL',
          spentOn: '2026-09-29',
        }),
      ),
    );

    expect(savedExpense().toPrimitives()).toMatchObject({
      paidBy: 'user_b',
      createdBy: 'user_a',
      category: 'food',
      description: 'Dinner',
      splitType: 'OTHER_OWES_ALL',
      spentOn: '2026-09-29',
    });
  });

  it('rejects an invalid category, amount, split or date when the command is built', () => {
    expect(
      () => new CreateExpenseCommand(input({ category: 'pets' })),
    ).toThrow();
    expect(() => new CreateExpenseCommand(input({ amountCents: 0 }))).toThrow();
    expect(
      () => new CreateExpenseCommand(input({ amountCents: 10.5 })),
    ).toThrow();
    expect(() => new CreateExpenseCommand(input({ splitType: 'X' }))).toThrow();
    expect(
      () => new CreateExpenseCommand(input({ spentOn: 'nope' })),
    ).toThrow();
  });

  it('rejects a future date using the clock and saves nothing', async () => {
    await expect(
      handler.execute(
        new CreateExpenseCommand(input({ spentOn: '2026-10-01' })),
      ),
    ).rejects.toThrow(ExpenseDateInFutureException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('accepts today and yesterday', async () => {
    await handler.execute(new CreateExpenseCommand(input({ spentOn: TODAY })));
    await handler.execute(
      new CreateExpenseCommand(input({ spentOn: '2026-09-29' })),
    );
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('rejects a group with fewer than two members', async () => {
    membersPort.listMemberIds.mockResolvedValue(['user_a']);

    await expect(
      handler.execute(new CreateExpenseCommand(input())),
    ).rejects.toThrow(GroupNotReadyException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects a payer who is not a member', async () => {
    await expect(
      handler.execute(new CreateExpenseCommand(input({ paidBy: 'stranger' }))),
    ).rejects.toThrow(ExpensePayerNotMemberException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('denies a non-member requester before anything else', async () => {
    assertMember.execute.mockRejectedValue(
      new ExpenseAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(
        new CreateExpenseCommand(input({ requesterId: 'stranger' })),
      ),
    ).rejects.toThrow(ExpenseAccessDeniedException);
    expect(membersPort.listMemberIds).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
