import { GROUP_NAME_MAX_LENGTH } from '@contexts/groups/domain/constants/group-name-max-length.constant';
import { StringValueObject } from '@sisques-labs/nestjs-kit';

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
