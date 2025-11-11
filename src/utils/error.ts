/**
 * Error Handling Utilities
 *
 * Provides common error handling functions for consistent error message extraction.
 */

/**
 * Extract error message from unknown error type
 *
 * @param error - Error object (can be Error instance or any other type)
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Extract error stack from unknown error type
 *
 * @param error - Error object (can be Error instance or any other type)
 * @returns Error stack string or undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
