import {
  EXPENSES_PORT,
  ExpensesPort,
} from '@contexts/balances/application/ports/expenses.port';
import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/balances/application/ports/group-members.port';
import {
  PAYMENTS_PORT,
  PaymentsPort,
} from '@contexts/balances/application/ports/payments.port';
import { GroupBalanceQuery } from '@contexts/balances/application/queries/group-balance/group-balance.query';
import { AssertRequesterIsGroupMemberService } from '@contexts/balances/application/services/read/assert-requester-is-group-member.service';
import { GroupBalanceCalculator } from '@contexts/balances/domain/services/group-balance.calculator';
import { GroupBalanceViewModel } from '@contexts/balances/domain/view-models/group-balance.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

const CURRENCY = 'EUR';

/**
 * Computes a group's balance on read from its active expenses and payments.
 * Membership is checked before any other port is used.
 */
@QueryHandler(GroupBalanceQuery)
export class GroupBalanceHandler implements IQueryHandler<
  GroupBalanceQuery,
  GroupBalanceViewModel
> {
  private readonly logger = new Logger(GroupBalanceHandler.name);

  constructor(
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
    @Inject(EXPENSES_PORT)
    private readonly expensesPort: ExpensesPort,
    @Inject(PAYMENTS_PORT)
    private readonly paymentsPort: PaymentsPort,
    private readonly calculator: GroupBalanceCalculator,
  ) {}

  async execute(query: GroupBalanceQuery): Promise<GroupBalanceViewModel> {
    const groupId = query.groupId.value;
    this.logger.log(
      `Computing balance of group ${groupId} for ${query.requesterId.value}`,
    );
    await this.assertRequesterIsMember.execute(
      groupId,
      query.requesterId.value,
    );

    const [memberIds, expenses, payments] = await Promise.all([
      this.membersPort.listMemberIds(groupId),
      this.expensesPort.listActiveExpenses(groupId),
      this.paymentsPort.listActivePayments(groupId),
    ]);

    const result = this.calculator.calculate({
      groupId,
      memberIds,
      expenses,
      payments,
    });

    return new GroupBalanceViewModel(
      groupId,
      CURRENCY,
      result.settled,
      result.memberBalances,
      result.debts,
    );
  }
}
