import { BaseException } from '@sisques-labs/nestjs-kit';

export class GroupMembershipAlreadyExistsException extends BaseException {
  constructor(groupId: string) {
    super(`Membership of group ${groupId} already exists`);
  }
}
