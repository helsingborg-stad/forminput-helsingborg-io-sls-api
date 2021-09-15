/* eslint-disable no-console */
import to from 'await-to-js';
import deepEqual from 'deep-equal';

import * as dynamoDb from '../../../libs/dynamoDb';
import config from '../../../config';
import { putEvent } from '../../../libs/awsEventBridge';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';
import log from '../../../libs/logs';

export async function main(event, context) {
  const { personalNumber } = event.detail.user;

  const [getCasesError, userCases] = await to(getCasesSumbittedOrProcessing(personalNumber));
  if (getCasesError) {
    log.error(
      'Get cases error error',
      context.awsRequestId,
      'service-viva-ms-syncWorkflow-001',
      getCasesError
    );

    throw getCasesError;
  }

  const caseList = userCases.Items;
  if (caseList === undefined || caseList.length === 0) {
    log.info(
      'DynamoDB query did not fetch any active:submitted or active:processing case(s)',
      context.awsRequestId,
      'service-viva-ms-syncWorkflow-002'
    );

    return null;
  }

  for (const caseItem of caseList) {
    const caseKeys = {
      PK: caseItem.PK,
      SK: caseItem.SK,
    };

    const { workflowId } = caseItem.details;

    const [adapterWorkflowGetError, workflow] = await to(
      vivaAdapter.workflow.get({ personalNumber, workflowId })
    );
    if (adapterWorkflowGetError) {
      log.error(
        'adapterWorkflowGetError',
        context.awsRequestId,
        'service-viva-ms-syncWorkflow-003',
        adapterWorkflowGetError
      );

      continue;
    }

    if (deepEqual(workflow.attributes, caseItem.details?.workflow)) {
      log.info(
        'case workflow is in sync with Viva',
        context.awsRequestId,
        'service-viva-ms-syncWorkflow-004'
      );

      continue;
    }

    const [updateDbWorkflowError] = await to(updateCaseWorkflow(caseKeys, workflow.attributes));
    if (updateDbWorkflowError) {
      log.error(
        'Update db workflow error',
        context.awsRequestId,
        'service-viva-ms-syncWorkflow-005',
        updateDbWorkflowError
      );

      throw updateDbWorkflowError;
    }

    const [putEventError] = await to(
      putEvent({ caseKeys, workflow }, 'vivaMsSyncWorkflowSuccess', 'vivaMs.syncWorkflow')
    );
    if (putEventError) {
      log.error(
        'Put event error',
        context.awsRequestId,
        'service-viva-ms-syncWorkflow-006',
        putEventError
      );

      throw putEventError;
    }
  }

  return true;
}

async function getCasesSumbittedOrProcessing(personalNumber) {
  const TableName = config.cases.tableName;
  const PK = `USER#${personalNumber}`;

  const params = {
    TableName,
    KeyConditionExpression: 'PK = :pk',
    FilterExpression:
      '(begins_with(#status.#type, :statusTypeSubmitted) or begins_with(#status.#type, :statusTypeProcessing)) and provider = :provider',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#type': 'type',
    },
    ExpressionAttributeValues: {
      ':pk': PK,
      ':statusTypeSubmitted': 'active:submitted',
      ':statusTypeProcessing': 'active:processing',
      ':provider': 'VIVA',
    },
  };

  return dynamoDb.call('query', params);
}

async function updateCaseWorkflow(caseKeys, workflow) {
  const TableName = config.cases.tableName;

  const params = {
    TableName,
    Key: caseKeys,
    UpdateExpression: 'SET details.workflow = :newWorkflow',
    ExpressionAttributeValues: { ':newWorkflow': workflow },
    ReturnValues: 'NONE',
  };

  return dynamoDb.call('update', params);
}
