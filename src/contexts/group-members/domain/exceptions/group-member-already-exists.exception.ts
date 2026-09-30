import { BaseException } from '@sisques-labs/nestjs-kit';

export class GroupMemberAlreadyExistsException extends BaseException {
  constructor(userId: string, groupId: string) {
    super(`User ${userId} is already a member of group ${groupId}`);
  }
}
