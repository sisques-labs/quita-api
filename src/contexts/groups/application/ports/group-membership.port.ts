export const GROUP_MEMBERSHIP_PORT = Symbol('GROUP_MEMBERSHIP_PORT');

/**
 * Consumer-owned port towards the group-members context. Its adapter lives in
 * infrastructure and dispatches the provider's commands/queries on the bus.
 */
export interface GroupMembershipPort {
  /** Makes `ownerId` the first (OWNER) member of the group's roster. */
  createMembership(groupId: string, ownerId: string): Promise<void>;
  isMember(groupId: string, userId: string): Promise<boolean>;
  listGroupIdsForUser(userId: string): Promise<string[]>;
  deleteMemberships(groupId: string): Promise<void>;
}
