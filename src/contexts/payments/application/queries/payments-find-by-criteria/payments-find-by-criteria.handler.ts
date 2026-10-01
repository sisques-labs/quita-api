import { DEFAULT_SORTS } from '@contexts/payments/application/constants/default-sorts.constant';
import { GROUP_FIELD } from '@contexts/payments/application/constants/group-field.constant';
import { PaymentsFindByCriteriaQuery } from '@contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.query';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import {
  PAYMENT_READ_REPOSITORY,
  PaymentReadRepository,
} from '@contexts/payments/domain/repositories/read/payment-read.repository';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  Criteria,
  FilterOperator,
  PaginatedResult,
} from '@sisques-labs/nestjs-kit';

/**
 * Lists a group's payments, soft-deleted ones included (flagged by
 * `deletedAt`). The group scope is injected here and any client filter on the
 * group field is dropped, so a member can never read another group's rows.
 */
@QueryHandler(PaymentsFindByCriteriaQuery)
export class PaymentsFindByCriteriaHandler implements IQueryHandler<
  PaymentsFindByCriteriaQuery,
  PaginatedResult<PaymentViewModel>
> {
  private readonly logger = new Logger(PaymentsFindByCriteriaHandler.name);

  constructor(
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    @Inject(PAYMENT_READ_REPOSITORY)
    private readonly repository: PaymentReadRepository,
  ) {}

  async execute(
    query: PaymentsFindByCriteriaQuery,
  ): Promise<PaginatedResult<PaymentViewModel>> {
    this.logger.log(
      `Listing payments of group ${query.groupId.value} for ${query.requesterId.value}`,
    );
    await this.assertRequesterIsMember.execute(
      query.groupId,
      query.requesterId,
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
