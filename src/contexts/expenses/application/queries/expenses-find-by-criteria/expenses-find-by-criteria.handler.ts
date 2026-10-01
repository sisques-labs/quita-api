import { ExpensesFindByCriteriaQuery } from '@contexts/expenses/application/queries/expenses-find-by-criteria/expenses-find-by-criteria.query';
import { AssertRequesterIsGroupMemberService } from '@contexts/expenses/application/services/read/assert-requester-is-group-member.service';
import {
  EXPENSE_READ_REPOSITORY,
  ExpenseReadRepository,
} from '@contexts/expenses/domain/repositories/read/expense-read.repository';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  Criteria,
  FilterOperator,
  PaginatedResult,
  Sort,
  SortDirection,
} from '@sisques-labs/nestjs-kit';

/** View-model property the repository maps to the `group_id` column. */
const GROUP_FIELD = 'groupId';

/** History order: newest expense date first, ties broken by newest creation. */
const DEFAULT_SORTS: Sort[] = [
  { field: 'spentOn', direction: SortDirection.DESC },
  { field: 'createdAt', direction: SortDirection.DESC },
];

/**
 * Lists a group's expenses, soft-deleted ones included (flagged by
 * `deletedAt`). The group scope is injected here and any client filter on the
 * group field is dropped, so a member can never read another group's rows.
 */
@QueryHandler(ExpensesFindByCriteriaQuery)
export class ExpensesFindByCriteriaHandler implements IQueryHandler<
  ExpensesFindByCriteriaQuery,
  PaginatedResult<ExpenseViewModel>
> {
  private readonly logger = new Logger(ExpensesFindByCriteriaHandler.name);

  constructor(
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    @Inject(EXPENSE_READ_REPOSITORY)
    private readonly repository: ExpenseReadRepository,
  ) {}

  async execute(
    query: ExpensesFindByCriteriaQuery,
  ): Promise<PaginatedResult<ExpenseViewModel>> {
    this.logger.log(
      `Listing expenses of group ${query.groupId.value} for ${query.requesterId.value}`,
    );
    await this.assertRequesterIsMember.execute(
      query.groupId.value,
      query.requesterId.value,
    );

    const { filters, sorts, pagination } = query.criteria;
    return this.repository.findByCriteria(
      new Criteria(
        [
          ...filters.filter((filter) => filter.field !== GROUP_FIELD),
          {
            field: GROUP_FIELD,
            operator: FilterOperator.EQUALS,
            value: query.groupId.value,
          },
        ],
        sorts.length > 0 ? sorts : DEFAULT_SORTS,
        pagination,
      ),
    );
  }
}
