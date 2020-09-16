/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';
import Hashids from 'hashids';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

// import config from '../../../config';
import { VIVA_CASE_TYPE, CASE_STATUS_SUBMIT } from '../../../libs/constants';
import * as request from '../../../libs/request';
import * as response from '../../../libs/response';

const dynamoDbConverter = AWS.DynamoDB.Converter;

/**
 * TODO:
 * Put salt in env config of some sort
 * Salt must match salt stored in env used by viva api adapter
 */
const hashids = new Hashids('6Ujh)XSDB+.39DO`/R|/wWa>64*k=T3>?Xn-*$1:g T&Vv`|X 5<!CzC,YaM&e#U', 32);

/**
 * Handler function for reacting to a stream from the cases table
 */
export const main = async (event, context) => {
  console.log('LAMBDA: submitApplication triggered');
  // console.log('event', event);

  const [record] = event.Records;
  // console.log('record', record);

  if (record.dynamodb.NewImage === undefined) return null;

  // Viva is not keen on the DynamoDb data structure
  const unmarshalledData = dynamoDbConverter.unmarshall(record.dynamodb.NewImage);
  console.log('unmarshalledData', unmarshalledData);

  // Send to Viva only if case is of the correct type
  const isVivaCase = unmarshalledData.type === VIVA_CASE_TYPE;
  const isCaseSubmitted = unmarshalledData.status === CASE_STATUS_SUBMIT;
  // console.log('isVivaCase', isVivaCase);
  // console.log('isCaseSubmitted', isCaseSubmitted);
  if (!isVivaCase || !isCaseSubmitted) return null;

  // Send payload to VADA
  const [err, vadaResponse] = await to(sendVadaRequest(unmarshalledData));
  if (err) return response.failure(err);

  /**
   * Response obj:
   * ERRORCODE
   * ERRORMESSAGE
   * ID (workflow id)
   * IDENCLAIR
   * STATUS
   */
  console.log('VADA repsonse data', vadaResponse.data);

  return true;
};

async function sendVadaRequest(payload) {
  console.log('Submit application data to VADA');
  const { data, personalNumber } = payload;

  // Build Viva api adapter payload blob
  const vadaPayload = {
    application_type: 'renew', // new | renew
    user_hash: hashids.encode(personalNumber),
    data,
  };

  /**
   * TODO:
   * Put Viva api adapter url in env config of some sort
   */
  const [err, vadaCreateApplicationResponse] = await to(
    request.call(
      request.requestClient({}),
      'post',
      'http://vicki.dannilsson.se:5000/applications',
      vadaPayload
    )
  );

  if (err) {
    console.error('Request', err);
    throwError(500);
  }

  return vadaCreateApplicationResponse;
}
