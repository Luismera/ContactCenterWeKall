import { Injectable } from '@nestjs/common';
import { Agent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Agent[]> {
    return this.prisma.agent.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string): Promise<Agent | null> {
    return this.prisma.agent.findUnique({ where: { id } });
  }
}
