import { BaseException } from '@sisques-labs/nestjs-kit';

export class ExpenseDateInFutureException extends BaseException {
  constructor(date: string, today: string) {
    super(`Expense date ${date} is in the future (today is ${today})`);
  }
}
