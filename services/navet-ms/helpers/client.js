import { requestClient } from '../../../libs/request';
import * as certs from '../../../libs/certificates';

export default async function client(params) {
  const { bucketName, passphrase, pfxName } = params;

  const navetPfx = await certs.read(bucketName, pfxName);

  const options = {
    pfx: navetPfx.Body,
    passphrase,
    rejectUnauthorized: false,
  };

  return requestClient(options, { 'Content-Type': 'text/xml;charset=UTF-8' });
}
