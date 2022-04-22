import caseHelper from '../../src/helpers/createCase';
import {
  VivaClient,
  VivaMyPagesPersonApplication,
  VivaMyPagesPersonCase,
  VivaOfficer,
  VivaOfficersOfficer,
  VivaPerson,
  VivaPersonsPerson,
  VivaPersonType,
} from '../../src/types/vivaMyPages';
import { CasePerson, CasePeriod } from '../../src/types/caseItem';

const vivaApplication: VivaMyPagesPersonApplication = {
  workflowid: '123',
  period: {
    start: '2022-01-01',
    end: '2022-01-31',
  },
};

const vivaClient: VivaClient = {
  pnumber: '19860213-2394',
  fname: 'Bror',
  lname: 'Christiansson',
};

const vivaPersonChild: VivaPerson = {
  pnumber: '20000201-4233',
  fname: 'Lisa',
  lname: 'Nilsson',
  type: VivaPersonType.Child,
};

const vivaPersonPartner: VivaPerson = {
  pnumber: '19790412-3241',
  fname: 'Ulla',
  lname: 'Christiansson',
  type: VivaPersonType.Partner,
};

const vivaOfficer: VivaOfficer = {
  name: 'CN=Dan Nilsson/OU=extern/O=UVNHBG',
  mail: 'dan.nilsson@helsingborg.se',
  phone: '0733442266',
  title: 'HBG Works',
  type: 'officer',
  typeenclair: 'Handläggare',
};

const vivaPersonList: VivaPersonsPerson = {
  person: [vivaPersonPartner, vivaPersonChild],
};

const vivaOfficerSingle: VivaOfficersOfficer = {
  officer: vivaOfficer,
};

const vivaCaseClientOnly: VivaMyPagesPersonCase = {
  client: vivaClient,
  officers: vivaOfficerSingle,
  persons: null,
};

const vivaCaseWithPersonList: VivaMyPagesPersonCase = {
  client: vivaClient,
  officers: vivaOfficerSingle,
  persons: vivaPersonList,
};

it('Results in a string without any non numeric characters', () => {
  const someStringIncludingNonNumericChars = '19660201-1212';
  const result = caseHelper.stripNonNumericalCharacters(someStringIncludingNonNumericChars);
  expect(result).toBe('196602011212');
});

it('Returns an CasePeriod object with UTC timestamps', () => {
  const result: CasePeriod = caseHelper.getPeriodInMilliseconds(vivaApplication);
  expect(result).toEqual({
    endDate: 1643587200000,
    startDate: 1640995200000,
  });
});

it('Returns an list with CasePerson objects', () => {
  const result: CasePerson[] = caseHelper.getCasePersonList(vivaCaseWithPersonList);
  expect(result).toEqual([
    {
      personalNumber: '198602132394',
      firstName: 'Bror',
      lastName: 'Christiansson',
      role: 'applicant',
      hasSigned: false,
    },
    {
      personalNumber: '197904123241',
      firstName: 'Ulla',
      lastName: 'Christiansson',
      role: 'coApplicant',
      hasSigned: false,
    },
    {
      personalNumber: '200002014233',
      firstName: 'Lisa',
      lastName: 'Nilsson',
      role: 'children',
    },
  ]);
});

it('Returns an list with the client only as a single CasePerson object', () => {
  const result: CasePerson[] = caseHelper.getCasePersonList(vivaCaseClientOnly);
  expect(result).toEqual([
    {
      personalNumber: '198602132394',
      firstName: 'Bror',
      lastName: 'Christiansson',
      role: 'applicant',
      hasSigned: false,
    },
  ]);
});
