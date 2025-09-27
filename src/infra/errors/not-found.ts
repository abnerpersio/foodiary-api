import { HttpError } from './http-error';

export class NotFound extends HttpError {
  constructor(entity = '') {
    super(404, `${entity} not found`);
  }
}
