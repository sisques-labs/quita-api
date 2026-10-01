import { GroupInvitationCodeBuilder } from '@contexts/group-invitation-codes/domain/builders/group-invitation-code.builder';
import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const CREATED = new Date('2026-01-01T09:00:00Z');
const UPDATED = new Date('2026-01-02T09:00:00Z');
const REVOKED = new Date('2026-01-03T09:00:00Z');

const withRequired = (
  builder: GroupInvitationCodeBuilder,
): GroupInvitationCodeBuilder =>
  builder
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withCode('7KQ2M9XZ')
    .withCreatedBy('user_A');

const withOptionals = (
  builder: GroupInvitationCodeBuilder,
): GroupInvitationCodeBuilder =>
  withRequired(builder)
    .withRevokedAt(REVOKED)
    .withCreatedAt(CREATED)
    .withUpdatedAt(UPDATED);

describe('GroupInvitationCodeBuilder state isolation', () => {
  let builder: GroupInvitationCodeBuilder;

  beforeEach(() => {
    builder = new GroupInvitationCodeBuilder();
  });

  it('does not leak optional fields from a previous build()', () => {
    withOptionals(builder).build();

    const primitives = withRequired(builder).build().toPrimitives();

    expect(primitives.revokedAt).toBeNull();
    expect(primitives.createdAt).not.toEqual(CREATED);
    expect(primitives.updatedAt).not.toEqual(UPDATED);
  });

  it('does not leak optional fields from a previous buildViewModel()', () => {
    withOptionals(builder).buildViewModel();

    const viewModel = withRequired(builder).buildViewModel();

    expect(viewModel.revokedAt).toBeNull();
  });

  it('forgets the id after build()', () => {
    withOptionals(builder).build();

    expect(() =>
      builder
        .withGroupId(GROUP_ID)
        .withCode('7KQ2M9XZ')
        .withCreatedBy('user_A')
        .build(),
    ).toThrow(FieldIsRequiredException);
  });

  it('is not contaminated by a build() that failed validation', () => {
    expect(() =>
      builder
        .withGroupId(GROUP_ID)
        .withRevokedAt(REVOKED)
        .withCreatedAt(CREATED)
        .build(),
    ).toThrow(FieldIsRequiredException);

    const primitives = withRequired(builder).build().toPrimitives();

    expect(primitives.revokedAt).toBeNull();
    expect(primitives.createdAt).not.toEqual(CREATED);
  });

  it('is not contaminated by a buildViewModel() that failed validation', () => {
    expect(() =>
      builder.withGroupId(GROUP_ID).withRevokedAt(REVOKED).buildViewModel(),
    ).toThrow(FieldIsRequiredException);

    const viewModel = withRequired(builder).buildViewModel();

    expect(viewModel.revokedAt).toBeNull();
  });
});
