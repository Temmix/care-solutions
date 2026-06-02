import {
  Controller,
  Get,
  Post,
  Body,
  Ip,
  Headers,
  UseGuards,
  Inject,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { LegalService } from './legal.service';
import { RecordAcceptanceDto } from './dto/record-acceptance.dto';
import { Roles, CurrentUser, CurrentTenant } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

interface RequestUser {
  id: string;
  email: string;
  globalRole: string;
}

@Controller('legal')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class LegalController {
  constructor(@Inject(LegalService) private readonly legal: LegalService) {}

  /** Current legal documents and their versions. Visible to any authenticated user. */
  @Get('documents')
  getDocuments() {
    return this.legal.getCurrentDocuments();
  }

  /** Which current-version documents the tenant has / hasn't accepted. */
  @Get('acceptances/status')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  getStatus(@CurrentTenant() tenantId: string) {
    return this.legal.getAcceptanceStatus(tenantId);
  }

  /** Full history of acceptance records for the tenant. */
  @Get('acceptances')
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  listAcceptances(@CurrentTenant() tenantId: string) {
    return this.legal.listAcceptances(tenantId);
  }

  /** Record org-level acceptance of a document's current version. */
  @Post('acceptances')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN, Role.TENANT_ADMIN)
  recordAcceptance(
    @Body() dto: RecordAcceptanceDto,
    @CurrentUser() user: RequestUser,
    @CurrentTenant() tenantId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.legal.recordAcceptance(dto.documentType, user.id, tenantId, ip, userAgent);
  }
}
