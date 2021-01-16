/* eslint-disable no-console */
// import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';
import * as request from '../../../libs/request';
// import * as dynamoDb from '../../../libs/dynamoDb';

const SSMParams = params.read(config.vada.envsKeyName);

export const main = async event => {
  const { user } = event.detail;

  const [periodRequestError, periodRequestResponse] = await to(
    sendPeriodRequest(user.personalNumber)
  );
  if (periodRequestError) {
    return console.error('(viva-ms) syncPeriod', periodRequestError);
  }

  console.log('(viva-ms) syncPeriod', periodRequestResponse);

  return true;
};

async function sendPeriodRequest(personalNumber) {
  const ssmParams = await SSMParams;

  const { hashSalt, hashSaltLength } = ssmParams;
  const personalNumberEncoded = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const { vadaUrl, xApiKeyToken } = ssmParams;
  const authorizedRequestClient = request.requestClient({}, { 'x-api-key': xApiKeyToken });

  const vadaMypagesApplicationUrl = `${vadaUrl}/mypages/${personalNumberEncoded}`;

  const [requestError, vadaResponse] = await to(
    request.call(authorizedRequestClient, 'get', vadaMypagesApplicationUrl)
  );

  if (requestError) {
    if (requestError.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throwError(requestError.response.status, requestError.response.data.message);
    } else if (requestError.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throwError(500, requestError.request.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      throwError(500, requestError.message);
    }
  }

  return vadaResponse.data;
}
