import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationSettingsService } from './organization-settings.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationSettingsService],
  exports: [OrganizationsService, OrganizationSettingsService],
})
export class OrganizationsModule {}
