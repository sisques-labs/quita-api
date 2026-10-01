import { CreatePaymentCommand } from '@contexts/payments/application/commands/create-payment/create-payment.command';
import { DeletePaymentCommand } from '@contexts/payments/application/commands/delete-payment/delete-payment.command';
import { EditPaymentCommand } from '@contexts/payments/application/commands/edit-payment/edit-payment.command';
import { PaymentMutationsResolver } from '@contexts/payments/transport/graphql/resolvers/payment-mutations.resolver';
import { CommandBus } from '@nestjs/cqrs';
import { MutationResponseGraphQLMapper } from '@sisques-labs/nestjs-kit/graphql';
import { Mocked } from 'vitest';

const PAYMENT_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

describe('PaymentMutationsResolver', () => {
  let commandBus: Mocked<CommandBus>;
  let resolver: PaymentMutationsResolver;

  beforeEach(() => {
    commandBus = { execute: vi.fn() } as unknown as Mocked<CommandBus>;
    resolver = new PaymentMutationsResolver(
      commandBus,
      new MutationResponseGraphQLMapper(),
    );
  });

  const sentCommand = <T>(): T => commandBus.execute.mock.calls[0][0] as T;

  it('creates a payment on behalf of the authenticated user, never of input', async () => {
    commandBus.execute.mockResolvedValue(PAYMENT_ID);

    const response = await resolver.createPayment(
      {
        groupId: GROUP_ID,
        fromUserId: 'user_b',
        toUserId: 'user_a',
        amountCents: 1500,
        paidOn: '2026-03-01',
        note: 'Rent',
      },
      { userId: 'user_a' },
    );

    const command = sentCommand<CreatePaymentCommand>();
    expect(command).toBeInstanceOf(CreatePaymentCommand);
    expect(command.requesterId.value).toBe('user_a');
    expect(command.fromUserId.value).toBe('user_b');
    expect(command.toUserId.value).toBe('user_a');
    expect(command.amount.value).toBe(1500);
    expect(command.note?.value).toBe('Rent');
    expect(response).toEqual({
      success: true,
      message: 'Payment created successfully',
      id: PAYMENT_ID,
    });
  });

  it('edits only the fields sent, letting null clear the note', async () => {
    commandBus.execute.mockResolvedValue(PAYMENT_ID);

    const response = await resolver.editPayment(
      {
        groupId: GROUP_ID,
        paymentId: PAYMENT_ID,
        amountCents: 900,
        note: null,
      },
      { userId: 'user_b' },
    );

    const command = sentCommand<EditPaymentCommand>();
    expect(command).toBeInstanceOf(EditPaymentCommand);
    expect(command.requesterId.value).toBe('user_b');
    expect(command.changes).toEqual({ amountCents: 900, note: null });
    expect(response).toEqual({
      success: true,
      message: 'Payment edited successfully',
      id: PAYMENT_ID,
    });
  });

  it('soft deletes through the command bus', async () => {
    commandBus.execute.mockResolvedValue(PAYMENT_ID);

    const response = await resolver.deletePayment(
      { groupId: GROUP_ID, paymentId: PAYMENT_ID },
      { userId: 'user_b' },
    );

    const command = sentCommand<DeletePaymentCommand>();
    expect(command).toBeInstanceOf(DeletePaymentCommand);
    expect(command.paymentId.value).toBe(PAYMENT_ID);
    expect(command.requesterId.value).toBe('user_b');
    expect(response.message).toBe('Payment deleted successfully');
  });
});
