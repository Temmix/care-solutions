import { Module } from '@nestjs/common';
import { PatientsController } from './patients/patients.controller';
import { PatientsService } from './patients/patients.service';
import { OrganizationsController } from './organizations/organizations.controller';
import { OrganizationsService } from './organizations/organizations.service';
import { PractitionersController } from './practitioners/practitioners.controller';
import { PractitionersService } from './practitioners/practitioners.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { CarePlansController } from './care-plans/care-plans.controller';
import { CarePlansService } from './care-plans/care-plans.service';
import { AssessmentsController } from './assessments/assessments.controller';
import { AssessmentsService } from './assessments/assessments.service';
import { AssessmentTypesController } from './assessment-types/assessment-types.controller';
import { AssessmentTypesService } from './assessment-types/assessment-types.service';
import { SpecialtyTypesController } from './specialty-types/specialty-types.controller';
import { SpecialtyTypesService } from './specialty-types/specialty-types.service';

@Module({
  controllers: [
    PatientsController,
    OrganizationsController,
    PractitionersController,
    DashboardController,
    CarePlansController,
    AssessmentsController,
    AssessmentTypesController,
    SpecialtyTypesController,
  ],
  providers: [
    PatientsService,
    OrganizationsService,
    PractitionersService,
    DashboardService,
    CarePlansService,
    AssessmentsService,
    AssessmentTypesService,
    SpecialtyTypesService,
  ],
  exports: [PatientsService, AssessmentTypesService, SpecialtyTypesService],
})
export class EprModule {}
