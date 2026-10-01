import { BaseException } from '@sisques-labs/nestjs-kit';

export class PaymentNotFoundException extends BaseException {
  constructor(paymentId: string) {
    super(`Payment ${paymentId} not found`);
  }
}
