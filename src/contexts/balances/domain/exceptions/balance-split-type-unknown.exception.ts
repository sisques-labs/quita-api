import { BaseException } from '@sisques-labs/nestjs-kit';

export class BalanceSplitTypeUnknownException extends BaseException {
  constructor(splitType: string) {
    super(`Unknown expense split type "${splitType}"`);
  }
}
