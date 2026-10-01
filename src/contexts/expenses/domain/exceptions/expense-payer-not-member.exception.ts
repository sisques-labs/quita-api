import { BaseException } from '@sisques-labs/nestjs-kit';

export class ExpensePayerNotMemberException extends BaseException {
  constructor(payerId: string, groupId: string) {
    super(`Payer ${payerId} is not a member of group ${groupId}`);
  }
}
