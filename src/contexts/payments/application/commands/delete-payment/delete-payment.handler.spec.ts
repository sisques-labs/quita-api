import { DeletePaymentCommand } from '@contexts/payments/application/commands/delete-payment/delete-payment.command';
import { DeletePaymentHandler } from '@contexts/payments/application/commands/delete-payment/delete-payment.handler';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertPaymentExistsService } from '@contexts/payments/application/services/write/assert-payment-exists/assert-payment-exists.service';
import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentAccessDeniedException } from '@contexts/payments/domain/exceptions/payment-access-denied.exception';
import { PaymentAlreadyDeletedException } from '@contexts/payments/domain/exceptions/payment-already-deleted.exception';
import { PaymentNotFoundException } from '@contexts/payments/domain/exceptions/payment-not-found.exception';
import { PaymentWriteRepository } from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

const command = (requesterId = 'user_b') =>
  new DeletePaymentCommand({ paymentId: ID, groupId: GROUP_ID, requesterId });

const activePayment = () =>
  new PaymentBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withFromUserId('user_a')
    .withToUserId('user_b')
    .withAmountCents(1000)
    .withPaidOn('2026-09-29')
    .withCreatedBy('user_a')
    .build();

describe('DeletePaymentHandler', () => {
  let repository: Mocked<PaymentWriteRepository>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let assertExists: Mocked<AssertPaymentExistsService>;
  let eventBus: Mocked<EventBus>;
  let handler: DeletePaymentHandler;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      save: vi.fn().mockImplementation(async (p: PaymentAggregate) => p),
      delete: vi.fn(),
    };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    assertExists = {
      execute: vi.fn().mockResolvedValue(activePayment()),
    } as unknown as Mocked<AssertPaymentExistsService>;
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new DeletePaymentHandler(
      repository,
      assertMember,
      assertExists,
      eventBus,
    );
  });

  it('lets another member soft-delete the payment, keeping the row', async () => {
    await handler.execute(command('user_b'));

    expect(assertMember.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: GROUP_ID }),
      expect.objectContaining({ value: 'user_b' }),
    );
    expect(repository.delete).not.toHaveBeenCalled();
    const saved = repository.save.mock.calls[0][0].toPrimitives();
    expect(saved.deletedAt).toBeInstanceOf(Date);
    expect(saved.updatedBy).toBe('user_b');
    expect(saved.createdBy).toBe('user_a');
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('rejects deleting an already deleted payment', async () => {
    const deleted = activePayment();
    deleted.delete('user_a', new Date('2026-09-30T08:00:00Z'));
    assertExists.execute.mockResolvedValue(deleted);

    await expect(handler.execute(command())).rejects.toThrow(
      PaymentAlreadyDeletedException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('denies a non-member without loading the payment', async () => {
    assertMember.execute.mockRejectedValue(
      new PaymentAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(handler.execute(command('stranger'))).rejects.toThrow(
      PaymentAccessDeniedException,
    );
    expect(assertExists.execute).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates not found', async () => {
    assertExists.execute.mockRejectedValue(new PaymentNotFoundException(ID));

    await expect(handler.execute(command())).rejects.toThrow(
      PaymentNotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
