import { BaseException } from '@sisques-labs/nestjs-kit';

export class PaymentDateInvalidException extends BaseException {
  constructor(value: string) {
    super(`Payment date "${value}" is not a valid YYYY-MM-DD calendar date`);
  }
}
