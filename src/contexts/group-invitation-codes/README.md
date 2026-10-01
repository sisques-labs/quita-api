# group-invitation-codes

Bounded context for the shareable codes that let a user join a group. A code is
reusable, never expires and stays valid until it is regenerated. It reaches
`group-members` only through a consumer-owned port.

## Domain

| Concept | Notes |
|---|---|
| `GroupInvitationCodeAggregate` | `id`, `groupId`, `code`, `createdBy`, `revokedAt`, timestamps. `create()` and `revoke()` emit events; revoking twice keeps the first revocation. |
| `InvitationCodeValueObject` | 8 characters, Crockford base32, normalized (`I`/`L` -> `1`, `O` -> `0`, upper case). |

## Application

| Message | Kind | Result |
|---|---|---|
| `GenerateInvitationCodeCommand { groupId, requesterId }` | command | Members only. Returns the group's active code, creating one only when it has none. |
| `RegenerateInvitationCodeCommand { groupId, requesterId }` | command | Members only. Revokes the active code and inserts a new one in one transaction. |
| `RedeemInvitationCodeCommand { code, requesterId }` | command | Adds the requester to the group behind an active code; returns the group id. Unknown, malformed or revoked codes throw `InvitationCodeInvalidException`. A user already in the group is a success. A full group propagates its error. |
| `InvitationCodeValidateQuery { code }` | query | Resolves an active code to its view model or throws `InvitationCodeInvalidException`. |

## Cross-context port

`GroupMembersPort` (`application/ports`) is implemented by
`GroupMembersBusAdapter` (`infrastructure/adapters`), the only place allowed to
import another context. It maps to group-members' public messages only:

| Port method | group-members message |
|---|---|
| `isMember(groupId, userId)` | `GroupMemberIsMemberQuery` |
| `addMember(groupId, userId)` | `AddGroupMemberCommand`; `GroupMemberAlreadyExistsException` becomes `AddMemberResult.ALREADY_MEMBER`, every other error (for example `GroupMembershipFullException`) propagates |

`GroupInvitationCodesModule` does not import `GroupMembersModule`: the CQRS
buses are shared and both modules are registered in `ContextsModule`.
`CryptoInvitationCodeGenerator` (`crypto.randomInt`, no modulo bias) is bound to
`InvitationCodeGeneratorPort`.

## Persistence and concurrency

Table `group_invitation_codes` (migration `1780000000002-CreateGroupInvitationCodes`):

- `UNIQUE (code)` (`uq_group_invitation_codes_code`).
- Partial `UNIQUE (group_id) WHERE revoked_at IS NULL`
  (`uq_group_invitation_codes_active_group`): one active code per group.

`IGroupInvitationCodeReadRepository` extends
`IBaseReadRepository<GroupInvitationCodeViewModel>` (plus `findActiveByCode`):
`findById` and `findByCriteria` are real, while `save` and `delete` are no-ops
(the write side persists). `findByCriteria` (read and write repositories) is
persistence-only: revoked rows are included and the whitelist
(`group-invitation-code-queryable-fields.ts`) is `id`, `groupId`, `code`,
`createdBy`, `revokedAt`, `createdAt` and `updatedAt`. It is not exposed through
GraphQL.

The write repository maps PostgreSQL unique violations (`23505`) to domain errors:

| Cause | Error | Handling |
|---|---|---|
| Generated code already exists | `InvitationCodeCollisionException` | Generate and Regenerate retry with a fresh code, at most 3 attempts (`withCodeCollisionRetry`), then the error propagates. |
| Another request changed the group's active code first | `ActiveInvitationCodeConflictException` | Generate returns the winner's code. Regenerate propagates the error (the client may retry). |

`replaceActive(revoked | null, created)` runs in a single transaction: the old
row is revoked only while it is still active (`revoked_at IS NULL`), then the
new row is inserted, so a group never ends up with zero or two active codes.

## Transport (GraphQL only)

All operations sit behind `ClerkAuthGuard`; the requester is always the
authenticated user (`@AuthUser()`), never an input.

| Operation | Result |
|---|---|
| `generateInvitationCode(input: GroupInvitationCodeGenerateRequestDto): GroupInvitationCodeResponseDto` | `{ groupId, code }` |
| `regenerateInvitationCode(input: GroupInvitationCodeRegenerateRequestDto): GroupInvitationCodeResponseDto` | `{ groupId, code }` |
| `redeemInvitationCode(input: GroupInvitationCodeRedeemRequestDto): MutationResponseDto` | `id` of the joined group |

This context defines no GraphQL enums, so it has no registered-enums file.

## Tests

- Unit: `pnpm test src/contexts/group-invitation-codes`.
- Integration (real Postgres, real buses, constraints, concurrency):
  `pnpm test:integration` (`test/integration/group-invitation-codes`).
- E2E (join, full group, regenerate, auth): `pnpm test:e2e`
  (`test/e2e/group-invitation-codes.e2e-spec.ts`).
