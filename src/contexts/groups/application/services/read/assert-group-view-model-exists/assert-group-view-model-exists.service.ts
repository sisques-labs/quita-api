import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import {
  GROUP_READ_REPOSITORY,
  IGroupReadRepository,
} from '@contexts/groups/domain/repositories/read/group-read.repository';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertGroupViewModelExistsService implements IBaseService<
  UuidValueObject,
  GroupViewModel
> {
  constructor(
    @Inject(GROUP_READ_REPOSITORY)
    private readonly repository: IGroupReadRepository,
  ) {}

  async execute(groupId: UuidValueObject): Promise<GroupViewModel> {
    const viewModel = await this.repository.findById(groupId.value);
    if (!viewModel) {
      throw new GroupNotFoundException(groupId.value);
    }
    return viewModel;
  }
}
