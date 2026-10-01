import { ExpensesFindByCriteriaQuery } from '@contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.query';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { ExpensesFindByCriteriaRequestDto } from '@contexts/expenses/transport/graphql/dtos/requests/expenses-find-by-criteria.request.dto';
import {
  ExpenseResponseDto,
  PaginatedExpenseResultDto,
} from '@contexts/expenses/transport/graphql/dtos/responses/expense.response.dto';
import { ExpenseGraphQLMapper } from '@contexts/expenses/transport/graphql/mappers/expense-graphql.mapper';
import { expenseFilterableFields } from '@contexts/expenses/transport/graphql/registries/expense-filterable-fields.registry';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

@Resolver(() => ExpenseResponseDto)
@UseGuards(ClerkAuthGuard)
export class ExpenseQueriesResolver {
  private readonly logger = new Logger(ExpenseQueriesResolver.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: ExpenseGraphQLMapper,
  ) {}

  @Query(() => PaginatedExpenseResultDto, {
    name: 'expenses',
    description:
      "A group's expense history, soft-deleted rows included, newest date first. Members only.",
  })
  async expenses(
    @Args('groupId', { type: () => ID }) groupId: string,
    @Args(
      'criteria',
      { type: () => ExpensesFindByCriteriaRequestDto, nullable: true },
      new FilterValidationPipe(expenseFilterableFields),
    )
    criteria: ExpensesFindByCriteriaRequestDto | undefined,
    @AuthUser() user: AuthUser,
  ): Promise<PaginatedExpenseResultDto> {
    this.logger.log(`expenses group=${groupId} requester=${user.userId}`);

    const result = await this.queryBus.execute<
      ExpensesFindByCriteriaQuery,
      PaginatedResult<ExpenseViewModel>
    >(
      new ExpensesFindByCriteriaQuery({
        groupId,
        requesterId: user.userId,
        criteria: new Criteria(
          criteria?.filters,
          criteria?.sorts,
          criteria?.pagination,
        ),
      }),
    );

    return this.mapper.toPaginatedResponseDto(result);
  }
}
