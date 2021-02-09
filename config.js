/* eslint-disable no-undef */
const stage = process.env.stage;
const resourcesStage = process.env.resourcesStage;

const stageConfigs = {
  dev: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'dev/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'dev/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'dev/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/dev',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
      envsKeyName: '/caseEnvs/dev',
    },
    vada: {
      envsKeyName: '/vadaEnvs/dev',
    },
    navet: {
      envsKeyName: '/navetEnvs/dev',
    },
  },
  test: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'test/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'test/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'test/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/test',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
      envsKeyName: '/caseEnvs/test',
    },
    vada: {
      envsKeyName: '/vadaEnvs/test',
    },
    navet: {
      envsKeyName: '/navetEnvs/test',
    },
  },
  stage: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'stage/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'stage/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'stage/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/stage',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
    },
    vada: {
      envsKeyName: '/vadaEnvs/stage',
    },
    navet: {
      envsKeyName: '/navetEnvs/stage',
    },
  },
  prod: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'prod/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'prod/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'prod/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/prod',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
    },
    vada: {
      envsKeyName: '/vadaEnvs/prod',
    },
    navet: {
      envsKeyName: '/navetEnvs/prod',
    },
  },
};

const config = stageConfigs[stage] || stageConfigs.dev;

export default {
  stage,
  resourcesStage,
  ...config,
};
