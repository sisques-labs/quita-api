import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupNotFoundException } from '@contexts/groups/domain/exceptions/group-not-found.exception';
import {
  GROUP_WRITE_REPOSITORY,
  GroupWriteRepository,
} from '@contexts/groups/domain/repositories/write/group-write.repository';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class AssertGroupExistsService {
  constructor(
    @Inject(GROUP_WRITE_REPOSITORY)
    private readonly repository: GroupWriteRepository,
  ) {}

  async execute(groupId: string): Promise<GroupAggregate> {
    const group = await this.repository.findById(groupId);
    if (!group) {
      throw new GroupNotFoundException(groupId);
    }
    return group;
  }
}
