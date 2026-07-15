import { InteractionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListInteractionsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID('4', { message: 'agentId must be a valid UUID' })
  agentId?: string;

  @IsOptional()
  @IsEnum(InteractionStatus, {
    message: 'status must be one of: open, in_progress, resolved',
  })
  status?: InteractionStatus;

  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'dateFrom must be a valid ISO date (YYYY-MM-DD or full ISO datetime)',
    },
  )
  dateFrom?: string;

  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'dateTo must be a valid ISO date (YYYY-MM-DD or full ISO datetime)',
    },
  )
  dateTo?: string;
}
