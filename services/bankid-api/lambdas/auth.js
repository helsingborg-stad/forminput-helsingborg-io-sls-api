import to from 'await-to-js';
import snakeCaseKeys from 'snakecase-keys';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import * as response from '../../../libs/response';
import * as request from '../../../libs/request';
import * as bankId from '../helpers/bankId';

const SSMParams = params.read(config.bankId.envsKeyName);

export const main = async event => {
  const { endUserIp, personalNumber } = JSON.parse(event.body);
  const bankIdSSMparams = await SSMParams;

  const payload = {
    endUserIp,
    personalNumber,
  };

  const [error, bankIdResponse] = await to(requestBankIdAuth(payload, bankIdSSMparams));
  if (!bankIdResponse) return response.failure(error);

  const { orderRef, autoStartToken } = bankIdResponse.data;

  return response.success({
    type: 'bankIdAuth',
    attributes: {
      order_ref: orderRef,
      auto_start_token: autoStartToken,
    },
  });
};

async function requestBankIdAuth(payload, params) {
  let err, bankIdClient, bankIdAuth;

  [err, bankIdClient] = await to(bankId.client(params));
  if (!bankIdClient) throwError(503);

  [err, bankIdAuth] = await to(
    request.call(bankIdClient, 'post', bankId.url(params.apiUrl, '/auth'), payload)
  );

  if (!bankIdAuth) throwError(err.status);

  return bankIdAuth;
}
