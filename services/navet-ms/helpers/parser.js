import parser from 'xml2js';
import { ResourceNotFoundError } from '@helsingborg-stad/npm-api-error-handling';

export const getPersonPostSoapRequestPayload = ({
    personalNumber,
    orderNumber,
    organisationNumber,
    xmlEnvUrl,
}) => `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="${xmlEnvUrl}">
  <soapenv:Header/>
  <soapenv:Body>
    <v1:PersonpostRequest>
      <v1:Bestallning>
        <v1:OrgNr>${organisationNumber}</v1:OrgNr>
        <v1:BestallningsId>${orderNumber}</v1:BestallningsId>
      </v1:Bestallning>
      <v1:PersonId>${personalNumber}</v1:PersonId>
    </v1:PersonpostRequest>
  </soapenv:Body>
</soapenv:Envelope>`;

export const getPersonPostCollection = (xml) =>
    new Promise((resolve, reject) => {
        try {
            const xmlPersonPostArray = xml.split('Folkbokforingsposter>');

            if (xmlPersonPostArray.length < 2) {
                throw new ResourceNotFoundError();
            }
            const [, xmlPersonPost] = xmlPersonPostArray;
            const [xmlPersonPostElement] = xmlPersonPost.split('</ns0:');

            const options = {
                trim: true,
                explicitArray: false,
            };

            parser.parseString(xmlPersonPostElement, options, (error, result) => {
                if (error) {
                    throw error;
                }

                resolve(result);
            });
        } catch (error) {
            reject(error);
        }
    });

export const getErrorMessageFromXML = (xml) =>
    new Promise((resolve, reject) => {
        try {
            const parsedOnce = xml.split('<faultstring>');
            const parsedTwice = parsedOnce[1].split('</faultstring>');
            resolve(parsedTwice[0]);
        } catch (error) {
            reject(error);
        }
    });
