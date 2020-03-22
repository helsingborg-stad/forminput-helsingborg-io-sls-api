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
  const { orderRef } = JSON.parse(event.body);
  const bankIdSSMparams = await SSMParams;

  const payload = { orderRef };

  const [error, bankIdCancelResponse] = await to(sendBankIdCancelRequest(bankIdSSMparams, payload));
  if (!bankIdCancelResponse) response.failure(error);

  return response.success({
    type: 'bankidCancel',
    attributes: {
      ...snakeCaseKeys(bankIdCancelResponse.data),
    },
  });
};

async function sendBankIdCancelRequest(params, payload) {
  let error, bankIdClientResponse, bankIdCancelResponse;

  [error, bankIdClientResponse] = await to(bankId.client(params));
  if (!bankIdClientResponse) throwError(503);

  [error, bankIdCancelResponse] = await to(
    request.call(bankIdClientResponse, 'post', bankId.url(params.apiUrl, '/cancel'), payload)
  );

  if (!bankIdCancelResponse) throwError(error.status);

  return bankIdCancelResponse;
}
