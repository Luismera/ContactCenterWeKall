import { InteractionType } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CreateInteractionDto {
  @IsEnum(InteractionType, {
    message: 'type must be one of: call, ticket',
  })
  type: InteractionType;

  @IsUUID('4', { message: 'agentId must be a valid UUID' })
  agentId: string;
}
