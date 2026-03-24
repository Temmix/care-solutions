import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── 1. Patient Census ──────────────────────────────────────

  async patientCensus(tenantId: string, startDate?: string, endDate?: string) {
    const [active, inactive, deceased] = await Promise.all([
      this.prisma.patient.count({ where: { tenantId, active: true, deceasedDate: null } }),
      this.prisma.patient.count({ where: { tenantId, active: false, deceasedDate: null } }),
      this.prisma.patient.count({ where: { tenantId, deceasedDate: { not: null } } }),
    ]);

    // Admissions/discharges over time from encounters
    const dateFilter = this.buildDateFilter(startDate, endDate);
    const encounters = await this.prisma.encounter.findMany({
      where: { tenantId, ...dateFilter },
      select: { admissionDate: true, dischargeDate: true },
    });

    const admissionMap = new Map<string, { admissions: number; discharges: number }>();
    for (const enc of encounters) {
      const admDay = enc.admissionDate.toISOString().split('T')[0];
      const entry = admissionMap.get(admDay) ?? { admissions: 0, discharges: 0 };
      entry.admissions++;
      admissionMap.set(admDay, entry);

      if (enc.dischargeDate) {
        const disDay = enc.dischargeDate.toISOString().split('T')[0];
        const dEntry = admissionMap.get(disDay) ?? { admissions: 0, discharges: 0 };
        dEntry.discharges++;
        admissionMap.set(disDay, dEntry);
      }
    }

    const admissionsOverTime = Array.from(admissionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return {
      activePatients: active,
      inactivePatients: inactive,
      deceasedPatients: deceased,
      admissionsOverTime,
    };
  }

  // ── 2. Bed Occupancy ───────────────────────────────────────

  async bedOccupancy(tenantId: string) {
    const [beds, activeEncounters] = await Promise.all([
      this.prisma.bed.findMany({
        where: { tenantId },
        include: { location: { select: { name: true } } },
      }),
      this.prisma.encounter.findMany({
        where: { tenantId, status: 'IN_PROGRESS', bedId: { not: null } },
        select: { bedId: true, admissionDate: true },
      }),
    ]);

    const occupiedBedIds = new Set(activeEncounters.map((e) => e.bedId));
    const totalBeds = beds.length;
    const occupied = beds.filter((b) => occupiedBedIds.has(b.id)).length;
    const maintenance = beds.filter((b) => b.status === 'MAINTENANCE').length;
    const available = totalBeds - occupied - maintenance;

    // By location
    const locationMap = new Map<string, { total: number; occupied: number }>();
    for (const bed of beds) {
      const locName = bed.location?.name ?? 'Unknown';
      const entry = locationMap.get(locName) ?? { total: 0, occupied: 0 };
      entry.total++;
      if (occupiedBedIds.has(bed.id)) entry.occupied++;
      locationMap.set(locName, entry);
    }

    const byLocation = Array.from(locationMap.entries()).map(([locationName, counts]) => ({
      locationName,
      total: counts.total,
      occupied: counts.occupied,
      rate: counts.total > 0 ? Math.round((counts.occupied / counts.total) * 100) : 0,
    }));

    // Average length of stay
    const completedEncounters = await this.prisma.encounter.findMany({
      where: { tenantId, status: 'FINISHED', dischargeDate: { not: null } },
      select: { admissionDate: true, dischargeDate: true },
      take: 200,
      orderBy: { dischargeDate: 'desc' },
    });

    let avgLos = 0;
    if (completedEncounters.length > 0) {
      const totalDays = completedEncounters.reduce((sum, e) => {
        const days = (e.dischargeDate!.getTime() - e.admissionDate.getTime()) / 86400000;
        return sum + days;
      }, 0);
      avgLos = Math.round((totalDays / completedEncounters.length) * 10) / 10;
    }

    return {
      totalBeds,
      occupiedBeds: occupied,
      availableBeds: available,
      maintenanceBeds: maintenance,
      occupancyRate: totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0,
      byLocation,
      averageLengthOfStay: avgLos,
    };
  }

  // ── 3. Workforce Compliance ────────────────────────────────

  async workforceCompliance(tenantId: string, startDate?: string, endDate?: string) {
    const dateFilter = this.buildDateFilter(startDate, endDate, 'date');

    const shifts = await this.prisma.shift.findMany({
      where: { tenantId, ...dateFilter },
      include: {
        _count: { select: { assignments: true } },
        shiftPattern: { select: { name: true } },
      },
    });

    const totalShifts = shifts.length;
    const filledShifts = shifts.filter((s) => s._count.assignments > 0).length;
    const totalAssignments = shifts.reduce((sum, s) => sum + s._count.assignments, 0);

    // Upcoming gaps (unfilled shifts in next 7 days)
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    const upcomingGaps = await this.prisma.shift.findMany({
      where: {
        tenantId,
        date: { gte: now, lte: nextWeek },
        assignments: { none: {} },
      },
      include: { shiftPattern: { select: { name: true } } },
      orderBy: { date: 'asc' },
      take: 20,
    });

    return {
      totalShifts,
      filledShifts,
      fillRate: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0,
      averageAssignmentsPerShift:
        totalShifts > 0 ? Math.round((totalAssignments / totalShifts) * 10) / 10 : 0,
      upcomingGaps: upcomingGaps.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        shiftType: s.shiftPattern?.name ?? 'Unknown',
      })),
    };
  }

  // ── 4. Care Plan Reviews ───────────────────────────────────

  async carePlanReviews(tenantId: string) {
    const now = new Date();
    const fourteenDays = new Date(Date.now() + 14 * 86400000);

    const [totalActive, overdue, upcoming, byCategory, byStatus] = await Promise.all([
      this.prisma.carePlan.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.carePlan.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          nextReviewDate: { lt: now },
        },
        include: {
          patient: { select: { givenName: true, familyName: true } },
        },
        orderBy: { nextReviewDate: 'asc' },
        take: 50,
      }),
      this.prisma.carePlan.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          nextReviewDate: { gte: now, lte: fourteenDays },
        },
        include: {
          patient: { select: { givenName: true, familyName: true } },
        },
        orderBy: { nextReviewDate: 'asc' },
        take: 50,
      }),
      this.prisma.carePlan.groupBy({
        by: ['category'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.carePlan.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    return {
      totalActivePlans: totalActive,
      overdueReviews: overdue.map((cp) => ({
        id: cp.id,
        title: cp.title,
        patientName: `${cp.patient.givenName} ${cp.patient.familyName}`,
        nextReviewDate: cp.nextReviewDate?.toISOString().split('T')[0] ?? '',
        daysOverdue: cp.nextReviewDate
          ? Math.floor((now.getTime() - cp.nextReviewDate.getTime()) / 86400000)
          : 0,
      })),
      upcomingReviews: upcoming.map((cp) => ({
        id: cp.id,
        title: cp.title,
        patientName: `${cp.patient.givenName} ${cp.patient.familyName}`,
        nextReviewDate: cp.nextReviewDate?.toISOString().split('T')[0] ?? '',
        daysUntil: cp.nextReviewDate
          ? Math.floor((cp.nextReviewDate.getTime() - now.getTime()) / 86400000)
          : 0,
      })),
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  // ── 5. CHC Pipeline ────────────────────────────────────────

  async chcPipeline(tenantId: string) {
    const [byStatus, totalCases, fastTrack, approved, rejected] = await Promise.all([
      this.prisma.chcCase.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.chcCase.count({ where: { tenantId } }),
      this.prisma.chcCase.count({ where: { tenantId, isFastTrack: true } }),
      this.prisma.chcCase.count({ where: { tenantId, decision: 'APPROVED' } }),
      this.prisma.chcCase.count({
        where: { tenantId, decision: { in: ['APPROVED', 'REJECTED'] } },
      }),
    ]);

    return {
      totalCases,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      fastTrackCount: fastTrack,
      approvalRate: rejected > 0 ? Math.round((approved / rejected) * 100) : approved > 0 ? 100 : 0,
    };
  }

  // ── 6. Virtual Wards Summary ───────────────────────────────

  async virtualWardsSummary(tenantId: string) {
    const [enrolled, discharged, alertsByStatus, alertsBySeverity, totalObservations] =
      await Promise.all([
        this.prisma.virtualWardEnrolment.count({
          where: { tenantId, status: { in: ['ENROLLED', 'MONITORING', 'ESCALATED'] } },
        }),
        this.prisma.virtualWardEnrolment.count({
          where: { tenantId, status: 'DISCHARGED' },
        }),
        this.prisma.virtualWardAlert.groupBy({
          by: ['status'],
          where: { enrolment: { tenantId } },
          _count: true,
        }),
        this.prisma.virtualWardAlert.groupBy({
          by: ['severity'],
          where: { enrolment: { tenantId } },
          _count: true,
        }),
        this.prisma.vitalObservation.count({
          where: { enrolment: { tenantId } },
        }),
      ]);

    const alertsTotal = alertsByStatus.reduce((sum, a) => sum + a._count, 0);

    return {
      enrolledCount: enrolled,
      dischargedCount: discharged,
      alertsTotal,
      alertsByStatus: alertsByStatus.map((a) => ({ status: a.status, count: a._count })),
      alertsBySeverity: alertsBySeverity.map((a) => ({ severity: a.severity, count: a._count })),
      totalObservations,
    };
  }

  // ── CSV helper ─────────────────────────────────────────────

  toCsv(data: Record<string, unknown>[], columns: string[]): string {
    const header = columns.join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  // ── Helpers ────────────────────────────────────────────────

  private buildDateFilter(
    startDate?: string,
    endDate?: string,
    field = 'admissionDate',
  ): Record<string, unknown> {
    if (!startDate && !endDate) return {};
    const filter: Record<string, Date> = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) filter.lte = new Date(endDate);
    return { [field]: filter };
  }
}
