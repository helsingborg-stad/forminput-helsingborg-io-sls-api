import { login, Dependencies } from '../../src/lambdas/login';

const dependencies: Dependencies = {
  readParams: <T>() => {
    return Promise.resolve({
      customerKey: '<customerKey>',
      serviceKey: '<serviceKey>',
      baseUrl: '<baseUrl>',
    } as unknown as T);
  },
  httpsRequest: <T>() => {
    return Promise.resolve({
      redirectUrl: '<https://redirect.se>',
      sessionId: '<1234567890>',
    } as unknown as T);
  },
  createResponse: (statusCode, body) => ({
    statusCode,
    body,
    headers: {
      'Access-Control-Allow-Origin': '',
      'Access-Control-Allow-Credentials': true,
    },
  }),
};
it('should throw on invalid payload', async () => {
  const result = await login(
    {
      body: JSON.stringify({}),
    },
    dependencies
  );
  expect(result.statusCode).toBe(400);
});

it('should return a sessionid', async () => {
  await login(
    {
      body: JSON.stringify({
        callbackUrl: '<callbackUrl>',
      }),
    },
    {
      ...dependencies,
      createResponse: (statusCode, body) => {
        expect(body).toEqual({
          sessionId: '<1234567890>',
        });
        return dependencies.createResponse(statusCode, body);
      },
    }
  );
});
