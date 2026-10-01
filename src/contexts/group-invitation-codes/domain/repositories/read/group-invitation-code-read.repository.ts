import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const GROUP_INVITATION_CODE_READ_REPOSITORY = Symbol(
  'GROUP_INVITATION_CODE_READ_REPOSITORY',
);

/**
 * Query view over `group_invitation_codes`. There is no separate projection
 * store, so `save` / `delete` are no-ops (the write side persists).
 * `findByCriteria` is persistence-only (revoked rows included) and is not
 * exposed through GraphQL.
 */
export interface IGroupInvitationCodeReadRepository extends IBaseReadRepository<GroupInvitationCodeViewModel> {
  /** Only non-revoked codes match; `code` is already normalized. */
  findActiveByCode(code: string): Promise<GroupInvitationCodeViewModel | null>;
}
