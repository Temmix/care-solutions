import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from './encryption.service';
import { BlindIndexService } from './blind-index.service';
import { setupEncryptionMiddleware } from '../../prisma/encryption.middleware';

/**
 * Bootstraps the Prisma encryption middleware after all modules are initialised.
 * Lives in EncryptionModule to avoid circular dependency with PrismaModule.
 */
@Injectable()
export class EncryptionBootstrapService implements OnModuleInit {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EncryptionService) private readonly encryptionService: EncryptionService,
    @Inject(BlindIndexService) private readonly blindIndexService: BlindIndexService,
  ) {}

  onModuleInit(): void {
    setupEncryptionMiddleware(this.prisma, this.encryptionService, this.blindIndexService);
  }
}
