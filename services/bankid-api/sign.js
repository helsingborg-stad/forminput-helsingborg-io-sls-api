import { to } from '../../libs/helpers';
import { failure, success } from '../../libs/response';
import * as request from '../../libs/request';
import * as bankId from './helpers/bankId';

export const main = async (event) => {

  const { endUserIp, personalNumber, userVisibleData } = JSON.parse(event.body);

  const payload = {
    endUserIp,
    personalNumber,
    userVisibleData: userVisibleData
        ? Buffer.from(userVisibleData).toString('base64')
        : undefined,
    };

  const { ok, result } =  await to(request.call(
    bankId.client(),
    'post',
    bankId.url('/sign'),
    payload
  ));

  if ( !ok ) {
    return failure({status: false, error: result.response.data});
  }

  return success({status: true, body: result.data});
};
