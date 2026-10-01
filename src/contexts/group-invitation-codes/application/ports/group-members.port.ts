export const GROUP_MEMBERS_PORT = Symbol('GROUP_MEMBERS_PORT');

export enum AddMemberResult {
  ADDED = 'ADDED',
  ALREADY_MEMBER = 'ALREADY_MEMBER',
}

/**
 * Consumer-owned port towards the group-members context. Its adapter lives in
 * infrastructure and dispatches the provider's commands/queries on the bus.
 */
export interface GroupMembersPort {
  isMember(groupId: string, userId: string): Promise<boolean>;
  /**
   * Adds `userId` to the group's roster. A user who already belongs to it is
   * reported as `ALREADY_MEMBER` (not an error); any other failure, such as a
   * full group, propagates.
   */
  addMember(groupId: string, userId: string): Promise<AddMemberResult>;
}
