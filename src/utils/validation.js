/**
 * Input validation helpers.
 */
import { BadRequest } from './errors.js';

/**
 * Parses a form field as an integer and checks it's within [min, max].
 *
 * @param {string|undefined} value  Raw value from the request body.
 * @param {string} name             Field name shown in error messages (e.g. "Width").
 * @param {number} min              Smallest allowed value.
 * @param {number} max              Largest allowed value.
 * @param {number} [fallback]       Used when the field is empty; if omitted, the field is required.
 * @returns {number} The validated integer.
 * @throws {BadRequest} If the field is missing (and required), not an integer, or out of range.
 *
 * @example parseIntField('800', 'Width', 1, 10000)   // → 800
 * @example parseIntField('', 'Quality', 1, 100, 80)  // → 80
 * @example parseIntField('abc', 'Width', 1, 10000)   // throws BadRequest
 */
export function parseIntField(value, name, min, max, fallback) {
  if (value === undefined || value === '') {
    if (fallback !== undefined) return fallback;
    throw new BadRequest(`${name} is required`);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BadRequest(`${name} must be an integer between ${min} and ${max}`);
  }
  return n;
}
