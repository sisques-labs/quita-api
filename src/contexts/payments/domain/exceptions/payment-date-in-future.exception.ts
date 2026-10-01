import { BaseException } from '@sisques-labs/nestjs-kit';

export class PaymentDateInFutureException extends BaseException {
  constructor(date: string, today: string) {
    super(`Payment date ${date} is in the future (today is ${today})`);
  }
}
