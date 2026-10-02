import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { ExpenseResponseDto } from '@contexts/expenses/transport/graphql/dtos/responses/expense.response.dto';
import { PaginatedExpenseResultDto } from '@contexts/expenses/transport/graphql/dtos/responses/expense.response.dto';
import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@Injectable()
export class ExpenseGraphQLMapper {
  toResponseDtoFromViewModel(viewModel: ExpenseViewModel): ExpenseResponseDto {
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

  toPaginatedResponseDto(
    result: PaginatedResult<ExpenseViewModel>,
  ): PaginatedExpenseResultDto {
    return {
      items: result.items.map((item) => this.toResponseDtoFromViewModel(item)),
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    };
  }
}
