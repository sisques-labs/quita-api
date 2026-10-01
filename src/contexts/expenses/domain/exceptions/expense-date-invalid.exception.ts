import { BaseException } from '@sisques-labs/nestjs-kit';

export class ExpenseDateInvalidException extends BaseException {
  constructor(value: string) {
    super(`Expense date "${value}" is not a valid YYYY-MM-DD calendar date`);
  }
}
