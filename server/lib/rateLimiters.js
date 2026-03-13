const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const createRateLimiters = ({
  authLimitWindowMs,
  authLimitMax,
  apiLimitWindowMs,
  apiLimitMax,
  shortcutsLimitWindowMs,
  shortcutsLimitMax,
  captchaLimitWindowMs,
  captchaLimitMax,
  updateLimitWindowMs,
  updateLimitMax,
  isAdminRequest,
}) => {
  const authLimiter = rateLimit({
    windowMs: authLimitWindowMs,
    max: authLimitMax,
    message: { error: 'Too many login/register attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => false,
  });

  const apiLimiter = rateLimit({
    windowMs: apiLimitWindowMs,
    max: apiLimitMax,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ipKey = ipKeyGenerator(req);
      if (req.user && req.user.id) return `${req.user.id}:${ipKey}`;
      return ipKey;
    },
    skip: (req) => isAdminRequest(req),
  });

  const shortcutsLimiter = rateLimit({
    windowMs: shortcutsLimitWindowMs,
    max: shortcutsLimitMax,
    message: { error: 'Too many shortcut sync requests, please try again shortly.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (req.user && req.user.id) return `shortcuts:${req.user.id}`;
      return ipKeyGenerator(req);
    },
    skip: (req) => isAdminRequest(req),
  });

  const captchaLimiter = rateLimit({
    windowMs: captchaLimitWindowMs,
    max: captchaLimitMax,
    message: { error: 'Too many captcha requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const updateLimiter = rateLimit({
    windowMs: updateLimitWindowMs,
    max: updateLimitMax,
    message: { error: 'Too many update checks, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req),
  });

  return {
    authLimiter,
    apiLimiter,
    shortcutsLimiter,
    captchaLimiter,
    updateLimiter,
  };
};

module.exports = {
  createRateLimiters,
};
