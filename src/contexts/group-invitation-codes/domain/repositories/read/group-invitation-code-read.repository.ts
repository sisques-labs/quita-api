import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';

export const GROUP_INVITATION_CODE_READ_REPOSITORY = Symbol(
  'GROUP_INVITATION_CODE_READ_REPOSITORY',
);

/**
 * Query-only view over `group_invitation_codes`. It does not extend
 * `IBaseReadRepository`: there is no separate projection store.
 */
export interface GroupInvitationCodeReadRepository {
  /** Only non-revoked codes match; `code` is already normalized. */
  findActiveByCode(code: string): Promise<GroupInvitationCodeViewModel | null>;
}
