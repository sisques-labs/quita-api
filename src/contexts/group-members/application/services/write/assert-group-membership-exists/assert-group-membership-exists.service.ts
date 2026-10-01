import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  GroupMembershipWriteRepository,
} from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssertGroupMembershipExistsService {
  constructor(
    @Inject(GROUP_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly repository: GroupMembershipWriteRepository,
  ) {}

  async execute(groupId: string): Promise<GroupMembershipAggregate> {
    const aggregate = await this.repository.findById(groupId);
    if (!aggregate) {
      throw new GroupMembershipNotFoundException(groupId);
    }
    return aggregate;
  }
}
