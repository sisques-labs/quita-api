import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type GroupInvitationCodePrimitives = BasePrimitives & {
  groupId: string;
  code: string;
  createdBy: string;
  revokedAt: Date | null;
};
