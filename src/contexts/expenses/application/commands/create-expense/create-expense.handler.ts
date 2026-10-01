import { CreateExpenseCommand } from '@contexts/expenses/application/commands/create-expense/create-expense.command';
import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/expenses/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member.service';
import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseBuilder } from '@contexts/expenses/domain/builders/expense.builder';
import { ExpensePayerNotMemberException } from '@contexts/expenses/domain/exceptions/expense-payer-not-member.exception';
import { GroupNotReadyException } from '@contexts/expenses/domain/exceptions/group-not-ready.exception';
import {
  EXPENSE_WRITE_REPOSITORY,
  ExpenseWriteRepository,
} from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { ExpenseDateValueObject } from '@contexts/expenses/domain/value-objects/expense-date/expense-date.value-object';
import { CLOCK, ClockPort } from '@core/clock/domain/clock.port';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

/** Members a group needs before its first expense (payer plus the other side of the split). */
const MIN_MEMBERS = 2;

@CommandHandler(CreateExpenseCommand)
export class CreateExpenseHandler
  extends BaseCommandHandler<CreateExpenseCommand, ExpenseAggregate>
  implements ICommandHandler<CreateExpenseCommand, string>
{
  private readonly logger = new Logger(CreateExpenseHandler.name);

  constructor(
    @Inject(EXPENSE_WRITE_REPOSITORY)
    private readonly repository: ExpenseWriteRepository,
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: CreateExpenseCommand): Promise<string> {
    const groupId = command.groupId.value;
    await this.assertRequesterIsMember.execute(
      groupId,
      command.requesterId.value,
    );

    const spentOn = ExpenseDateValueObject.create(
      command.spentOn.value,
      this.clock.today(),
    );

    const memberIds = await this.membersPort.listMemberIds(groupId);
    if (memberIds.length < MIN_MEMBERS) {
      throw new GroupNotReadyException(groupId);
    }
    if (!memberIds.includes(command.paidBy.value)) {
      throw new ExpensePayerNotMemberException(command.paidBy.value, groupId);
    }

    const expense = new ExpenseBuilder()
      .withId(UuidValueObject.generate().value)
      .withGroupId(groupId)
      .withAmountCents(command.amount.value)
      .withPaidBy(command.paidBy.value)
      .withSpentOn(spentOn.value)
      .withDescription(command.description?.value ?? null)
      .withCategory(command.category?.value ?? null)
      .withSplitType(command.splitType.value)
      .withCreatedBy(command.requesterId.value)
      .build();
    expense.create();

    await this.repository.save(expense);
    await this.publishEvents(expense);

    this.logger.log(
      `Expense ${expense.id.value} created in group ${groupId} by ${command.requesterId.value}`,
    );
    return expense.id.value;
  }
}
