import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';
import { TenantScopeService } from './services/tenant-scope.service';
import { PlanLimitsService } from './services/plan-limits.service';

@Global()
@Module({
  providers: [EncryptionService, TenantScopeService, PlanLimitsService],
  exports: [EncryptionService, TenantScopeService, PlanLimitsService],
})
export class CommonModule {}
