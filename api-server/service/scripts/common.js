// const { E_CODE } = require("./error-code");

const getLhd = (tid, src, name) => tid || `${src}:${Date.now()} ${name} - `;

const hasNotValidItem = (lhd, ctx, listener) => {
  const { log, conf } = ctx;

  return null;
};

module.exports = { getLhd, hasNotValidItem };
