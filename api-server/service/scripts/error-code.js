// back-end error code definition, used for back-end error handling and display
// so code have prefix E for error, B for back-end, and 4 digit number for specific error code, for example E1001 means back-end auth error code 1001
const E_CODE = {
  S0001: { code: "S0001", message: "Success" },
  // request error code
  E0001: { code: "EB0001", message: "Wrong Request" },
  E0002: { code: "EB0002", message: "Not supported interface" },
  E0003: { code: "EB0003", message: "Invalid API Key" },
};

const _E = (code) => {
  return E_CODE[code] || { code: "EB0000", message: "Unknown Error" };
};

const makeResData = (utils, code, data) => {
  const error = _E(code);
  return utils.makeResData(error.code, error.message, data);
};

module.exports = { E_CODE, makeResData };
