import { Module } from '@nestjs/common';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { PrismaModule } from '../../../infrastructure/database/prisma/prisma.module';
import { AuditModule } from '../../../infrastructure/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
