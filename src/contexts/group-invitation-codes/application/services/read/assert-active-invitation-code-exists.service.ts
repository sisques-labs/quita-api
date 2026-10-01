import { InvitationCodeInvalidException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-invalid.exception';
import {
  GROUP_INVITATION_CODE_READ_REPOSITORY,
  GroupInvitationCodeReadRepository,
} from '@contexts/group-invitation-codes/domain/repositories/read/group-invitation-code-read.repository';
import { InvitationCodeValueObject } from '@contexts/group-invitation-codes/domain/value-objects/invitation-code/invitation-code.value-object';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { Inject, Injectable } from '@nestjs/common';

/** Resolves a raw code to its active record; malformed, unknown and revoked codes are all invalid. */
@Injectable()
export class AssertActiveInvitationCodeExistsService {
  constructor(
    @Inject(GROUP_INVITATION_CODE_READ_REPOSITORY)
    private readonly repository: GroupInvitationCodeReadRepository,
  ) {}

  async execute(rawCode: string): Promise<GroupInvitationCodeViewModel> {
    const code = new InvitationCodeValueObject(rawCode);
    const viewModel = await this.repository.findActiveByCode(code.value);
    if (!viewModel) {
      throw new InvitationCodeInvalidException();
    }
    return viewModel;
  }
}
