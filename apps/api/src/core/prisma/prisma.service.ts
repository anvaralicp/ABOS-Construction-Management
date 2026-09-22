import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // Configure Prisma to log out query warnings/errors
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing Prisma Database Connection');
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('Closing Prisma Database Connection');
    await this.$disconnect();
  }
}