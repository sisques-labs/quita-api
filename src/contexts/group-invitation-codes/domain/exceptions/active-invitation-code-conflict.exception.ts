import { BaseException } from '@sisques-labs/nestjs-kit';

/** Thrown when a concurrent request changed the group's active code first. */
export class ActiveInvitationCodeConflictException extends BaseException {
  constructor(groupId: string) {
    super(
      `The active invitation code of group ${groupId} changed concurrently`,
    );
  }
}
