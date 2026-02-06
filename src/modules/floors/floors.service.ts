import { PrismaService } from '@/core/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FloorsService {
  private readonly logger = new Logger(FloorsService.name);

  constructor(private readonly prisma: PrismaService) {}
}
