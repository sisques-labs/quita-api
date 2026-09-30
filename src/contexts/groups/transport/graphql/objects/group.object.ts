import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('Group')
export class GroupObject {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  createdBy!: string;

  @Field(() => Date)
  createdAt!: Date;
}
