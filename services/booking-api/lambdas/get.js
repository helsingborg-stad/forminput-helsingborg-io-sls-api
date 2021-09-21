import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import to from 'await-to-js';

import * as response from '../../../libs/response';

import booking from '../helpers/booking';

export async function main(event) {
  const bookingId = event.pathParameters.id;
  const body = { bookingId };

  const [error, getBookingResponse] = await to(booking.get(body));
  if (error) {
    throwError(error);
  }

  const { data } = getBookingResponse.data;
  return response.success(200, data);
}
