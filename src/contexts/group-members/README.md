# group-members

Leaf bounded context: it owns the roster of each group, enforces the member
limit and answers membership checks. It has **no outgoing ports** and imports
no other context. Consumers (groups, group-invitation-codes, expenses,
payments, balances) own their ports and reach this context through adapters
that dispatch the commands and queries below on the bus.

## Domain

| Concept | Notes |
|---|---|
| `GroupMembershipAggregate` | One roster per group; its id **is** the group id. Holds `capacity` (default 2), `version` and the members. |
| `GroupMember` | Roster line: `userId` (opaque identity-provider subject, max 64 chars), `role` (`OWNER` or `MEMBER`), `joinedAt`. |
| `GroupMemberRole` | `OWNER`, `MEMBER`; registered in GraphQL as `GroupMemberRole`. |
| `GroupMembershipCapacityValueObject` | Integer >= 1. Raising the limit is a data change (`group_memberships.capacity`). |

Invariants live in the aggregate:

- `addMember()` throws `GroupMemberAlreadyExistsException` for a duplicate user
  (checked first, so a member re-joining is never reported as "full") and
  `GroupMembershipFullException` when the roster reached its capacity.
- `create()` emits `GroupMembershipCreatedEvent`; `addMember()` emits
  `GroupMemberAddedEvent`.

## Application

| Message | Kind | Result |
|---|---|---|
| `CreateGroupMembershipCommand { groupId, ownerId }` | command | Creates the roster with the owner as `OWNER`. Fails if it already exists. |
| `AddGroupMemberCommand { groupId, userId }` | command | Adds a `MEMBER`; enforces limit and duplicates. |
| `GroupMemberIsMemberQuery { groupId, userId }` | query | `boolean`. |
| `GroupMembersFindByGroupIdQuery { groupId }` | query | Roster view model. Trusted lookup for ports: the caller checks membership itself. |
| `GroupMembershipFindGroupIdsByUserQuery { userId }` | query | `string[]` of group ids. |
| `GroupMembersListQuery { groupId, requesterId }` | query | Roster view model; throws `GroupMemberAccessDeniedException` unless the requester is a member. Used by the GraphQL resolver. |

## Persistence

Tables (migration `1780000000000-CreateGroupMemberships`):

- `group_memberships` (PK `group_id`, `capacity` CHECK > 0, `version`).
- `group_members` (`UNIQUE (group_id, user_id)`, FK to `group_memberships`,
  `role` CHECK, index on `user_id`).

The write repository saves in one transaction and is guarded by an optimistic
lock: `UPDATE ... WHERE group_id = ? AND version = ?` bumps the version and
throws `GroupMembershipConcurrencyException` when no row matched, so two
concurrent joins can never exceed the limit. A new roster is saved with
version `0` (inserted as `1`).

The read repository queries the same tables directly; it does not extend
`IBaseReadRepository` because there is no separate projection store.

## Transport (GraphQL only)

`groupMembers(groupId: ID!): [GroupMember!]!` behind `ClerkAuthGuard`; the
requester is always the authenticated user, never an input.

## Tests

- Unit: `pnpm test src/contexts/group-members`.
- Integration (real Postgres, optimistic lock): `pnpm test:integration`
  (`test/integration/group-members`).
