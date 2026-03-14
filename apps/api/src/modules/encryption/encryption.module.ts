import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';
import { BlindIndexService } from './blind-index.service';
import { PatientSearchService } from './patient-search.service';
import { EncryptionBootstrapService } from './encryption-bootstrap.service';

@Global()
@Module({
  providers: [
    KeyManagementService,
    EncryptionService,
    BlindIndexService,
    PatientSearchService,
    EncryptionBootstrapService,
  ],
  exports: [EncryptionService, KeyManagementService, BlindIndexService, PatientSearchService],
})
export class EncryptionModule {}
