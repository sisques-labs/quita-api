import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  GroupMembershipWriteRepository,
} from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertGroupMembershipExistsService implements IBaseService<
  UuidValueObject,
  GroupMembershipAggregate
> {
  constructor(
    @Inject(GROUP_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly repository: GroupMembershipWriteRepository,
  ) {}

  async execute(groupId: UuidValueObject): Promise<GroupMembershipAggregate> {
    const aggregate = await this.repository.findById(groupId.value);
    if (!aggregate) {
      throw new GroupMembershipNotFoundException(groupId.value);
    }
    return aggregate;
  }
}
