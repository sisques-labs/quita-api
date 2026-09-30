import { BaseException } from '@sisques-labs/nestjs-kit';

export class GroupNotFoundException extends BaseException {
  constructor(groupId: string) {
    super(`Group ${groupId} not found`);
  }
}
