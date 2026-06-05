import { registerDecorator, ValidationOptions } from 'class-validator';

/** True if `tz` is a timezone the runtime's Intl accepts (e.g. Europe/London). */
export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validates that a string is a valid IANA timezone identifier. */
export function IsIanaTimeZone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isIanaTimeZone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidTimeZone(value);
        },
        defaultMessage(): string {
          return 'timezone must be a valid IANA timezone (e.g. Europe/London)';
        },
      },
    });
  };
}
