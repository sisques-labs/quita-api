# groups

Bounded context for the group lifecycle: a shared space that isolates expenses
and payments. It owns the group itself (name, creator) and delegates "who
belongs to it" to `group-members` through a consumer-owned port.

## Domain

| Concept | Notes |
|---|---|
| `GroupAggregate` | `id`, `name`, `createdBy`, timestamps. `create()` emits `GroupCreatedEvent`. |
| `GroupNameValueObject` | Trimmed, non-blank, at most 80 characters. |
| `GroupCreatedByValueObject` | Opaque identity-provider subject (max 64 chars). |

## Application

| Message | Kind | Result |
|---|---|---|
| `CreateGroupCommand { name, ownerId }` | command | Saves the group, calls `createMembership` on the port, publishes `GroupCreatedEvent`; returns the group id. If the port fails the group is deleted (compensation) and the original error is rethrown. |
| `GroupFindByIdQuery { groupId, requesterId }` | query | Membership is checked first (non-members get `GroupAccessDeniedException`, so existence is not revealed), then the view model or `GroupNotFoundException`. |
| `GroupsFindOwnQuery { requesterId }` | query | Only the groups the requester belongs to. |

## Cross-context port

`GroupMembershipPort` (`application/ports`) is implemented by
`GroupMembershipBusAdapter` (`infrastructure/adapters`), the only place allowed
to import another context. It maps to group-members' public messages only:

| Port method | group-members message |
|---|---|
| `createMembership(groupId, ownerId)` | `CreateGroupMembershipCommand` |
| `isMember(groupId, userId)` | `GroupMemberIsMemberQuery` |
| `listGroupIdsForUser(userId)` | `GroupMembershipFindGroupIdsByUserQuery` |

`GroupsModule` does not import `GroupMembersModule`: the CQRS buses are shared
and both modules are registered in `ContextsModule`.

## Persistence

Table `groups` (migration `1780000000001-CreateGroups`): PK `id`, `name`
(CHECK not blank), `created_by` (indexed). The read repository queries the
table directly and does not extend `IBaseReadRepository` (no projection store).

## Transport (GraphQL only)

All operations sit behind `ClerkAuthGuard`; the requester is always the
authenticated user (`@AuthUser()`), never an input.

| Operation | Result |
|---|---|
| `createGroup(input: { name }): MutationResponseDto` | `id` of the new group. |
| `group(id: ID!): Group` | Members only. |
| `groups: [Group!]!` | Groups the caller belongs to. |

This context defines no GraphQL enums, so it has no registered-enums file.

## Tests

- Unit: `pnpm test src/contexts/groups`.
- Integration (real Postgres, real buses, compensation): `pnpm test:integration`
  (`test/integration/groups`).
- E2E (create, read, isolation, invalid name, auth): `pnpm test:e2e`
  (`test/e2e/groups.e2e-spec.ts`).
