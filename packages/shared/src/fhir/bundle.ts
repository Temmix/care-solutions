import type { FhirResource } from './base';

export interface FhirBundle<T extends FhirResource = FhirResource> extends FhirResource {
  resourceType: 'Bundle';
  type: 'document' | 'message' | 'transaction' | 'searchset' | 'collection' | 'batch';
  total?: number;
  entry?: FhirBundleEntry<T>[];
  link?: FhirBundleLink[];
}

export interface FhirBundleEntry<T extends FhirResource = FhirResource> {
  fullUrl?: string;
  resource?: T;
  search?: { mode?: 'match' | 'include' | 'outcome'; score?: number };
}

export interface FhirBundleLink {
  relation: string;
  url: string;
}
