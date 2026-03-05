import { IApiResponse } from "../types/error";

export function successResponse<T>(data: T): IApiResponse<T> {
  return {
    state: true,
    data,
  };
}

export function errorResponse(
  message: string,
  code?: string,
): IApiResponse<never> {
  return {
    state: false,
    error: {
      message,
      code,
    },
  };
}
