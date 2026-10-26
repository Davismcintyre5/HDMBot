const Joi = require('joi');

const sessionId = Joi.string().min(1).max(128);

const loginSchema = Joi.object({
  email: Joi.string().min(3).max(128).required(),
  password: Joi.string().min(6).max(256).required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(6).max(256).required(),
  newPassword: Joi.string().min(8).max(256).required()
});

const createSessionSchema = Joi.object({
  sessionId: Joi.string()
    .min(1)
    .max(64)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
});

const disconnectSessionSchema = Joi.object({
  logout: Joi.boolean().default(false)
});

const updateCommandSchema = Joi.object({
  enabled: Joi.boolean(),
  disabledSessions: Joi.array().items(Joi.string()),
  cooldownMsOverride: Joi.number().integer().min(0).max(600000).allow(null),
  aliasesOverride: Joi.array().items(Joi.string().min(1).max(32))
}).min(1);

const triggerSchema = Joi.object({
  type: Joi.string()
    .valid('keyword', 'regex', 'exact', 'startswith', 'contains', 'always')
    .required(),
  pattern: Joi.string()
    .allow(null, '')
    .when('type', { is: 'always', then: Joi.optional(), otherwise: Joi.required() }),
  caseSensitive: Joi.boolean().default(false),
  matchTarget: Joi.string().valid('text', 'caption', 'any').default('text')
});

const scopeSchema = Joi.object({
  type: Joi.string().valid('global', 'chat', 'group', 'dm').default('global'),
  chatJid: Joi.string()
    .allow(null, '')
    .when('type', { is: 'chat', then: Joi.required(), otherwise: Joi.optional() }),
  senderJids: Joi.array().items(Joi.string()),
  senderNotJids: Joi.array().items(Joi.string())
});

const actionSchema = Joi.object({
  type: Joi.string()
    .valid('reply', 'react', 'forward', 'delete', 'warn', 'mute', 'kick')
    .required(),
  payload: Joi.object().default({}),
  stopProcessing: Joi.boolean().default(true)
});

const createRuleSchema = Joi.object({
  sessionId: sessionId.required(),
  name: Joi.string().min(1).max(128).required(),
  enabled: Joi.boolean().default(true),
  priority: Joi.number().integer().min(0).max(100000).default(100),
  scope: scopeSchema.default({ type: 'global' }),
  trigger: triggerSchema.required(),
  action: actionSchema.required(),
  cooldownMs: Joi.number().integer().min(0).max(3600000).default(0)
});

const updateRuleSchema = Joi.object({
  name: Joi.string().min(1).max(128),
  enabled: Joi.boolean(),
  priority: Joi.number().integer().min(0).max(100000),
  scope: scopeSchema,
  trigger: triggerSchema,
  action: actionSchema,
  cooldownMs: Joi.number().integer().min(0).max(3600000)
}).min(1);

const testRuleSchema = Joi.object({
  sampleText: Joi.string().allow('').max(4096).required(),
  sampleSenderJid: Joi.string().allow(null, '').optional()
});

const executeRuleSchema = Joi.object({
  chatJid: Joi.string()
    .pattern(/^(\d{10,15}@s\.whatsapp\.net|\d+@g\.us)$/)
    .required(),
  sampleText: Joi.string().allow('').max(4096),
  senderJid: Joi.string().allow(null, '')
});

const createContactSchema = Joi.object({
  sessionId: sessionId.required(),
  jid: Joi.string().min(3).max(128).required(),
  displayName: Joi.string().allow(null, '').max(128),
  tags: Joi.array().items(Joi.string().min(1).max(32)).default([]),
  notes: Joi.string().allow(null, '').max(2048),
  blacklisted: Joi.boolean().default(false),
  muted: Joi.boolean().default(false)
});

const updateContactSchema = Joi.object({
  displayName: Joi.string().allow(null, '').max(128),
  tags: Joi.array().items(Joi.string().min(1).max(32)),
  notes: Joi.string().allow(null, '').max(2048),
  blacklisted: Joi.boolean(),
  whitelisted: Joi.boolean(),
  muted: Joi.boolean()
}).min(1);

const syncContactSchema = Joi.object({
  sessionId: sessionId.required(),
  jid: Joi.string().min(3).max(128).required()
});

const setSettingSchema = Joi.object({
  value: Joi.any().required()
});

const sendBroadcastSchema = Joi.object({
  sessionId: sessionId.required(),
  targets: Joi.array().items(Joi.string()),
  contactFilter: Joi.object({
    kind: Joi.string().valid('user', 'group'),
    tag: Joi.string(),
    blacklisted: Joi.boolean(),
    whitelisted: Joi.boolean()
  }),
  text: Joi.string().allow(null, '').max(4096),
  mediaUrl: Joi.string().uri().allow(null, ''),
  caption: Joi.string().allow(null, '').max(1024),
  delayMs: Joi.number().integer().min(1000).max(30000)
})
  .or('targets', 'contactFilter')
  .custom((value, helpers) => {
    if (!value.text && !value.mediaUrl) {
      return helpers.message('Provide text or mediaUrl');
    }
    return value;
  });

const previewBroadcastSchema = Joi.object({
  sessionId: sessionId.required(),
  contactFilter: Joi.object({
    kind: Joi.string().valid('user', 'group'),
    tag: Joi.string(),
    blacklisted: Joi.boolean(),
    whitelisted: Joi.boolean()
  }).default({})
});

module.exports = {
  loginSchema,
  changePasswordSchema,
  createSessionSchema,
  disconnectSessionSchema,
  updateCommandSchema,
  createRuleSchema,
  updateRuleSchema,
  testRuleSchema,
  executeRuleSchema,
  createContactSchema,
  updateContactSchema,
  syncContactSchema,
  setSettingSchema,
  sendBroadcastSchema,
  previewBroadcastSchema
};