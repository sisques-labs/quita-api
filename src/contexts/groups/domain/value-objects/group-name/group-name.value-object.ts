import { StringValueObject } from '@sisques-labs/nestjs-kit';

export const GROUP_NAME_MAX_LENGTH = 80;

/** Display name of a group: required, trimmed, at most 80 characters. */
export class GroupNameValueObject extends StringValueObject {
  constructor(value: string) {
    super(value.trim(), {
      minLength: 1,
      maxLength: GROUP_NAME_MAX_LENGTH,
      allowEmpty: false,
    });
  }
}
