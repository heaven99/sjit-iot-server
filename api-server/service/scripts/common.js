const { E_CODE } = require("./error-code");

export const getLhd = (tid, src, name) =>
  tid || `${src}:${Date.now()} ${name} - `;

export const hasNotValidItem = (lhd, ctx, listener) => {
  const { log, conf } = ctx;

  return null;
};
