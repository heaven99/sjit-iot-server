const http = require("http");
const https = require("https");
const { Buffer } = require("buffer");
// const { getLhd, setProxyInfo, hasNotValidItem } = require("./common");
// const { E_CODE, makeResData } = require("./error-code");

const sValues = {
  API_TYPE_OPEN: "Open",
  API_TYPE_BEARER: "Bearer",
};

const sConf = {
  PROXY_PROTOCOL: "http",
  PROXY_HOST: "localhost",
  PROXY_PORT: 11001,
};

module.exports = async (ctx, src, packet, listener) => {
  const { conf, log, utils } = ctx;

  // // proxy server setup from conf
  // setProxyInfo(sConf, conf);

  // // tid = SERVER-NODE-DATETIME-SEQ
  // // SEQ => 요청하는 측에서 생성하는 유닉한 ID로서 로그 용도이므로 자리수를 8자리로 고정해서 사용함.
  // // 요청하는 측에서는 1씩 증가시키고 최대 9천9백9만9천9백99까지 최대 값 다음은 다시 1부터 시작
  // // SEQ = 1 부터 시작하는 경우
  // // 1. 프로세스가 종료된 경우
  // // 2. SEQ가 최대값인 9천9백9만9천9백99인 경우 그 다음 요청 시
  // // ex : svr1-app1-202603151020301234-00000001
  // const lhd = getLhd(req.query.tid, src, "proxy-http-open");

  // log.info(`${lhd} >> start proxy http for open`);

  return utils.makeResData("S0001", "Success", {
    message: "Hello from proxy-http-open!",
  });

  // // validate
  // let notValid = hasNotValidItem(lhd, ctx, listener);
  // if (notValid) {
  //   return makeResData(utils, notValid.code);
  // }

  // // define variables
  // const { req, res } = listener;
  // const body = packet.dt;
  // const apiKey = req.get("apiKey");

  // let proxyModule = http;
  // let session;
  // let proxySrc = src;
  // let app;

  // // handle option method. CORS Options 처리
  // if (req.method.toUpperCase() === "OPTIONS") {
  //   return onOptionMethod(lhd, ctx, req, res);
  // }

  // // set proxy module
  // if (sConf.PROXY_PROTOCOL === "https") {
  //   proxyModule = https;
  // }

  // // 현재는 아래 구문이 동작을 하지 않음. 추후에 apiKey 검증 로직이 추가될 때 사용될 예정
  // // // find app
  // // const findAppInfo = await modules.core.findAppByApiKey(apiKey, lhd);
  // // if (!findAppInfo.succ) {
  // //   log.error(
  // //     `${lhd} << failed proxy http for open. failed find app by api key. err [${findAppInfo.err}]`,
  // //   );
  // //   return makeResData(utils, "E0003");
  // // }
  // // app = findAppInfo.data;

  // // if (!app) {
  // //   log.warn(
  // //     `${lhd} << failed proxy http for open. not found app. api key [${apiKey}]`,
  // //   );
  // //   return makeResData(utils, "E0003");
  // // }

  // // set session data
  // session = {
  //   app: { apiKey },
  //   user: null,
  // };

  // // execute proxy
  // let _body = "";
  // if (body) {
  //   _body = JSON.stringify(body);
  // }

  // const proxyOptions = {
  //   // hostname: 'http://localhost:11003',
  //   hostname: sConf.PROXY_HOST,
  //   port: sConf.PROXY_PORT,
  //   path: req.url,
  //   method: req.method,
  //   headers: {
  //     // 'Content-Type': 'application/json',
  //     // 'Content-Length': _body.length
  //     "Content-Type": "application/json; charset=utf-8",
  //     "Content-Length": Buffer.byteLength(_body, "utf8"),
  //     "ck-src": proxySrc,
  //   },
  // };

  // if (session) {
  //   proxyOptions.headers["ck-session"] = encodeURIComponent(
  //     JSON.stringify(session),
  //   );
  // }

  // let isBuffer = false;
  // const handleProxyRes = (r, proxyRes) => {
  //   let body = "";
  //   const chunks = [];

  //   proxyRes.on("data", (chunk) => {
  //     body += chunk;
  //     chunks.push(chunk);
  //   });

  //   proxyRes.on("end", () => {
  //     const bodyBuffer = Buffer.concat(chunks);
  //     const contentType = proxyRes.headers["content-type"] || "";

  //     // handle json response
  //     if (contentType.includes("application/json")) {
  //       // JSON 응답이 확실할 경우 utf8로 문자열 변환
  //       const bodyString = bodyBuffer.toString("utf8");
  //       let json;
  //       try {
  //         json = JSON.parse(bodyString);
  //         return r({ succ: true, data: json });
  //       } catch (e) {
  //         return r({ succ: false, err: "JSON parse failed", raw: bodyString });
  //       }
  //     }
  //     // handle other response
  //     else {
  //       log.debug(
  //         `${lhd} check proxy res headers [${JSON.stringify(proxyRes.headers)}]`,
  //       );
  //       isBuffer = true;
  //       Object.entries(proxyRes.headers).forEach(([key, value]) => {
  //         if (
  //           key === "content-type" ||
  //           key === "content-disposition" ||
  //           key === "content-length"
  //         ) {
  //           log.debug(
  //             `${lhd} [out] response header. key [${key}], value [${value}]`,
  //           );
  //           res.set(key, value);
  //         }
  //       });

  //       // JSON이 아닌 경우는 바이너리로 처리
  //       return r({ succ: true, data: bodyBuffer });
  //     }
  //   });
  // };
  // const proxyInfo = await new Promise((r) => {
  //   const proxyReq = proxyModule.request(proxyOptions, (proxyRes) =>
  //     handleProxyRes(r, proxyRes),
  //   );

  //   proxyReq.on("error", (e) => {
  //     console.error(`Error: ${e.message}`);
  //     r({
  //       succ: false,
  //       err: e,
  //     });
  //   });

  //   proxyReq.write(_body, "utf8");
  //   proxyReq.end();
  // });

  // // access token 갱신
  // // if (proxyInfo.data && proxyInfo.data.resCd === values.RES_CD_SUCCESS) {
  // //     res.append(values.HTTP_HEADER_CK_ACCESS_TOKEN, proxyInfo.data.accessToken);
  // // }

  // log.info(`${lhd} << complete proxy http for ck open`);
  // if (isBuffer) {
  //   res.end(proxyInfo.data);
  //   return;
  // }

  // return proxyInfo.data;
};
