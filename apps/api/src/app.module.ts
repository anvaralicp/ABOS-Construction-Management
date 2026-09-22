import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CoreModule } from './core/core.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { validate } from './common/config/env.validation';

import { ProjectsModule } from './modules/projects/projects.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { VendorsModule } from './modules/vendors/vendors.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get('RATE_LIMIT_TTL') || 60000,
        limit: config.get('RATE_LIMIT_MAX') || 10,
      }],
    }),
    CoreModule,
    HealthModule,
    IdentityModule,
    OrganizationsModule,
    ProjectsModule,
    CategoriesModule,
    VendorsModule,
  ],
})
export class AppModule {}