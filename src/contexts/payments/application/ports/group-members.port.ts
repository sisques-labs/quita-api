export const GROUP_MEMBERS_PORT = Symbol('GROUP_MEMBERS_PORT');

/**
 * Consumer-owned port towards the group-members context. Its adapter lives in
 * infrastructure and dispatches the provider's queries on the bus.
 */
export interface GroupMembersPort {
  isMember(groupId: string, userId: string): Promise<boolean>;
}
