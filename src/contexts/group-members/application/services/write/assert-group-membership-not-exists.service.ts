import { GroupMembershipAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-membership-already-exists.exception';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  GroupMembershipWriteRepository,
} from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssertGroupMembershipNotExistsService {
  constructor(
    @Inject(GROUP_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly repository: GroupMembershipWriteRepository,
  ) {}

  async execute(groupId: string): Promise<void> {
    if (await this.repository.findById(groupId)) {
      throw new GroupMembershipAlreadyExistsException(groupId);
    }
  }
}
