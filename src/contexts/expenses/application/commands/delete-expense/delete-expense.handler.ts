import { DeleteExpenseCommand } from '@contexts/expenses/application/commands/delete-expense/delete-expense.command';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertExpenseExistsService } from '@contexts/expenses/application/services/write/assert-expense-exists/assert-expense-exists.service';
import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import {
  EXPENSE_WRITE_REPOSITORY,
  IExpenseWriteRepository,
} from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

/** Soft delete: any member may delete any active expense; the row is kept. */
@CommandHandler(DeleteExpenseCommand)
export class DeleteExpenseHandler
  extends BaseCommandHandler<DeleteExpenseCommand, ExpenseAggregate>
  implements ICommandHandler<DeleteExpenseCommand, string>
{
  private readonly logger = new Logger(DeleteExpenseHandler.name);

  constructor(
    @Inject(EXPENSE_WRITE_REPOSITORY)
    private readonly repository: IExpenseWriteRepository,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    private readonly assertExpenseExists: AssertExpenseExistsService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: DeleteExpenseCommand): Promise<string> {
    await this.assertRequesterIsMember.execute(
      command.groupId,
      command.requesterId,
    );

    const expense = await this.assertExpenseExists.execute(
      command.expenseId,
      command.groupId,
    );
    expense.delete(command.requesterId.value, new Date());

    await this.repository.save(expense);
    await this.publishEvents(expense);

    this.logger.log(
      `Expense ${expense.id.value} deleted by ${command.requesterId.value}`,
    );
    return expense.id.value;
  }
}
