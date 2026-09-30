import { GroupNameValueObject } from '@contexts/groups/domain/value-objects/group-name/group-name.value-object';

describe('GroupNameValueObject', () => {
  it('accepts a regular name and keeps it', () => {
    expect(new GroupNameValueObject('Home').value).toBe('Home');
  });

  it('trims surrounding whitespace', () => {
    expect(new GroupNameValueObject('  Trip to Rome  ').value).toBe(
      'Trip to Rome',
    );
  });

  it('rejects an empty name', () => {
    expect(() => new GroupNameValueObject('')).toThrow();
  });

  it('rejects a blank name', () => {
    expect(() => new GroupNameValueObject('   ')).toThrow();
  });

  it('rejects a name longer than 80 characters', () => {
    expect(() => new GroupNameValueObject('n'.repeat(81))).toThrow();
    expect(new GroupNameValueObject('n'.repeat(80)).value).toHaveLength(80);
  });
});
