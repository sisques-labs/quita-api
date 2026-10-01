import { CreatePaymentCommand } from '@contexts/payments/application/commands/create-payment/create-payment.command';
import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/payments/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentPartyNotMemberException } from '@contexts/payments/domain/exceptions/payment-party-not-member.exception';
import {
  PAYMENT_WRITE_REPOSITORY,
  PaymentWriteRepository,
} from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { PaymentDateValueObject } from '@contexts/payments/domain/value-objects/payment-date/payment-date.value-object';
import { CLOCK, ClockPort } from '@core/clock/domain/clock.port';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

@CommandHandler(CreatePaymentCommand)
export class CreatePaymentHandler
  extends BaseCommandHandler<CreatePaymentCommand, PaymentAggregate>
  implements ICommandHandler<CreatePaymentCommand, string>
{
  private readonly logger = new Logger(CreatePaymentHandler.name);

  constructor(
    @Inject(PAYMENT_WRITE_REPOSITORY)
    private readonly repository: PaymentWriteRepository,
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    private readonly paymentBuilder: PaymentBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: CreatePaymentCommand): Promise<string> {
    const groupId = command.groupId.value;
    await this.assertRequesterIsMember.execute(
      command.groupId,
      command.requesterId,
    );

    const paidOn = PaymentDateValueObject.create(
      command.paidOn.value,
      this.clock.today(),
    );

    for (const party of [command.fromUserId.value, command.toUserId.value]) {
      if (!(await this.membersPort.isMember(groupId, party))) {
        throw new PaymentPartyNotMemberException(party, groupId);
      }
    }

    // The aggregate rejects a payment from a member to themselves.
    const payment = this.paymentBuilder
      .withId(UuidValueObject.generate().value)
      .withGroupId(groupId)
      .withFromUserId(command.fromUserId.value)
      .withToUserId(command.toUserId.value)
      .withAmountCents(command.amount.value)
      .withPaidOn(paidOn.value)
      .withNote(command.note?.value ?? null)
      .withCreatedBy(command.requesterId.value)
      .build();
    payment.create();

    await this.repository.save(payment);
    await this.publishEvents(payment);

    this.logger.log(
      `Payment ${payment.id.value} created in group ${groupId} by ${command.requesterId.value}`,
    );
    return payment.id.value;
  }
}
