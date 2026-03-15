import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private gateway: EventsGateway) {}

  private emit(tenantId: string, event: string, data: unknown): void {
    if (!this.gateway?.server) {
      this.logger.warn(`WebSocket server not ready, skipping event: ${event}`);
      return;
    }
    this.gateway.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  emitBedStatusChanged(
    tenantId: string,
    data: { bedId: string; status: string; locationName?: string; encounterAction?: string },
  ): void {
    this.emit(tenantId, 'bed:status-changed', data);
  }

  emitSwapCreated(
    tenantId: string,
    data: { swapId: string; requesterName: string; shiftDate: string },
  ): void {
    this.emit(tenantId, 'swap:created', data);
  }

  emitSwapUpdated(tenantId: string, data: { swapId: string; status: string }): void {
    this.emit(tenantId, 'swap:updated', data);
  }

  emitDischargePlanUpdated(
    tenantId: string,
    data: { encounterId: string; planStatus: string },
  ): void {
    this.emit(tenantId, 'discharge-plan:updated', data);
  }
}
