import { BaseException } from '@sisques-labs/nestjs-kit';

export class GroupMembershipFullException extends BaseException {
  constructor(groupId: string, capacity: number) {
    super(`Group ${groupId} has reached its member limit of ${capacity}`);
  }
}
