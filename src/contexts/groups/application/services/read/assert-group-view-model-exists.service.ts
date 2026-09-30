import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import {
  GROUP_READ_REPOSITORY,
  GroupReadRepository,
} from '@contexts/groups/domain/repositories/read/group-read.repository';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssertGroupViewModelExistsService {
  constructor(
    @Inject(GROUP_READ_REPOSITORY)
    private readonly repository: GroupReadRepository,
  ) {}

  async execute(groupId: string): Promise<GroupViewModel> {
    const viewModel = await this.repository.findById(groupId);
    if (!viewModel) {
      throw new GroupNotFoundException(groupId);
    }
    return viewModel;
  }
}
