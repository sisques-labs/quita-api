import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

/** The owner is never an input: it is the authenticated user. */
@InputType('CreateGroupInput')
export class CreateGroupInput {
  @Field(() => String)
  @IsString()
  name!: string;
}
