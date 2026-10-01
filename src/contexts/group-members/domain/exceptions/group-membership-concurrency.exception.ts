import { BaseException } from '@sisques-labs/nestjs-kit';

/** Another writer changed the roster since it was loaded. */
export class GroupMembershipConcurrencyException extends BaseException {
  constructor(groupId: string) {
    super(`Membership of group ${groupId} was modified concurrently; retry`);
  }
}
