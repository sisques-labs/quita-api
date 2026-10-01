import { PaymentsFindByCriteriaQuery } from '@contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.query';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { PaymentsFindByCriteriaRequestDto } from '@contexts/payments/transport/graphql/dtos/requests/payments-find-by-criteria.request.dto';
import {
  PaginatedPaymentResultDto,
  PaymentResponseDto,
} from '@contexts/payments/transport/graphql/dtos/responses/payment.response.dto';
import { PaymentGraphQLMapper } from '@contexts/payments/transport/graphql/mappers/payment-graphql.mapper';
import { paymentFilterableFields } from '@contexts/payments/transport/graphql/registries/payment-filterable-fields.registry';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { FilterValidationPipe } from '@sisques-labs/nestjs-kit/graphql';

@Resolver(() => PaymentResponseDto)
@UseGuards(ClerkAuthGuard)
export class PaymentQueriesResolver {
  private readonly logger = new Logger(PaymentQueriesResolver.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly mapper: PaymentGraphQLMapper,
  ) {}

  @Query(() => PaginatedPaymentResultDto, {
    name: 'payments',
    description:
      "A group's payment history, soft-deleted rows included, newest date first. Members only.",
  })
  async payments(
    @Args('groupId', { type: () => ID }) groupId: string,
    @Args(
      'criteria',
      { type: () => PaymentsFindByCriteriaRequestDto, nullable: true },
      new FilterValidationPipe(paymentFilterableFields),
    )
    criteria: PaymentsFindByCriteriaRequestDto | undefined,
    @AuthUser() user: AuthUser,
  ): Promise<PaginatedPaymentResultDto> {
    this.logger.log(`payments group=${groupId} requester=${user.userId}`);

    const result = await this.queryBus.execute<
      PaymentsFindByCriteriaQuery,
      PaginatedResult<PaymentViewModel>
    >(
      new PaymentsFindByCriteriaQuery({
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
