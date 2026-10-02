import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('GroupResponseDto')
export class GroupResponseDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  createdBy!: string;

  @Field(() => Date)
  createdAt!: Date;
}
