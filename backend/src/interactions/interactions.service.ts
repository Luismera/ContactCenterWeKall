import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Interaction } from '@prisma/client';
import { AgentsService } from '../agents/agents.service';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { ListInteractionsQueryDto } from './dto/list-interactions.query.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { isValidTransition } from './interaction-state-machine';
import { InteractionsRepository } from './interactions.repository';

@Injectable()
export class InteractionsService {
  constructor(
    private readonly interactionsRepository: InteractionsRepository,
    private readonly agentsService: AgentsService,
  ) {}

  async create(dto: CreateInteractionDto): Promise<Interaction> {
    const agent = await this.agentsService.findById(dto.agentId);
    if (!agent) {
      throw new NotFoundException(`Agent ${dto.agentId} not found`);
    }

    return this.interactionsRepository.create({
      type: dto.type,
      agentId: dto.agentId,
    });
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<Interaction> {
    const interaction = await this.interactionsRepository.findById(id);
    if (!interaction) {
      throw new NotFoundException(`Interaction ${id} not found`);
    }

    if (!isValidTransition(interaction.status, dto.status)) {
      throw new ConflictException(
        `Cannot transition interaction from "${interaction.status}" to "${dto.status}"`,
      );
    }

    const closedAt =
      dto.status === 'resolved' ? new Date() : interaction.closedAt;

    return this.interactionsRepository.updateStatus(id, dto.status, closedAt);
  }

  async findAll(
    query: ListInteractionsQueryDto,
  ): Promise<PaginatedResult<Interaction>> {
    if (query.agentId) {
      const agent = await this.agentsService.findById(query.agentId);
      if (!agent) {
        throw new NotFoundException(`Agent ${query.agentId} not found`);
      }
    }

    const skip = (query.page - 1) * query.limit;
    const { data, total } = await this.interactionsRepository.findMany(
      {
        agentId: query.agentId,
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      },
      skip,
      query.limit,
    );

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
