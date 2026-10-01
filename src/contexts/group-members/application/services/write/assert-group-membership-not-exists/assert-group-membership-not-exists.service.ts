import { GroupMembershipAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-membership-already-exists.exception';
import {
  GROUP_MEMBERSHIP_WRITE_REPOSITORY,
  IGroupMembershipWriteRepository,
} from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService, UuidValueObject } from '@sisques-labs/nestjs-kit';

@Injectable()
export class AssertGroupMembershipNotExistsService implements IBaseService<
  UuidValueObject,
  void
> {
  constructor(
    @Inject(GROUP_MEMBERSHIP_WRITE_REPOSITORY)
    private readonly repository: IGroupMembershipWriteRepository,
  ) {}

  async execute(groupId: UuidValueObject): Promise<void> {
    if (await this.repository.findById(groupId.value)) {
      throw new GroupMembershipAlreadyExistsException(groupId.value);
    }
  }
}
