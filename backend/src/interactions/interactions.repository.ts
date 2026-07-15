import { Injectable } from '@nestjs/common';
import { Interaction, InteractionStatus, InteractionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface InteractionFilters {
  agentId?: string;
  status?: InteractionStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

@Injectable()
export class InteractionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { type: InteractionType; agentId: string }): Promise<Interaction> {
    return this.prisma.interaction.create({ data });
  }

  findById(id: string): Promise<Interaction | null> {
    return this.prisma.interaction.findUnique({ where: { id } });
  }

  updateStatus(
    id: string,
    status: InteractionStatus,
    closedAt: Date | null,
  ): Promise<Interaction> {
    return this.prisma.interaction.update({
      where: { id },
      data: { status, closedAt },
    });
  }

  private buildWhere(filters: InteractionFilters): Prisma.InteractionWhereInput {
    const where: Prisma.InteractionWhereInput = {};

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.openedAt = {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo }),
      };
    }

    return where;
  }

  async findMany(
    filters: InteractionFilters,
    skip: number,
    take: number,
  ): Promise<{ data: Interaction[]; total: number }> {
    const where = this.buildWhere(filters);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.interaction.findMany({
        where,
        skip,
        take,
        orderBy: { openedAt: 'desc' },
      }),
      this.prisma.interaction.count({ where }),
    ]);

    return { data, total };
  }
}
