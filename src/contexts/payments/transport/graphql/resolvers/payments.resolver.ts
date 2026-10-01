import { CreatePaymentCommand } from '@contexts/payments/application/commands/create-payment/create-payment.command';
import { DeletePaymentCommand } from '@contexts/payments/application/commands/delete-payment/delete-payment.command';
import { EditPaymentCommand } from '@contexts/payments/application/commands/edit-payment/edit-payment.command';
import { PaymentsFindByCriteriaQuery } from '@contexts/payments/application/queries/payments-find-by-criteria/payments-find-by-criteria.query';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { PaymentCreateRequestDto } from '@contexts/payments/transport/graphql/dtos/requests/payment-create.request.dto';
import { PaymentDeleteRequestDto } from '@contexts/payments/transport/graphql/dtos/requests/payment-delete.request.dto';
import { PaymentEditRequestDto } from '@contexts/payments/transport/graphql/dtos/requests/payment-edit.request.dto';
import { PaymentsFindByCriteriaRequestDto } from '@contexts/payments/transport/graphql/dtos/requests/payments-find-by-criteria.request.dto';
import { PaymentGraphQLMapper } from '@contexts/payments/transport/graphql/mappers/payment-graphql.mapper';
import { PaginatedPaymentResultDto } from '@contexts/payments/transport/graphql/dtos/responses/payment.response.dto';
import { PaymentResponseDto } from '@contexts/payments/transport/graphql/dtos/responses/payment.response.dto';
import { paymentFilterableFields } from '@contexts/payments/transport/graphql/registries/payment-filterable-fields.registry';
import { AuthUser } from '@core/auth/infrastructure/clerk/auth-user.decorator';
import { ClerkAuthGuard } from '@core/auth/infrastructure/clerk/clerk-auth.guard';
import { Logger, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import {
  FilterValidationPipe,
  MutationResponseDto,
  MutationResponseGraphQLMapper,
} from '@sisques-labs/nestjs-kit/graphql';

@Resolver(() => PaymentResponseDto)
@UseGuards(ClerkAuthGuard)
export class PaymentsResolver {
  private readonly logger = new Logger(PaymentsResolver.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly mapper: PaymentGraphQLMapper,
    private readonly mutationResponseMapper: MutationResponseGraphQLMapper,
  ) {}

  @Mutation(() => MutationResponseDto, {
    name: 'createPayment',
    description:
      'Records a settlement between two members of a group the caller belongs to.',
  })
  async createPayment(
    @Args('input') input: PaymentCreateRequestDto,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `createPayment group=${input.groupId} requester=${user.userId}`,
    );

    const id = await this.commandBus.execute<CreatePaymentCommand, string>(
      new CreatePaymentCommand({
        groupId: input.groupId,
        requesterId: user.userId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amountCents: input.amountCents,
        paidOn: input.paidOn,
        note: input.note,
      }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Payment created successfully',
      id,
    });
  }

  @Mutation(() => MutationResponseDto, {
    name: 'editPayment',
    description: 'Edits an active payment; any member of the group may do so.',
  })
  async editPayment(
    @Args('input') input: PaymentEditRequestDto,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `editPayment payment=${input.paymentId} requester=${user.userId}`,
    );

    const id = await this.commandBus.execute<EditPaymentCommand, string>(
      new EditPaymentCommand({
        paymentId: input.paymentId,
        groupId: input.groupId,
        requesterId: user.userId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amountCents: input.amountCents,
        paidOn: input.paidOn,
        note: input.note,
      }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Payment edited successfully',
      id,
    });
  }

  @Mutation(() => MutationResponseDto, {
    name: 'deletePayment',
    description:
      'Soft-deletes an active payment; any member of the group may do so.',
  })
  async deletePayment(
    @Args('input') input: PaymentDeleteRequestDto,
    @AuthUser() user: AuthUser,
  ): Promise<MutationResponseDto> {
    this.logger.log(
      `deletePayment payment=${input.paymentId} requester=${user.userId}`,
    );

    const id = await this.commandBus.execute<DeletePaymentCommand, string>(
      new DeletePaymentCommand({
        paymentId: input.paymentId,
        groupId: input.groupId,
        requesterId: user.userId,
      }),
    );

    return this.mutationResponseMapper.toResponseDto({
      success: true,
      message: 'Payment deleted successfully',
      id,
    });
  }

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
