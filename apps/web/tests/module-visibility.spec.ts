import { renderHook, act } from '@testing-library/react';
import {
  MODULE_DEFINITIONS,
  MODULE_CODES,
  getDefaultModules,
  resolveEnabledModules,
} from '@care/shared';

describe('Module Registry', () => {
  describe('MODULE_DEFINITIONS', () => {
    it('has 13 module definitions', () => {
      expect(MODULE_DEFINITIONS).toHaveLength(13);
    });

    it('every definition has a code in MODULE_CODES', () => {
      for (const mod of MODULE_DEFINITIONS) {
        expect(MODULE_CODES).toContain(mod.code);
      }
    });

    it('every definition has label, description, and defaultEnabledFor', () => {
      for (const mod of MODULE_DEFINITIONS) {
        expect(mod.label).toBeTruthy();
        expect(mod.description).toBeTruthy();
        expect(Array.isArray(mod.defaultEnabledFor)).toBe(true);
      }
    });
  });

  describe('getDefaultModules', () => {
    it('returns all ALL-default modules for any org type', () => {
      const allDefaults = MODULE_DEFINITIONS.filter((m) => m.defaultEnabledFor.includes('ALL')).map(
        (m) => m.code,
      );

      for (const orgType of ['CARE_HOME', 'GP_PRACTICE', 'HOSPITAL', 'OTHER']) {
        const result = getDefaultModules(orgType);
        for (const code of allDefaults) {
          expect(result).toContain(code);
        }
      }
    });

    it('includes CHC for CARE_HOME but not GP_PRACTICE', () => {
      expect(getDefaultModules('CARE_HOME')).toContain('CHC');
      expect(getDefaultModules('GP_PRACTICE')).not.toContain('CHC');
    });

    it('includes PATIENT_FLOW for HOSPITAL but not CARE_HOME', () => {
      expect(getDefaultModules('HOSPITAL')).toContain('PATIENT_FLOW');
      expect(getDefaultModules('CARE_HOME')).not.toContain('PATIENT_FLOW');
    });

    it('includes VIRTUAL_WARDS for HOSPITAL and COMMUNITY_SERVICE', () => {
      expect(getDefaultModules('HOSPITAL')).toContain('VIRTUAL_WARDS');
      expect(getDefaultModules('COMMUNITY_SERVICE')).toContain('VIRTUAL_WARDS');
    });

    it('includes IOT for HOSPITAL and CARE_HOME only', () => {
      expect(getDefaultModules('HOSPITAL')).toContain('IOT');
      expect(getDefaultModules('CARE_HOME')).toContain('IOT');
      expect(getDefaultModules('GP_PRACTICE')).not.toContain('IOT');
    });

    it('returns modules for MENTAL_HEALTH_TRUST with PATIENT_FLOW', () => {
      const result = getDefaultModules('MENTAL_HEALTH_TRUST');
      expect(result).toContain('PATIENT_FLOW');
      expect(result).not.toContain('CHC');
    });
  });

  describe('resolveEnabledModules', () => {
    it('returns defaults when enabledModules is null', () => {
      const result = resolveEnabledModules(null, 'CARE_HOME');
      expect(result).toEqual(getDefaultModules('CARE_HOME'));
    });

    it('returns defaults when enabledModules is empty', () => {
      const result = resolveEnabledModules([], 'GP_PRACTICE');
      expect(result).toEqual(getDefaultModules('GP_PRACTICE'));
    });

    it('returns custom modules when set', () => {
      const result = resolveEnabledModules(['PATIENTS', 'ROSTER'], 'CARE_HOME');
      expect(result).toEqual(['PATIENTS', 'ROSTER']);
    });

    it('filters out invalid codes', () => {
      const result = resolveEnabledModules(['PATIENTS', 'INVALID', 'ROSTER'], 'CARE_HOME');
      expect(result).toEqual(['PATIENTS', 'ROSTER']);
    });

    it('returns defaults when undefined', () => {
      const result = resolveEnabledModules(undefined, 'HOSPITAL');
      expect(result).toEqual(getDefaultModules('HOSPITAL'));
    });
  });
});
