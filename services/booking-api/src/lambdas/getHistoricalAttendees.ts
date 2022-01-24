import to from 'await-to-js';

import * as response from '../libs/response';

import log from '../libs/logs';
import booking from '../helpers/booking';

const emailToDetails = {};

export async function main(
  event: {
    pathParameters: Record<string, string>;
    queryStringParameters: Record<string, string>;
  },
  context: { awsRequestId: string }
) {
  let referenceCode = event.pathParameters?.referenceCode;

  if (!referenceCode) {
    log.error(
      'Missing path parameter',
      context.awsRequestId,
      'service-booking-api-getHistoricalAttendees-001'
    );
    return response.failure({
      status: 403,
      message: 'Missing required parameter: "referenceCode"',
    });
  }

  referenceCode = decodeURIComponent(referenceCode);
  const { startTime = '', endTime = '' } = event.queryStringParameters ?? {};

  if (!startTime || !endTime) {
    log.error(
      'Missing one or more required query string parameters: "startTime", "endTime"',
      context.awsRequestId,
      'service-booking-api-getHistoricalAttendees-002'
    );
    return response.failure({
      status: 403,
      message: 'Missing one or more required query string parameters: "startTime", "endTime"',
    });
  }

  const getHistoricalAttendeesBody = { referenceCode, startTime, endTime };
  const [getHistoricalAttendeesError, getHistoricalAttendeesResponse] = await to(
    booking.getHistoricalAttendees(getHistoricalAttendeesBody)
  );
  if (getHistoricalAttendeesError) {
    log.error(
      'Could not get historical attendees from datatorget',
      context.awsRequestId,
      'service-booking-api-getHistoricalAttendees-003',
      getHistoricalAttendeesError
    );
    return response.failure(getHistoricalAttendeesError);
  }

  const { data } = getHistoricalAttendeesResponse?.data ?? {};

  const promises = data.attributes.map(async email => {
    if (!emailToDetails[email]) {
      const [getAdministratorDetailsError, getAdministratorDetailsResponse] = await to(
        booking.getAdministratorDetails({ email })
      );
      if (getAdministratorDetailsError) {
        log.warn(
          'Datatorget lookup failed, using fallback',
          context.awsRequestId,
          'service-booking-getHistoricalAttendees-004',
          getAdministratorDetailsError
        );
      }
      emailToDetails[email] = getAdministratorDetailsResponse?.data?.data?.attributes ?? {
        Email: email,
      };
    }
  });

  await Promise.all(promises);

  const newData = { ...data, attributes: data.attributes.map(email => emailToDetails[email]) };

  return response.success(200, newData);
}
