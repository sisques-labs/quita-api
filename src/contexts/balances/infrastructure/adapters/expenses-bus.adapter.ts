import { ExpensesPort } from '@contexts/balances/application/ports/expenses.port';
import { BalanceSplitType } from '@contexts/balances/domain/enums/balance-split-type.enum';
import { BalanceSplitTypeUnknownException } from '@contexts/balances/domain/exceptions/balance-split-type-unknown.exception';
import { BalanceExpenseEntry } from '@contexts/balances/domain/interfaces/balance-entries.interface';
import { ExpensesFindActiveByGroupQuery } from '@contexts/expenses/application/queries/expenses-find-active-by-group/expenses-find-active-by-group.query';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Anti-corruption seam towards expenses: reads the public active-expenses
 * query and translates the rows into balances' own entry type.
 */
@Injectable()
export class ExpensesBusAdapter implements ExpensesPort {
  constructor(private readonly queryBus: QueryBus) {}

  async listActiveExpenses(groupId: string): Promise<BalanceExpenseEntry[]> {
    const expenses = await this.queryBus.execute<
      ExpensesFindActiveByGroupQuery,
      ExpenseViewModel[]
    >(new ExpensesFindActiveByGroupQuery({ groupId }));

    return expenses.map((expense) => ({
      amountCents: expense.amountCents,
      paidBy: expense.paidBy,
      splitType: this.toSplitType(expense.splitType),
    }));
  }

  private toSplitType(value: string): BalanceSplitType {
    const known = Object.values(BalanceSplitType).find(
      (splitType) => splitType === value,
    );
    if (!known) {
      throw new BalanceSplitTypeUnknownException(value);
    }
    return known;
  }
}
