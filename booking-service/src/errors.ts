import {createResponse} from './utils';

export type ResponseError = {
  code: number;
  message: string;
};

export const InvalidMethod = () => errorResponse({code: 4444, message: 'Invalid Method'});

export const NotAuthorized = () => errorResponse({code: 4202, message: 'Not authorized'});

export const UnknownRequestType = () => errorResponse({code: 4401, message: 'Unknown request type'}); // TODO parametrise to print request type

export function errorResponse(responseError: ResponseError, status: number = 400): Response {
  return createResponse(responseError, {status});
}
