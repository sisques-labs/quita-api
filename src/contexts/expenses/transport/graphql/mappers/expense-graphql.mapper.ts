import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { ExpenseObject } from '@contexts/expenses/transport/graphql/objects/expense.object';
import { PaginatedExpenseResultObject } from '@contexts/expenses/transport/graphql/objects/paginated-expense-result.object';
import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@Injectable()
export class ExpenseGraphQLMapper {
  toObject(viewModel: ExpenseViewModel): ExpenseObject {
    return {
      id: viewModel.id,
      groupId: viewModel.groupId,
      amountCents: viewModel.amountCents,
      currency: viewModel.currency,
      paidBy: viewModel.paidBy,
      spentOn: viewModel.spentOn,
      description: viewModel.description,
      category: viewModel.category,
      splitType: viewModel.splitType,
      createdBy: viewModel.createdBy,
      updatedBy: viewModel.updatedBy,
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
      deletedAt: viewModel.deletedAt,
    };
  }

  toPaginated(
    result: PaginatedResult<ExpenseViewModel>,
  ): PaginatedExpenseResultObject {
    return {
      items: result.items.map((item) => this.toObject(item)),
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    };
  }
}
