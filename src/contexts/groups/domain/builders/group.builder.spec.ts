import { GroupBuilder } from '@contexts/groups/domain/builders/group.builder';
import { FieldIsRequiredException } from '@sisques-labs/nestjs-kit';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const CREATED = new Date('2026-01-01T09:00:00Z');
const UPDATED = new Date('2026-01-02T09:00:00Z');

const withRequired = (builder: GroupBuilder): GroupBuilder =>
  builder.withId(ID).withName('Home').withCreatedBy('user_A');

describe('GroupBuilder state isolation', () => {
  let builder: GroupBuilder;

  beforeEach(() => {
    builder = new GroupBuilder();
  });

  it('does not leak dates or fields from a previous build()', () => {
    withRequired(builder).withCreatedAt(CREATED).withUpdatedAt(UPDATED).build();

    const primitives = withRequired(builder)
      .withName('Trip')
      .build()
      .toPrimitives();

    expect(primitives.name).toBe('Trip');
    expect(primitives.createdAt).not.toEqual(CREATED);
    expect(primitives.updatedAt).not.toEqual(UPDATED);
  });

  it('does not leak dates from a previous buildViewModel()', () => {
    withRequired(builder)
      .withCreatedAt(CREATED)
      .withUpdatedAt(UPDATED)
      .buildViewModel();

    const viewModel = withRequired(builder).buildViewModel();

    expect(viewModel.createdAt).not.toEqual(CREATED);
    expect(viewModel.updatedAt).not.toEqual(UPDATED);
  });

  it('forgets the id and name after build()', () => {
    withRequired(builder).build();

    expect(() => builder.withCreatedBy('user_A').build()).toThrow(
      FieldIsRequiredException,
    );
  });

  it('is not contaminated by a build() that failed validation', () => {
    expect(() =>
      builder.withName('Leaked').withCreatedAt(CREATED).build(),
    ).toThrow(FieldIsRequiredException);

    expect(() => builder.withId(ID).withCreatedBy('user_A').build()).toThrow();

    const primitives = withRequired(builder).build().toPrimitives();

    expect(primitives.name).toBe('Home');
    expect(primitives.createdAt).not.toEqual(CREATED);
  });

  it('is not contaminated by a buildViewModel() that failed validation', () => {
    expect(() =>
      builder.withName('Leaked').withCreatedAt(CREATED).buildViewModel(),
    ).toThrow(FieldIsRequiredException);

    const viewModel = withRequired(builder).buildViewModel();

    expect(viewModel.name).toBe('Home');
    expect(viewModel.createdAt).not.toEqual(CREATED);
  });
});
