import { BaseException } from '@sisques-labs/nestjs-kit';

export class BalanceParticipantUnknownException extends BaseException {
  constructor(userId: string, groupId: string) {
    super(
      `User ${userId} appears in the records of group ${groupId} but is not one of its two members`,
    );
  }
}
