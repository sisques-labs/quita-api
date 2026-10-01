import { GroupInvitationCodePrimitives } from '@contexts/group-invitation-codes/domain/primitives/group-invitation-code.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of an invitation code. */
export class GroupInvitationCodeViewModel extends BaseViewModel {
  readonly groupId: string;
  readonly code: string;
  readonly createdBy: string;
  readonly revokedAt: Date | null;

  constructor(props: GroupInvitationCodePrimitives) {
    super(props.id, props.createdAt, props.updatedAt);
    this.groupId = props.groupId;
    this.code = props.code;
    this.createdBy = props.createdBy;
    this.revokedAt = props.revokedAt;
  }
}
