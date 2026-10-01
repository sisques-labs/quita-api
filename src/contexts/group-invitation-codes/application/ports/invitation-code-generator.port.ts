export const INVITATION_CODE_GENERATOR = Symbol('INVITATION_CODE_GENERATOR');

/** Produces fresh, unguessable, human-shareable codes. */
export interface InvitationCodeGeneratorPort {
  generate(): string;
}
