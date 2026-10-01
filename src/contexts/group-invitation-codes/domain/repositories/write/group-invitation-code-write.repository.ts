import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const GROUP_INVITATION_CODE_WRITE_REPOSITORY = Symbol(
  'GROUP_INVITATION_CODE_WRITE_REPOSITORY',
);

export interface IGroupInvitationCodeWriteRepository extends IBaseWriteRepository<GroupInvitationCodeAggregate> {
  /** The group's single non-revoked code, if it has one. */
  findActiveByGroupId(
    groupId: string,
  ): Promise<GroupInvitationCodeAggregate | null>;

  /**
   * Persists the revocation of `revoked` (when given) and the insertion of
   * `created` atomically, so a group never has zero or two active codes.
   */
  replaceActive(
    revoked: GroupInvitationCodeAggregate | null,
    created: GroupInvitationCodeAggregate,
  ): Promise<void>;
}
