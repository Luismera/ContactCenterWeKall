import { Controller, Get } from '@nestjs/common';
import { Agent } from '@prisma/client';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll(): Promise<Agent[]> {
    return this.agentsService.findAll();
  }
}
