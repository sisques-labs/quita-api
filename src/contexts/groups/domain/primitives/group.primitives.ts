import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type GroupPrimitives = BasePrimitives & {
  name: string;
  createdBy: string;
};
