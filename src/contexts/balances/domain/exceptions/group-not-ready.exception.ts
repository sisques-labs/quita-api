import { BaseException } from '@sisques-labs/nestjs-kit';

export class GroupNotReadyException extends BaseException {
  constructor(groupId: string) {
    super(`Group ${groupId} needs exactly two members to compute a balance`);
  }
}
