import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ClinicalAccessGuard } from '../src/common/guards';
import { CLINICAL_DATA_KEY } from '../src/common/decorators';
import { PatientsController } from '../src/modules/epr/patients/patients.controller';
import { CarePlansController } from '../src/modules/epr/care-plans/care-plans.controller';
import { MedicationsController } from '../src/modules/epr/medications/medications.controller';
import { AssessmentsController } from '../src/modules/epr/assessments/assessments.controller';
import { PatientFlowController } from '../src/modules/patient-flow/patient-flow.controller';
import { ChcController } from '../src/modules/chc/chc.controller';
import { VirtualWardsController } from '../src/modules/virtual-wards/virtual-wards.controller';
import { PrivacyController } from '../src/modules/privacy/privacy.controller';

// Every controller that serves patient clinical data (PHI) must be marked
// @ClinicalData() AND apply ClinicalAccessGuard, so platform admins are blocked.
// This guards against fail-open: a new clinical controller missing the marker
// will fail this test.
const CLINICAL_CONTROLLERS: ReadonlyArray<[string, new (...args: never[]) => unknown]> = [
  ['PatientsController', PatientsController],
  ['CarePlansController', CarePlansController],
  ['MedicationsController', MedicationsController],
  ['AssessmentsController', AssessmentsController],
  ['PatientFlowController', PatientFlowController],
  ['ChcController', ChcController],
  ['VirtualWardsController', VirtualWardsController],
  ['PrivacyController', PrivacyController],
];

describe('Clinical controllers are protected from platform admins', () => {
  it.each(CLINICAL_CONTROLLERS)('%s is marked @ClinicalData()', (_name, ctrl) => {
    expect(Reflect.getMetadata(CLINICAL_DATA_KEY, ctrl)).toBe(true);
  });

  it.each(CLINICAL_CONTROLLERS)('%s applies ClinicalAccessGuard', (_name, ctrl) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, ctrl) ?? [];
    expect(guards).toContain(ClinicalAccessGuard);
  });
});
