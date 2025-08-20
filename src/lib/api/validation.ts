/**
 * Comprehensive API Validation Schemas
 * Provides validation for all API endpoints with detailed error reporting
 */

import { createAPIError } from './utils';
import { APIErrorCode, HTTPStatus } from './types';

// Base validation result
export interface ValidationResult<T = any> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
  warnings?: string[];
}

// Validation error structure
export interface ValidationError {
  field: string;
  value: any;
  message: string;
  code: string;
}

// Validator function type
export type Validator<T> = (value: any, context?: ValidationContext) => ValidationResult<T>;

// Validation context
export interface ValidationContext {
  field: string;
  parent?: any;
  root?: any;
}

/**
 * Create a validation error
 */
function createValidationError(
  field: string,
  value: any,
  message: string,
  code: string = 'INVALID_VALUE'
): ValidationError {
  return { field, value, message, code };
}

/**
 * String validator with comprehensive options
 */
export function validateString(options: {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
  sanitize?: boolean;
  trim?: boolean;
}): Validator<string> {
  return (value: any, context?: ValidationContext): ValidationResult<string> => {
    const errors: ValidationError[] = [];
    const field = context?.field || 'value';

    // Check if required
    if (options.required && (value === undefined || value === null)) {
      errors.push(createValidationError(field, value, 'Field is required', 'REQUIRED'));
      return { valid: false, errors };
    }

    // If not provided and not required, return undefined
    if (value === undefined || value === null) {
      return { valid: true, data: undefined };
    }

    // Convert to string
    let str = String(value);

    // Trim if requested
    if (options.trim !== false) {
      str = str.trim();
    }

    // Check if empty is allowed
    if (!options.allowEmpty && str === '') {
      if (options.required) {
        errors.push(createValidationError(field, str, 'Field cannot be empty', 'EMPTY'));
      }
      return { valid: errors.length === 0, data: str, errors: errors.length > 0 ? errors : undefined };
    }

    // Check minimum length
    if (options.minLength && str.length < options.minLength) {
      errors.push(createValidationError(
        field,
        str,
        `Must be at least ${options.minLength} characters long`,
        'MIN_LENGTH'
      ));
    }

    // Check maximum length
    if (options.maxLength && str.length > options.maxLength) {
      errors.push(createValidationError(
        field,
        str,
        `Must be no more than ${options.maxLength} characters long`,
        'MAX_LENGTH'
      ));
    }

    // Check pattern
    if (options.pattern && !options.pattern.test(str)) {
      errors.push(createValidationError(
        field,
        str,
        `Must match pattern ${options.pattern.source}`,
        'PATTERN'
      ));
    }

    // Sanitize if requested
    if (options.sanitize) {
      str = str.replace(/[<>]/g, ''); // Basic XSS protection
    }

    return {
      valid: errors.length === 0,
      data: str,
      errors: errors.length > 0 ? errors : undefined
    };
  };
}

/**
 * Number validator
 */
export function validateNumber(options: {
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
}): Validator<number> {
  return (value: any, context?: ValidationContext): ValidationResult<number> => {
    const errors: ValidationError[] = [];
    const field = context?.field || 'value';

    // Check if required
    if (options.required && (value === undefined || value === null)) {
      errors.push(createValidationError(field, value, 'Field is required', 'REQUIRED'));
      return { valid: false, errors };
    }

    // If not provided and not required, return undefined
    if (value === undefined || value === null) {
      return { valid: true, data: undefined };
    }

    // Convert to number
    const num = Number(value);

    // Check if valid number
    if (isNaN(num)) {
      errors.push(createValidationError(field, value, 'Must be a valid number', 'INVALID_NUMBER'));
      return { valid: false, errors };
    }

    // Check if integer required
    if (options.integer && !Number.isInteger(num)) {
      errors.push(createValidationError(field, value, 'Must be an integer', 'NOT_INTEGER'));
    }

    // Check minimum
    if (options.min !== undefined && num < options.min) {
      errors.push(createValidationError(
        field,
        num,
        `Must be at least ${options.min}`,
        'MIN_VALUE'
      ));
    }

    // Check maximum
    if (options.max !== undefined && num > options.max) {
      errors.push(createValidationError(
        field,
        num,
        `Must be no more than ${options.max}`,
        'MAX_VALUE'
      ));
    }

    return {
      valid: errors.length === 0,
      data: num,
      errors: errors.length > 0 ? errors : undefined
    };
  };
}

/**
 * Boolean validator
 */
export function validateBoolean(): Validator<boolean> {
  return (value: any, context?: ValidationContext): ValidationResult<boolean> => {
    const field = context?.field || 'value';

    if (value === undefined || value === null) {
      return { valid: true, data: false }; // Default to false
    }

    if (typeof value === 'boolean') {
      return { valid: true, data: value };
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        return { valid: true, data: true };
      }
      if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
        return { valid: true, data: false };
      }
    }

    return {
      valid: false,
      errors: [createValidationError(field, value, 'Must be a boolean value', 'INVALID_BOOLEAN')]
    };
  };
}

/**
 * Enum validator
 */
export function validateEnum<T extends string>(values: readonly T[]): Validator<T> {
  return (value: any, context?: ValidationContext): ValidationResult<T> => {
    const field = context?.field || 'value';

    if (value === undefined || value === null) {
      return { valid: true, data: undefined };
    }

    const str = String(value);
    if (values.includes(str as T)) {
      return { valid: true, data: str as T };
    }

    return {
      valid: false,
      errors: [createValidationError(
        field,
        value,
        `Must be one of: ${values.join(', ')}`,
        'INVALID_ENUM'
      )]
    };
  };
}

/**
 * Object validator
 */
export function validateObject<T extends Record<string, any>>(
  schema: { [K in keyof T]: Validator<T[K]> }
): Validator<T> {
  return (value: any, context?: ValidationContext): ValidationResult<T> => {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const field = context?.field || 'object';

    if (value === undefined || value === null) {
      return { valid: false, errors: [createValidationError(field, value, 'Object is required', 'REQUIRED')] };
    }

    if (typeof value !== 'object') {
      return { valid: false, errors: [createValidationError(field, value, 'Must be an object', 'NOT_OBJECT')] };
    }

    const result: any = {};

    // Validate each field in the schema
    for (const [key, validator] of Object.entries(schema)) {
      const fieldContext: ValidationContext = {
        field: `${field}.${key}`,
        parent: value,
        root: context?.root || value,
      };

      const validation = validator(value[key], fieldContext);
      
      if (!validation.valid) {
        errors.push(...(validation.errors || []));
      } else {
        if (validation.data !== undefined) {
          result[key] = validation.data;
        }
      }

      if (validation.warnings) {
        warnings.push(...validation.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      data: result as T,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  };
}

/**
 * Array validator
 */
export function validateArray<T>(
  itemValidator: Validator<T>,
  options: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
  } = {}
): Validator<T[]> {
  return (value: any, context?: ValidationContext): ValidationResult<T[]> => {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const field = context?.field || 'array';

    // Check if required
    if (options.required && (value === undefined || value === null)) {
      errors.push(createValidationError(field, value, 'Array is required', 'REQUIRED'));
      return { valid: false, errors };
    }

    // If not provided and not required, return empty array
    if (value === undefined || value === null) {
      return { valid: true, data: [] };
    }

    if (!Array.isArray(value)) {
      return { valid: false, errors: [createValidationError(field, value, 'Must be an array', 'NOT_ARRAY')] };
    }

    // Check length constraints
    if (options.minLength !== undefined && value.length < options.minLength) {
      errors.push(createValidationError(
        field,
        value,
        `Array must have at least ${options.minLength} items`,
        'MIN_LENGTH'
      ));
    }

    if (options.maxLength !== undefined && value.length > options.maxLength) {
      errors.push(createValidationError(
        field,
        value,
        `Array must have no more than ${options.maxLength} items`,
        'MAX_LENGTH'
      ));
    }

    // Validate each item
    const result: T[] = [];
    for (let i = 0; i < value.length; i++) {
      const itemContext: ValidationContext = {
        field: `${field}[${i}]`,
        parent: value,
        root: context?.root || value,
      };

      const validation = itemValidator(value[i], itemContext);
      
      if (!validation.valid) {
        errors.push(...(validation.errors || []));
      } else if (validation.data !== undefined) {
        result.push(validation.data);
      }

      if (validation.warnings) {
        warnings.push(...validation.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      data: result,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  };
}

/**
 * Validate and throw API error if validation fails
 */
export function validateOrThrow<T>(
  value: any,
  validator: Validator<T>,
  context?: ValidationContext
): T {
  const validation = validator(value, context);
  
  if (!validation.valid) {
    const errorMessages = validation.errors?.map(err => `${err.field}: ${err.message}`) || ['Validation failed'];
    throw createAPIError(
      `Validation failed: ${errorMessages.join('; ')}`,
      APIErrorCode.INVALID_REQUEST,
      HTTPStatus.BAD_REQUEST,
      { validationErrors: validation.errors }
    );
  }
  
  return validation.data as T;
}
