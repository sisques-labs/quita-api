import { EditExpenseCommand } from '@contexts/expenses/application/commands/edit-expense/edit-expense.command';
import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/expenses/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertExpenseExistsService } from '@contexts/expenses/application/services/write/assert-expense-exists/assert-expense-exists.service';
import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpensePayerNotMemberException } from '@contexts/expenses/domain/exceptions/expense-payer-not-member.exception';
import {
  EXPENSE_WRITE_REPOSITORY,
  ExpenseWriteRepository,
} from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { CLOCK, ClockPort } from '@core/clock/domain/clock.port';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

/** Any member of the group may edit any active expense of that group. */
@CommandHandler(EditExpenseCommand)
export class EditExpenseHandler
  extends BaseCommandHandler<EditExpenseCommand, ExpenseAggregate>
  implements ICommandHandler<EditExpenseCommand, string>
{
  private readonly logger = new Logger(EditExpenseHandler.name);

  constructor(
    @Inject(EXPENSE_WRITE_REPOSITORY)
    private readonly repository: ExpenseWriteRepository,
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    private readonly assertExpenseExists: AssertExpenseExistsService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: EditExpenseCommand): Promise<string> {
    const groupId = command.groupId.value;
    await this.assertRequesterIsMember.execute(
      command.groupId,
      command.requesterId,
    );

    const expense = await this.assertExpenseExists.execute(
      command.expenseId,
      command.groupId,
    );

    const { paidBy } = command.changes;
    if (
      paidBy !== undefined &&
      !(await this.membersPort.isMember(groupId, paidBy))
    ) {
      throw new ExpensePayerNotMemberException(paidBy, groupId);
    }

    expense.update(
      command.changes,
      command.requesterId.value,
      this.clock.today(),
    );

    await this.repository.save(expense);
    await this.publishEvents(expense);

    this.logger.log(
      `Expense ${expense.id.value} edited by ${command.requesterId.value}`,
    );
    return expense.id.value;
  }
}
