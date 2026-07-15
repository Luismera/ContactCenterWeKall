import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { InteractionsController } from './interactions.controller';
import { InteractionsRepository } from './interactions.repository';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [AgentsModule],
  controllers: [InteractionsController],
  providers: [InteractionsService, InteractionsRepository],
})
export class InteractionsModule {}
