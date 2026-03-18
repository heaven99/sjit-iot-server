// front error code definition, used for front-end error handling and display
// so code have prefix E for error, F for front, and 4 digit number for specific error code, for example E1001 means front-end auth error code 1001
const E_CODE = {
  // request error code
  E0001: { code: "EF0001", message: "Wrong Request" },
  E0002: { code: "EF0002", message: "Not supported interface" },
  E0003: { code: "EF0003", message: "Invalid API Key" },
  E0004: { code: "EF0004", message: "Missing or invalid header" }, // x-payload-signature 누락이나 잘못된 경우
  E0005: { code: "EF0005", message: "Missing or invalid header" }, // x-request-timestamp 누락이나 잘못된 경우
  // auth error code
  E1001: { code: "EF1001", message: "Invalid or expired access token" },
  E1002: { code: "EF1002", message: "Access Token Required" },
  E1003: { code: "EF1003", message: "Invalid access token" }, // hmackey가 없는 경우
  E1004: { code: "EF1004", message: "Invalid access token" }, // hmackey를 이용한 payload 검증 실패
};

const _E = (code) => {
  return E_CODE[code] || { code: "EF0000", message: "Unknown Error" };
};

const makeResData = (utils, code) => {
  const error = _E(code);
  return utils.makeResData(error.code, error.message);
};

export { E_CODE, makeResData };
