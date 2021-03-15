/* eslint-disable no-console */
import AWS from 'aws-sdk';
import S3 from '../../../libs/S3';
import { to } from 'await-to-js';
import params from '../../../libs/params';
import config from '../../../config';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);

export async function main(event) {
  const vivaCaseSsmParams = await VIVA_CASE_SSM_PARAMS;
  const caseItem = parseDynamoDBItemFromEvent(event);

  if (caseItem.currentFormId !== vivaCaseSsmParams.completionFormId) {
    console.info(
      '(viva-ms: submitApplication): currentFormId does not match completionFormId from ssm params'
    );
    return false;
  }

  const personalNumber = caseItem.PK.substr(5);

  const caseAnswers = caseItem.forms[caseItem.currentFormId].answers;

  const [attachmentListError, attachmentList] = await to(
    answersToAttachmentList(personalNumber, caseAnswers)
  );
  if (attachmentListError) {
    throw attachmentListError;
  }
  console.info('(viva-ms/submitCompletion): Answers converted to Attachment List', attachmentList);

  const [postCompletionError, postCompletionResponse] = await to(
    vivaAdapter.completion.post({
      personalNumber,
      workflowId: caseItem.details.workflowId,
      attachments: attachmentList,
    })
  );
  if (postCompletionError) {
    throw postCompletionError;
  }

  console.info(
    '(viva-ms/submitCompletion): Viva Adapter Post Request Response',
    postCompletionResponse
  );

  return true;
}

function parseDynamoDBItemFromEvent(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    throw 'Could not read dynamoDB image from event details';
  }
  const dynamoDBItem = AWS.DynamoDB.Converter.unmarshall(event.detail.dynamodb.NewImage);
  return dynamoDBItem;
}

function getAttachmentCategory(tags, attachmentCategories = ['expenses', 'incomes', 'completion']) {
  if (tags && tags.includes('viva') && tags.includes('attachment') && tags.includes('category')) {
    return attachmentCategories.reduce((acc, curr) => {
      if (tags.includes(curr)) {
        return curr;
      }
      return acc;
    }, undefined);
  }
  return undefined;
}

function generateFileKey(keyPrefix, filename) {
  return `${keyPrefix}/${filename}`;
}

async function answersToAttachmentList(personalNumber, answerList) {
  const attachmentList = [];

  for (const answer of answerList) {
    const attachmentCategory = getAttachmentCategory(answer.field.tags);
    if (!attachmentCategory) {
      continue;
    }

    for (const valueItem of answer.value) {
      const s3FileKey = generateFileKey(personalNumber, valueItem.uploadedFileName);

      const [getFileError, file] = await to(S3.getFile(process.env.BUCKET_NAME, s3FileKey));
      if (getFileError) {
        // Throwing the error for a single file would prevent all files from being retrived, since the loop would exit.
        // So instead we log the error and continue the loop iteration.
        console.error(s3FileKey, getFileError);
        continue;
      }

      const attachment = {
        id: s3FileKey,
        name: valueItem.filename,
        category: attachmentCategory,
        fileBase64: file.Body.toString('base64'),
      };

      attachmentList.push(attachment);
    }
  }

  return attachmentList;
}
