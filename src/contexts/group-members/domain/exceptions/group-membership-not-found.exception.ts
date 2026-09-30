import { BaseException } from '@sisques-labs/nestjs-kit';

export class GroupMembershipNotFoundException extends BaseException {
  constructor(groupId: string) {
    super(`Membership of group ${groupId} not found`);
  }
}
