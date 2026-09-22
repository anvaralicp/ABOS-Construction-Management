import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AuditService } from './audit/audit.service';
import { StorageModule } from './storage/storage.module';

@Global()
@Module({
  imports: [StorageModule],
  providers: [PrismaService, AuditService],
  exports: [PrismaService, AuditService, StorageModule],
})
export class CoreModule {}