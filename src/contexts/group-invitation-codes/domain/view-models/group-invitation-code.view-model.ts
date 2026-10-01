import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of an invitation code. */
export class GroupInvitationCodeViewModel extends BaseViewModel {
  constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    readonly groupId: string,
    readonly code: string,
    readonly createdBy: string,
    readonly revokedAt: Date | null,
  ) {
    super(id, createdAt, updatedAt);
  }
}
