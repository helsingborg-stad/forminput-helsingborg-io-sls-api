import to from 'await-to-js';

import * as response from '../../../libs/response';
import log from '../../../libs/logs';

import booking from '../helpers/booking';
import { isTimeslotTaken } from '../helpers/isTimeslotTaken';
import getCreateBookingBody from '../helpers/getCreateBookingBody';

export async function main(event, { awsRequestId }) {
  const bookingId = decodeURIComponent(event.pathParameters.id);

  const body = JSON.parse(event.body);
  const { requiredAttendees = [], startTime, endTime } = body;
  let message = '';

  if (requiredAttendees.length === 0 || !startTime || !endTime) {
    message =
      'Missing one or more required parameters: "requiredAttendees", "startTime", "endTime"';
    log.error(message, awsRequestId, 'service-booking-api-update-001');
    return response.failure({ status: 403, message });
  }

  const searchBookingBody = { startTime, endTime };
  const [searchBookingError, searchResponse] = await to(booking.search(searchBookingBody));

  if (searchBookingError) {
    message = `Error finding bookings between ${startTime} - ${endTime}`;
    log.error(message, awsRequestId, 'service-booking-api-update-002', searchBookingError);
    return response.failure({ message, status: 500 });
  }

  const bookingExist = searchResponse?.data?.data?.attributes?.length > 0;
  const timeslotTaken = isTimeslotTaken(searchResponse?.data?.data?.attributes);

  if (bookingExist && timeslotTaken) {
    message = 'Timeslot not available for booking';
    log.error(message, awsRequestId, 'service-booking-api-update-003');
    return response.failure({ message, status: 403 });
  }

  const [cancelError] = await to(booking.cancel(bookingId));
  if (cancelError) {
    message = 'Timeslot cancellation failed';
    log.error(message, awsRequestId, 'service-booking-api-update-004', cancelError);
    return response.failure({ message, status: 500 });
  }

  const createBookingBody = getCreateBookingBody(body);
  const [createError, createBookingResponse] = await to(booking.create(createBookingBody));
  if (createError) {
    message = 'Timeslot creation failed';
    log.error(message, awsRequestId, 'service-booking-api-update-005', createError);
    return response.failure({ message, status: 500 });
  }

  const newBookingId = createBookingResponse.data.data.attributes.BookingId;

  return response.success(200, { bookingId: newBookingId });
}
