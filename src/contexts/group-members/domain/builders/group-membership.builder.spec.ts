import { DEFAULT_GROUP_MEMBERSHIP_CAPACITY } from '@contexts/group-members/domain/constants/default-group-membership-capacity.constant';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const CREATED = new Date('2026-01-01T09:00:00Z');
const UPDATED = new Date('2026-01-02T09:00:00Z');
const OWNER = {
  userId: 'owner',
  role: GroupMemberRole.OWNER,
  joinedAt: CREATED,
};

const withOptionals = (
  builder: GroupMembershipBuilder,
): GroupMembershipBuilder =>
  builder
    .withId(GROUP_ID)
    .withCapacity(3)
    .withVersion(7)
    .withMembers([OWNER])
    .withCreatedAt(CREATED)
    .withUpdatedAt(UPDATED);

describe('GroupMembershipBuilder state isolation', () => {
  let builder: GroupMembershipBuilder;

  beforeEach(() => {
    builder = new GroupMembershipBuilder();
  });

  it('does not leak optional fields from a previous build()', () => {
    withOptionals(builder).build();

    const primitives = builder.withId(GROUP_ID).build().toPrimitives();

    expect(primitives.capacity).toBe(DEFAULT_GROUP_MEMBERSHIP_CAPACITY);
    expect(primitives.version).toBe(0);
    expect(primitives.members).toEqual([]);
    expect(primitives.createdAt).not.toEqual(CREATED);
    expect(primitives.updatedAt).not.toEqual(UPDATED);
  });

  it('does not leak optional fields from a previous buildViewModel()', () => {
    withOptionals(builder).buildViewModel();

    const viewModel = builder.withId(GROUP_ID).buildViewModel();

    expect(viewModel.capacity).toBe(DEFAULT_GROUP_MEMBERSHIP_CAPACITY);
    expect(viewModel.members).toEqual([]);
  });

  it('does not share the members array with a returned view model', () => {
    const first = withOptionals(builder).buildViewModel();

    builder.withId(GROUP_ID).withMembers([]).buildViewModel();

    expect(first.members).toEqual([OWNER]);
  });

  it('forgets the id after build()', () => {
    withOptionals(builder).build();

    expect(() => builder.build()).toThrow(FieldIsRequiredException);
  });

  it('is not contaminated by a build() that failed validation', () => {
    expect(() =>
      builder.withCapacity(3).withVersion(7).withMembers([OWNER]).build(),
    ).toThrow(FieldIsRequiredException);

    const primitives = builder.withId(GROUP_ID).build().toPrimitives();

    expect(primitives.capacity).toBe(DEFAULT_GROUP_MEMBERSHIP_CAPACITY);
    expect(primitives.version).toBe(0);
    expect(primitives.members).toEqual([]);
  });

  it('is not contaminated by a buildViewModel() that failed validation', () => {
    expect(() =>
      builder.withCapacity(3).withMembers([OWNER]).buildViewModel(),
    ).toThrow(FieldIsRequiredException);

    const viewModel = builder.withId(GROUP_ID).buildViewModel();

    expect(viewModel.capacity).toBe(DEFAULT_GROUP_MEMBERSHIP_CAPACITY);
    expect(viewModel.members).toEqual([]);
  });
});
