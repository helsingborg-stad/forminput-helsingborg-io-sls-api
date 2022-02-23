import {
  ACTIVE_ONGOING,
  ACTIVE_SIGNATURE_PENDING,
  ACTIVE_SIGNATURE_COMPLETED,
  ACTIVE_SUBMITTED,
  ACTIVE_COMPLETION_REQUIRED,
  ACTIVE_COMPLETION_ONGOING,
  ACTIVE_COMPLETION_SUBMITTED,
  ACTIVE_RANDOM_CHECK_REQUIRED,
  ACTIVE_RANDOM_CHECK_ONGOING,
  ACTIVE_RANDOM_CHECK_SUBMITTED,
  COMPLETIONS_REQUIRED,
} from '../libs/constants';

function isSignaturePending({ answers, people }) {
  return (
    answers && isEncrypted(answers) && hasApplicantSigned(people) && !hasCoApplicantsSigned(people)
  );
}

function isSignatureCompleted({ answers, people }) {
  return answers && isEncrypted(answers) && hasAllSigned(people);
}

function isOngoing({ answers, people, state }) {
  return (
    isAnswersEncryptedApplicantNotSigend({ answers, people }) && state !== COMPLETIONS_REQUIRED
  );
}

function isSubmitted({ answers, people, state }) {
  return answers && !isEncrypted(answers) && hasAllSigned(people) && state !== COMPLETIONS_REQUIRED;
}

function isCompletionOngoing({ answers, people, state, statusType }) {
  return (
    isAnswersEncryptedApplicantNotSigend({ answers, people }) &&
    state === COMPLETIONS_REQUIRED &&
    statusType.startsWith(ACTIVE_COMPLETION_REQUIRED)
  );
}

function isCompletionSubmitted({ answers, people, state, statusType }) {
  return (
    answers &&
    !isEncrypted(answers) &&
    hasAllSigned(people) &&
    state === COMPLETIONS_REQUIRED &&
    statusType.startsWith(ACTIVE_COMPLETION_REQUIRED)
  );
}

function isRandomCheckOngoing({ answers, people, state, statusType }) {
  return (
    isAnswersEncryptedApplicantNotSigend({ answers, people }) &&
    state === COMPLETIONS_REQUIRED &&
    statusType.startsWith(ACTIVE_RANDOM_CHECK_REQUIRED)
  );
}

function isRandomCheckSubmitted({ answers, people, state, statusType }) {
  return (
    answers &&
    !isEncrypted(answers) &&
    hasAllSigned(people) &&
    state === COMPLETIONS_REQUIRED &&
    statusType.startsWith(ACTIVE_RANDOM_CHECK_REQUIRED)
  );
}

function isAnswersEncryptedApplicantNotSigend({ answers, people }) {
  return answers && isEncrypted(answers) && !hasApplicantSigned(people);
}

function hasAllSigned(people) {
  const peopleWhoMustSign = selectPeopleWhoMustSign(people);
  return peopleWhoMustSign.every(person => person.hasSigned === true);
}

function selectPeopleWhoMustSign(people) {
  return people.filter(person => Object.prototype.hasOwnProperty.call(person, 'hasSigned'));
}

function hasApplicantSigned(people) {
  return people.some(person => person.role === 'applicant' && person.hasSigned === true);
}

function hasCoApplicantsSigned(people) {
  return people.every(person => person.role === 'coApplicant' && person.hasSigned === true);
}

function isEncrypted(answers) {
  if (Array.isArray(answers)) {
    // decrypted answers should allways be submitted as an flat array,
    // if they are we assume the value to be decrypted and return false.
    return false;
  }
  const keys = Object.keys(answers);
  return keys.length === 1 && keys.includes('encryptedAnswers');
}

export default function geStatusTypeOnCondition(conditionOption) {
  const statusCheckList = [
    {
      type: ACTIVE_SIGNATURE_PENDING,
      conditionFunction: isSignaturePending,
    },
    {
      type: ACTIVE_SIGNATURE_COMPLETED,
      conditionFunction: isSignatureCompleted,
    },
    {
      type: ACTIVE_ONGOING,
      conditionFunction: isOngoing,
    },
    {
      type: ACTIVE_SUBMITTED,
      conditionFunction: isSubmitted,
    },
    {
      type: ACTIVE_RANDOM_CHECK_ONGOING,
      conditionFunction: isRandomCheckOngoing,
    },
    {
      type: ACTIVE_RANDOM_CHECK_SUBMITTED,
      conditionFunction: isRandomCheckSubmitted,
    },
    {
      type: ACTIVE_COMPLETION_ONGOING,
      conditionFunction: isCompletionOngoing,
    },
    {
      type: ACTIVE_COMPLETION_SUBMITTED,
      conditionFunction: isCompletionSubmitted,
    },
  ];

  const statusType = statusCheckList.reduce((type, statusCheckItem) => {
    if (statusCheckItem.conditionFunction(conditionOption)) {
      return statusCheckItem.type;
    }
    return type;
  }, undefined);

  return statusType;
}
