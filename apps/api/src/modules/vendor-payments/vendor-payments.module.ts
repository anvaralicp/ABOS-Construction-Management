import { Module } from '@nestjs/common';
import { VendorPaymentsService } from './vendor-payments.service';
import { VendorPaymentsController } from './vendor-payments.controller';

@Module({
  controllers: [VendorPaymentsController],
  providers: [VendorPaymentsService],
  exports: [VendorPaymentsService],
})
export class VendorPaymentsModule {}
