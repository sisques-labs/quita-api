import { MEMBERS_REQUIRED } from '@contexts/balances/domain/constants/members-required.constant';
import { BalanceSplitType } from '@contexts/balances/domain/enums/balance-split-type.enum';
import { BalanceParticipantUnknownException } from '@contexts/balances/domain/exceptions/balance-participant-unknown.exception';
import { GroupNotReadyException } from '@contexts/balances/domain/exceptions/group-not-ready.exception';
import {
  BalanceCalculationInput,
  BalanceCalculationResult,
  BalanceDebt,
} from '@contexts/balances/domain/interfaces/balance-entries.interface';
import { BalanceAmountValueObject } from '@contexts/balances/domain/value-objects/balance-amount/balance-amount.value-object';

/**
 * Pure calculator of the net position of each member of a two-person group.
 * Positive net = is owed. Every entry moves the same amount from one member to
 * the other, so the nets always sum to zero.
 */
export class GroupBalanceCalculator {
  calculate(input: BalanceCalculationInput): BalanceCalculationResult {
    const { groupId, memberIds } = input;
    if (
      memberIds.length !== MEMBERS_REQUIRED ||
      new Set(memberIds).size !== MEMBERS_REQUIRED
    ) {
      throw new GroupNotReadyException(groupId);
    }

    const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
    const other = (userId: string): string => {
      if (!net.has(userId)) {
        throw new BalanceParticipantUnknownException(userId, groupId);
      }
      return memberIds.find((id) => id !== userId) as string;
    };
    const transfer = (creditor: string, debtor: string, cents: number) => {
      net.set(creditor, (net.get(creditor) as number) + cents);
      net.set(debtor, (net.get(debtor) as number) - cents);
    };

    for (const expense of input.expenses) {
      const amount = new BalanceAmountValueObject(expense.amountCents).value;
      const owed =
        expense.splitType === BalanceSplitType.EQUAL
          ? Math.floor(amount / 2)
          : amount;
      transfer(expense.paidBy, other(expense.paidBy), owed);
    }

    for (const payment of input.payments) {
      const amount = new BalanceAmountValueObject(payment.amountCents).value;
      // The payee must be the other member of the roster.
      if (other(payment.fromUserId) !== payment.toUserId) {
        throw new BalanceParticipantUnknownException(payment.toUserId, groupId);
      }
      transfer(payment.fromUserId, payment.toUserId, amount);
    }

    const memberBalances = memberIds.map((userId) => ({
      userId,
      netCents: net.get(userId) as number,
    }));
    const debtor = memberBalances.find((member) => member.netCents < 0);
    const creditor = memberBalances.find((member) => member.netCents > 0);
    const debts: BalanceDebt[] =
      debtor && creditor
        ? [
            {
              fromUserId: debtor.userId,
              toUserId: creditor.userId,
              amountCents: creditor.netCents,
            },
          ]
        : [];

    return { memberBalances, debts, settled: debts.length === 0 };
  }
}
