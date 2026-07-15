import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Interaction } from '@prisma/client';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { ListInteractionsQueryDto } from './dto/list-interactions.query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { InteractionsService } from './interactions.service';

@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post()
  create(@Body() dto: CreateInteractionDto): Promise<Interaction> {
    return this.interactionsService.create(dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<Interaction> {
    return this.interactionsService.updateStatus(id, dto);
  }

  @Get()
  findAll(
    @Query() query: ListInteractionsQueryDto,
  ): Promise<PaginatedResult<Interaction>> {
    return this.interactionsService.findAll(query);
  }
}
