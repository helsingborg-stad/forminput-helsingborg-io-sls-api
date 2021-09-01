/* eslint-disable no-console */
import to from 'await-to-js';

import config from '../../../config';
import params from '../../../libs/params';
import * as dynamoDb from '../../../libs/dynamoDb';
import validateApplicationStatus from '../helpers/validateApplicationStatus';
import { getStatusByType } from '../../../libs/caseStatuses';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import { logError, logInfo } from '../../../libs/logs';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event, context) {
  const { caseKeys } = event.detail;

  const personalNumber = caseKeys.PK.substring(5);
  const [applicationStatusError, applicationStatusList] = await to(
    vivaAdapter.application.status(personalNumber)
  );
  if (applicationStatusError) {
    logError(
      'Application status error',
      context.awsRequestId,
      'service-viva-ms-checkCompletion-001',
      applicationStatusError
    );

    throw applicationStatusError;
  }

  /**
   * The Combination of Status Codes 64, 128, 256, 512
   * determines if a VIVA Application Workflow requires completion
   * 64 - Completion is required,
   * 128 - Case exsits in VIVA
   * 256 - An active e-application is activated in VIVA
   * 512 - Application allows e-application
   */
  const completionStatusCodes = [64, 128, 256, 512];
  if (!validateApplicationStatus(applicationStatusList, completionStatusCodes)) {
    const errorMessage = 'no completion status found in viva adapter response';
    logError(errorMessage, context.awsRequestId, 'service-viva-ms-checkCompletion-002');

    throw errorMessage;
  }

  const vivaCaseSSMParams = await VIVA_CASE_SSM_PARAMS;
  const [updateCaseError, caseItem] = await to(
    updateCaseCompletionAttributes(caseKeys, vivaCaseSSMParams.completionFormId)
  );

  if (updateCaseError) {
    logError(
      'Update case error',
      context.awsRequestId,
      'service-viva-ms-checkCompletion-003',
      updateCaseError
    );

    throw updateCaseError;
  }

  logInfo(
    'Updated case with completion data successfully',
    context.awsRequestId,
    'service-viva-ms-checkCompletion-004',
    caseItem
  );

  return true;
}

async function updateCaseCompletionAttributes(keys, currentFormId) {
  const completionStatus = getStatusByType('active:completionRequired:viva');
  const [getCaseError, { persons }] = await to(getCase(keys));
  if (getCaseError) {
    throw getCaseError;
  }
  const newPersons = persons ? resetApplicantSignature(persons) : [];

  const params = {
    TableName: config.cases.tableName,
    Key: keys,
    UpdateExpression:
      'set currentFormId = :currentFormId, #status = :completionStatus, persons = :persons',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':currentFormId': currentFormId,
      ':completionStatus': completionStatus,
      ':persons': newPersons,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  const [updateCaseError, caseItem] = await to(dynamoDb.call('update', params));
  if (updateCaseError) {
    throw updateCaseError;
  }

  return caseItem;
}

async function getCase(keys) {
  const params = {
    TableName: config.cases.tableName,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': keys.PK,
      ':sk': keys.SK,
    },
  };

  const [error, dbResponse] = await to(dynamoDb.call('query', params));
  if (error) {
    throw error;
  }

  const caseItem = dbResponse.Items.find(item => item.PK === keys.PK);
  if (!caseItem) {
    throw 'Case not found';
  }

  return caseItem;
}

function resetApplicantSignature(persons) {
  return persons.map(person => {
    if (person.role === 'applicant' && person.hasSigned) {
      person.hasSigned = false;
    }
    return person;
  });
}
