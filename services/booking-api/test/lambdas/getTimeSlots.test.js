import { main } from '../../src/lambdas/getTimeSlots';
import booking from '../../src/helpers/booking';

jest.mock('../../src/helpers/booking');

const { getTimeSpans } = jest.mocked(booking);

const mockAttendee = 'outlook@helsingborg.se';
const secondMockAttendee = 'outlook_2@helsingborg.se';

const mockBody = {
  attendees: [mockAttendee, secondMockAttendee],
  startTime: '2021-10-26T08:00:00+01:00',
  endTime: '2021-10-26T10:00:00+01:00',
  meetingDuration: 60,
  meetingBuffer: 15,
};

const mockHeaders = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
};

const mockEvent = {
  body: JSON.stringify(mockBody),
};

function createLambdaResponse(lambdaResult, statusCode = 200) {
  return {
    body: JSON.stringify({ jsonapi: { version: '1.0' }, data: { ...lambdaResult } }),
    headers: mockHeaders,
    statusCode,
  };
}

it('successfully returns available time slots for a single user', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    data: {
      data: {
        attributes: {
          [mockAttendee]: [
            {
              StartTime: '2021-10-10T08:00:00+01:00',
              EndTime: '2021-10-10T10:00:00+01:00',
            },
          ],
        },
      },
    },
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: '07:00:00+00:00',
          endTime: '08:00:00+00:00',
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

it('successfully returns available time slots for multiple users', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    data: {
      data: {
        attributes: {
          [mockAttendee]: [
            {
              StartTime: '2021-10-10T08:00:00+01:00',
              EndTime: '2021-10-10T10:00:00+01:00',
            },
          ],
          [secondMockAttendee]: [
            {
              StartTime: '2021-10-10T08:00:00+01:00',
              EndTime: '2021-10-10T11:00:00+01:00',
            },
          ],
        },
      },
    },
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: '07:00:00+00:00',
          endTime: '08:00:00+00:00',
        },
      ],
    },
    [secondMockAttendee]: {
      '2021-10-10': [
        {
          startTime: '07:00:00+00:00',
          endTime: '08:00:00+00:00',
        },
        {
          startTime: '08:15:00+00:00',
          endTime: '09:15:00+00:00',
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

it('successfully returns available time slots when fetching multiple time spans', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    data: {
      data: {
        attributes: {
          [mockAttendee]: [
            {
              StartTime: '2021-10-10T08:00:00+01:00',
              EndTime: '2021-10-10T10:00:00+01:00',
            },
            {
              StartTime: '2021-10-10T11:00:00+01:00',
              EndTime: '2021-10-10T12:00:00+01:00',
            },
          ],
        },
      },
    },
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: '07:00:00+00:00',
          endTime: '08:00:00+00:00',
        },
        {
          startTime: '10:00:00+00:00',
          endTime: '11:00:00+00:00',
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});

it('successfully returns available time with another meetingDuration and meetingBuffer', async () => {
  expect.assertions(1);

  const body = {
    ...mockBody,
    meetingDuration: 15,
    meetingBuffer: 5,
  };
  const event = {
    body: JSON.stringify(body),
  };

  getTimeSpans.mockResolvedValueOnce({
    data: {
      data: {
        attributes: {
          [mockAttendee]: [
            {
              StartTime: '2021-10-10T08:00:00+01:00',
              EndTime: '2021-10-10T09:00:00+01:00',
            },
          ],
        },
      },
    },
  });

  const expectedTimeSlots = {
    [mockAttendee]: {
      '2021-10-10': [
        {
          startTime: '07:00:00+00:00',
          endTime: '07:15:00+00:00',
        },
        {
          startTime: '07:20:00+00:00',
          endTime: '07:35:00+00:00',
        },
        {
          startTime: '07:40:00+00:00',
          endTime: '07:55:00+00:00',
        },
      ],
    },
  };

  const expectedResult = createLambdaResponse(expectedTimeSlots);

  const result = await main(event);

  expect(result).toEqual(expectedResult);
});

it('returns failure if no attendees is provided in the request', async () => {
  expect.assertions(1);

  const body = {
    ...mockBody,
    attendees: [],
  };
  const event = {
    body: JSON.stringify(body),
  };

  const expectedError = {
    status: '403',
    code: '403',
    message: 'Missing one or more required parameters: "attendees", "startTime", "endTime"',
  };

  const expectedResult = createLambdaResponse(expectedError, 403);

  const result = await main(event);

  expect(result).toEqual(expectedResult);
});

it('returns no time slots for a user if a time span is empty', async () => {
  expect.assertions(1);

  getTimeSpans.mockResolvedValueOnce({
    data: {
      data: {
        attributes: {
          [mockAttendee]: [],
        },
      },
    },
  });

  const expectedResult = createLambdaResponse({ [mockAttendee]: {} });

  const result = await main(mockEvent);

  expect(result).toEqual(expectedResult);
});
