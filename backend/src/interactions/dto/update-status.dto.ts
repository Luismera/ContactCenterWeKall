import { InteractionStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(InteractionStatus, {
    message: 'status must be one of: open, in_progress, resolved',
  })
  status: InteractionStatus;
}
