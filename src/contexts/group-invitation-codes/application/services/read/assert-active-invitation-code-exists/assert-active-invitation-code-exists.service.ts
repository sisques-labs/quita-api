import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import {
  GROUP_INVITATION_CODE_READ_REPOSITORY,
  IGroupInvitationCodeReadRepository,
} from '@contexts/group-invitation-codes/domain/repositories/read/group-invitation-code-read.repository';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { Inject, Injectable } from '@nestjs/common';
import { IBaseService } from '@sisques-labs/nestjs-kit';

/**
 * Resolves a code to its active record; unknown and revoked codes are invalid.
 * Malformed codes are already rejected by `InvitationCodeValueObject`.
 */
@Injectable()
export class AssertActiveInvitationCodeExistsService implements IBaseService<
  InvitationCodeValueObject,
  GroupInvitationCodeViewModel
> {
  constructor(
    @Inject(GROUP_INVITATION_CODE_READ_REPOSITORY)
    private readonly repository: IGroupInvitationCodeReadRepository,
  ) {}

  async execute(
    code: InvitationCodeValueObject,
  ): Promise<GroupInvitationCodeViewModel> {
    const viewModel = await this.repository.findActiveByCode(code.value);
    if (!viewModel) {
      throw new InvitationCodeInvalidException();
    }
    return viewModel;
  }
}
