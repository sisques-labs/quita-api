import { BaseException } from '@sisques-labs/nestjs-kit';

export class GroupAccessDeniedException extends BaseException {
  constructor(userId: string, groupId: string) {
    super(`User ${userId} is not a member of group ${groupId}`);
  }
}
