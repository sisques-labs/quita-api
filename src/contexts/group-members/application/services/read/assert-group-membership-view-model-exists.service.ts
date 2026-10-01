import { GroupMembershipNotFoundException } from '@contexts/group-members/domain/exceptions/group-membership-not-found.exception';
import {
  GROUP_MEMBERSHIP_READ_REPOSITORY,
  GroupMembershipReadRepository,
} from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssertGroupMembershipViewModelExistsService {
  constructor(
    @Inject(GROUP_MEMBERSHIP_READ_REPOSITORY)
    private readonly repository: GroupMembershipReadRepository,
  ) {}

  async execute(groupId: string): Promise<GroupMembershipViewModel> {
    const viewModel = await this.repository.findByGroupId(groupId);
    if (!viewModel) {
      throw new GroupMembershipNotFoundException(groupId);
    }
    return viewModel;
  }
}
