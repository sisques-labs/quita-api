import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import {
  GROUP_MEMBERSHIP_READ_REPOSITORY,
  GroupMembershipReadRepository,
} from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertGroupMembershipViewModelExistsService implements IBaseService<
  UuidValueObject,
  GroupMembershipViewModel
> {
  constructor(
    @Inject(GROUP_MEMBERSHIP_READ_REPOSITORY)
    private readonly repository: GroupMembershipReadRepository,
  ) {}

  async execute(groupId: UuidValueObject): Promise<GroupMembershipViewModel> {
    const viewModel = await this.repository.findByGroupId(groupId.value);
    if (!viewModel) {
      throw new GroupMembershipNotFoundException(groupId.value);
    }
    return viewModel;
  }
}
