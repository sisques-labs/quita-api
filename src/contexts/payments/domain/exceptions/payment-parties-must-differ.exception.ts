import { BaseException } from '@sisques-labs/nestjs-kit';

export class PaymentPartiesMustDifferException extends BaseException {
  constructor(userId: string) {
    super(`A payment needs two different members, got ${userId} on both sides`);
  }
}
