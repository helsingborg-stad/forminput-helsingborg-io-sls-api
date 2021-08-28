/* eslint-disable no-console */
import to from 'await-to-js';
import { InternalServerError, UnauthorizedError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import { parseXml, parseErrorMessageFromXML, parseJSON } from '../helpers/parser';
import getNavetRequestClient from '../helpers/client';
import { putEvent } from '../../../libs/awsEventBridge';
import * as request from '../../../libs/request';

const NAVET_PARAMS = params.read(config.navet.envsKeyName);

export async function main(event) {
  const { user } = event.detail;

  const [requestNavetUserError, navetUser] = await to(requestNavetUser(user.personalNumber));
  if (requestNavetUserError) {
    return console.error('(Navet-ms)', requestNavetUserError);
  }

  const eventDetail = getNavetPollEventDetail(navetUser);
  await putEvent(eventDetail, 'NavetPoll', 'navet.poll');

  return true;
}

function getNavetPollEventDetail(navetUser) {
  const eventDetail = {
    personalNumber: navetUser.PersonId.PersonNr,
    firstName: navetUser.Namn.Fornamn,
    lastName: navetUser.Namn.Efternamn,
    address: {
      street: navetUser.Adresser.Folkbokforingsadress.Utdelningsadress2,
      postalCode: navetUser.Adresser.Folkbokforingsadress.PostNr,
      city: navetUser.Adresser.Folkbokforingsadress.Postort,
    },
    civilStatus: navetUser.Civilstand.CivilstandKod,
  };

  return eventDetail;
}

async function requestNavetUser(personalNumber) {
  const ssmParams = await NAVET_PARAMS;
  ssmParams.personalNumber = personalNumber;

  const [getNavetClientError, navetRequestClient] = await to(getNavetRequestClient(ssmParams));
  if (getNavetClientError) {
    throw getNavetClientError;
  }

  const navetPostRequestXmlPayload = parseXml(ssmParams);

  const [postNavetClientError, navetUser] = await to(
    request.call(
      navetRequestClient,
      'post',
      ssmParams.personpostXmlEndpoint,
      navetPostRequestXmlPayload
    )
  );
  if (postNavetClientError) {
    if (postNavetClientError.response) {
      const [, navetResponseXmlErrorMessage] = await to(
        parseErrorMessageFromXML(postNavetClientError.response.data)
      );

      throw navetResponseXmlErrorMessage;
    }

    throw postNavetClientError;
  }

  return await getNavetUserPersonPostAsJson(navetUser);
}

async function getNavetUserPersonPostAsJson(navetUser) {
  const [parseJsonError, navetUserJson] = await to(parseJSON(navetUser.data));
  if (parseJsonError) {
    throw parseJsonError;
  }

  const { Folkbokforingspost } = navetUserJson;
  if (Folkbokforingspost.Personpost === undefined) {
    throw new InternalServerError();
  }

  if (isUserConfidential(navetUserJson)) {
    throw new UnauthorizedError();
  }

  return Folkbokforingspost.Personpost;
}

function isUserConfidential(navetUser) {
  const {
    Folkbokforingspost: { Sekretessmarkering, SkyddadFolkbokforing },
  } = navetUser;

  if (Sekretessmarkering === 'J' || SkyddadFolkbokforing === 'J') {
    return true;
  }

  return false;
}
