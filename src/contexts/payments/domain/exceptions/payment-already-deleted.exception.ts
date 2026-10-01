import { BaseException } from '@sisques-labs/nestjs-kit';

export class PaymentAlreadyDeletedException extends BaseException {
  constructor(paymentId: string) {
    super(`Payment ${paymentId} is already deleted`);
  }
}
