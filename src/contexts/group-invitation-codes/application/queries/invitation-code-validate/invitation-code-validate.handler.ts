import { InvitationCodeValidateQuery } from '@contexts/group-invitation-codes/application/queries/invitation-code-validate/invitation-code-validate.query';
import { AssertActiveInvitationCodeExistsService } from '@contexts/group-invitation-codes/application/services/read/assert-active-invitation-code-exists/assert-active-invitation-code-exists.service';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

/** Resolves a code to its group, or throws `InvitationCodeInvalidException`. */
@QueryHandler(InvitationCodeValidateQuery)
export class InvitationCodeValidateHandler implements IQueryHandler<
  InvitationCodeValidateQuery,
  GroupInvitationCodeViewModel
> {
  constructor(
    private readonly assertCodeExists: AssertActiveInvitationCodeExistsService,
  ) {}

  execute(
    query: InvitationCodeValidateQuery,
  ): Promise<GroupInvitationCodeViewModel> {
    return this.assertCodeExists.execute(query.code);
  }
}
