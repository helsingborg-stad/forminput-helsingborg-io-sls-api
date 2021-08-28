import Joi from 'joi';
import { CASE_PROVIDER_VIVA } from '../../../libs/constants';

const uuid = Joi.string().guid({
  version: ['uuidv1', 'uuidv4', 'uuidv5'],
});

const caseProvider = Joi.string().valid(CASE_PROVIDER_VIVA);

const answers = Joi.array().items(
  Joi.object({
    field: Joi.object({
      id: Joi.string().required(),
      tags: Joi.array().items(Joi.string()).required(),
    }).required(),
    value: Joi.any().required(),
  })
);

const encryptedAnswers = Joi.object({
  encryptedAnswers: Joi.string(),
});

const encryption = Joi.object({
  type: Joi.string().required(),
  symmetricKeyName: Joi.string(),
  primes: Joi.object({
    P: Joi.number(),
    G: Joi.number(),
  }),
  publicKeys: Joi.object().pattern(/^/, [Joi.string()]),
});

const formCurrentPosition = Joi.object({
  index: Joi.number().required(),
  level: Joi.number().required(),
  currentMainStep: Joi.number().required(),
  currentMainStepIndex: Joi.number().required(),
});

const signature = Joi.object({
  success: Joi.bool().required(),
});

const form = Joi.object({
  answers: answers.allow(),
  currentPosition: formCurrentPosition.required(),
  encryption: encryption.allow(),
});

const caseValidationSchema = Joi.object({
  statusType: Joi.string().valid('notStarted'),
  currentFormId: uuid.required(),
  provider: caseProvider.required(),
  details: Joi.object().allow(),
  forms: Joi.object().pattern(/^/, [uuid.required(), form.required()]),
});

export const updateCaseValidationSchema = Joi.object({
  currentFormId: uuid.required(),
  answers: [answers.allow(), encryptedAnswers.allow()],
  currentPosition: formCurrentPosition.required(),
  signature: signature.optional(),
  encryption: encryption.allow(),
});

export default caseValidationSchema;
