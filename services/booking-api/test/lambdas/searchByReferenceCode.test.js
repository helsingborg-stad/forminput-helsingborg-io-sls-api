import messages from '@helsingborg-stad/npm-api-error-handling/assets/errorMessages';

import { main } from '../../lambdas/searchByReferenceCode';
import booking from '../../helpers/booking';

jest.mock('../../helpers/booking');

const mockBody = {
  startTime: '2021-11-01T00:00:00+01:00',
  endTime: '2021-12-31T00:00:00+01:00',
  referenceCode: 'mockReferenceCode',
};
const mockEvent = {
  body: JSON.stringify(mockBody),
};
const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockCalendarSearch = [
  {
    BookingId: '123456789',
    Attendees: [
      {
        Email: 'test@mail.com',
        Type: 'Required',
        Status: 'Accepted',
      },
    ],
    Subject: ' ##attempt_1',
    Body: null,
    Location: 'plats',
    ReferenceCode: 'attempt_1',
    StartTime: '2021-11-10T10:00:00+01:00',
    EndTime: '2021-11-10T11:00:00+01:00',
  },
];

beforeEach(() => {
  jest.resetAllMocks();
});

it('gets booking from a successful search', async () => {
  expect.assertions(2);

  const expectedResult = {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, data: { attributes: mockCalendarSearch } }),
    headers: mockHeaders,
    statusCode: 200,
  };

  booking.search.mockResolvedValueOnce({
    data: {
      data: {
        attributes: mockCalendarSearch,
      },
    },
  });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
  expect(booking.search).toHaveBeenCalledWith(mockBody);
});

it('throws when searching for a booking fails', async () => {
  expect.assertions(1);

  const statusCode = 500;
  const message = messages[statusCode];
  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '500',
        code: '500',
        message,
      },
    }),
    headers: mockHeaders,
    statusCode,
  };

  booking.search.mockRejectedValueOnce({ status: statusCode, message });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

it('returns failure if required paramerer is missing', async () => {
  expect.assertions(2);

  const event = {
    body: JSON.stringify({ startTime: '2021-11-01T00:00:00+01:00' }),
  };

  const expectedResult = {
    body: JSON.stringify({
      jsonapi: { version: '1.0' },
      data: {
        status: '403',
        code: '403',
        message: 'Missing one of more required parameter: "referenceCode", "startTime", "endTime"',
      },
    }),
    headers: mockHeaders,
    statusCode: 403,
  };

  const result = await main(event);

  expect(result).toEqual(expectedResult);
  expect(booking.search).toHaveBeenCalledTimes(0);
});
