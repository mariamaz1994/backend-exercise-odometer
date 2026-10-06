import { ErrorCode, Failure, Success } from "./types";

export const ok = <T>(data: T): Success<T> => ({ success: true, data });

export const fail = (error: ErrorCode, message: string): Failure => ({
  success: false,
  error: { error, message },
});