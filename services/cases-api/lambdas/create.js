import to from 'await-to-js';
import uuid from 'uuid';

import { validateEventBody } from '../../../libs/validateEventBody';
import * as response from '../../../libs/response';
import { validateKeys } from '../../../libs/validateKeys';
import config from '../../../config';
import { CASE_ITEM_TYPE } from '../helpers/constants';
import { decodeToken } from '../../../libs/token';
// todo: move to libs as it's used by forms too
import { putItem } from '../../../libs/queries';

/**
 * Handler function for creating a case and store in dynamodb
 */
export async function main(event) {
  const decodedToken = decodeToken(event);
  const requestBody = JSON.parse(event.body);

  const [validateError, validatedEventBody] = await to(
    validateEventBody(requestBody, validateCreateCaseRequestBody)
  );

  if (validateError) return response.failure(validateError);

  const caseId = uuid.v1();
  const casePartitionKey = `USER#${decodedToken.personalNumber}`;
  const createdAt = Date.now();

  // Case item
  const params = {
    TableName: config.cases.tableName,
    Item: {
      PK: casePartitionKey,
      SK: `${casePartitionKey}#CASE#${caseId}`,
      ITEM_TYPE: CASE_ITEM_TYPE,
      id: caseId,
      createdAt: createdAt,
      updatedAt: createdAt,
      personalNumber: decodedToken.personalNumber,
      type: validatedEventBody.type,
      formId: validatedEventBody.formId,
      status: validatedEventBody.status,
      data: validatedEventBody.data,
      // TODO: add meta to store viva period stuff
    },
  };

  const [dynamodbError] = await to(putItem(params));
  if (dynamodbError) return response.failure(dynamodbError);

  return response.success(201, {
    type: 'cases',
    id: caseId,
    attributes: {
      formId: validatedEventBody.formId,
      personalNumber: decodedToken.personalNumber,
      type: validatedEventBody.type,
      status: validatedEventBody.status,
      data: validatedEventBody.data,
    },
  });
}

/**
 * Function for running validation on the request body.
 * @param {obj} requestBody
 */
function validateCreateCaseRequestBody(requestBody) {
  const keys = ['type', 'data', 'formId'];
  if (!validateKeys(requestBody, keys)) {
    return [false, 400];
  }

  if (typeof requestBody.type !== 'string') {
    return [false, 400, `type key should be of type string. Got ${typeof requestBody.type}`];
  }

  if (typeof requestBody.formId !== 'string') {
    return [false, 400, `formId key should be of type string. Got ${typeof requestBody.formId}`];
  }

  if (typeof requestBody.data !== 'object') {
    return [false, 400, `data key should be of type object. Got ${typeof requestBody.data}`];
  }

  return [true];
}
