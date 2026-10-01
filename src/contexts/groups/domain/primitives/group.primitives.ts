import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type IGroupPrimitives = BasePrimitives & {
  name: string;
  createdBy: string;
};
