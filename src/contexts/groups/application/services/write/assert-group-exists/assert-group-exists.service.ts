import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import {
  GROUP_WRITE_REPOSITORY,
  IGroupWriteRepository,
} from '@contexts/groups/domain/repositories/write/group-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertGroupExistsService implements IBaseService<
  UuidValueObject,
  GroupAggregate
> {
  constructor(
    @Inject(GROUP_WRITE_REPOSITORY)
    private readonly repository: IGroupWriteRepository,
  ) {}

  async execute(groupId: UuidValueObject): Promise<GroupAggregate> {
    const group = await this.repository.findById(groupId.value);
    if (!group) {
      throw new GroupNotFoundException(groupId.value);
    }
    return group;
  }
}
