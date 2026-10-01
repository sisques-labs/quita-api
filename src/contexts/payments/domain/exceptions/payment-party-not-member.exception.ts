import { BaseException } from '@sisques-labs/nestjs-kit';

export class PaymentPartyNotMemberException extends BaseException {
  constructor(userId: string, groupId: string) {
    super(`Payment party ${userId} is not a member of group ${groupId}`);
  }
}
