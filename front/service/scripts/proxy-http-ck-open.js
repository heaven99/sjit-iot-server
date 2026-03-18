const http = require("http");
const https = require("https");
const { Buffer } = require("buffer");

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
  const { conf, log, utils, modules } = ctx;
  const { values } = modules;

  sConf.PROXY_PROTOCOL = conf["api-server"].protocol || sConf.PROXY_PROTOCOL;
  sConf.PROXY_HOST = conf["api-server"].host || sConf.PROXY_HOST;
  sConf.PROXY_PORT = conf["api-server"].port || sConf.PROXY_PORT;

  const lhd = `[${src}:${Date.now()}] proxy-http-ck-open -`;

  log.info(`${lhd} >> start proxy http for ck open`);

  // validate
  // listener는 http만 지원한다.
  if (listener.interface !== "http") {
    log.info(
      `${lhd} << failed proxy http for ck open. not supported interface. exepected [http], actual [${listener.interface}]`,
    );
    return utils.makeResData("E0001", "Not supported interface");
  }

  if (!listener.req.get("h-authorization")) {
    log.info(
      `${lhd} << failed proxy http for ck open. not found mandatory header. key [h-authorization]`,
    );
    return utils.makeResData("E0001", "Wrong Request");
  }

  // define variables
  const { req, res } = listener;
  const hAuthorization = req.get("h-authorization");
  const hDate = req.get("h-date");
  const hContentType = req.get("content-type");
  const body = packet.dt;
  let apiType = "";
  let apiKey = "";
  let signature = "";
  let proxyModule = http;
  let session;
  let proxySrc = src;
  let app;

  // handle option method. CORS Options 처리
  if (req.method.toUpperCase() === "OPTIONS") {
    const origin = utils.web.getHttpHeader(req, values.HTTP_HEADER_ORIGIN);

    log.info(`${lhd} [inn] request method [${req.method}], origin [${origin}]`);

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      utils.web.getHttpHeader(
        req,
        values.HTTP_HEADER_ACCESS_CONTROL_REQUEST_HEADERS,
      ),
    );
    res.setHeader("Access-Control-Allow-Credentials", true);

    res.writeHead(200);
    res.end();

    log.info(`${lhd} [out] request method [${req.method}]`);
    return;
  }

  // validate deep
  const splitAuthHeader = hAuthorization.split(" ");
  if (splitAuthHeader.length !== 2) {
    log.info(
      `${lhd} << failed proxy http for ck open. invalid h-authorization. expected [h-authorization: {{apiType}} {{authData}}], actual [${listener.req.get("h-authorization")}]`,
    );
    return utils.makeResData("E0001", "Wrong Request");
  }

  // api type 이 안맞으면 에러
  if (splitAuthHeader[0] !== sValues.API_TYPE_OPEN) {
    log.warn(
      `${lhd} << failed proxy http for ck open. invalid api type. expected [${sValues.API_TYPE_OPEN}], actual [${splitAuthHeader[0]}]`,
    );
    return utils.makeResData("E0001", "Wrong Request");
  }

  const splitAuthData = splitAuthHeader[1].split(":");
  if (splitAuthData.length !== 2) {
    log.info(
      `${lhd} << failed proxy http for ck open. invalid h-authorization. expected [h-authorization: {{apiType}} {{accessToken}}:{{signature}}], actual [${listener.req.get("h-authorization")}]`,
    );
    return utils.makeResData("E0001", "Wrong Request");
  }

  // set h authorization value
  [apiType] = splitAuthHeader;
  [apiKey, signature] = splitAuthData;
  log.debug(
    `${lhd} check api type [${apiType}], api key [${apiKey}], signature [${signature}]`,
  );

  // set proxy module
  if (sConf.PROXY_PROTOCOL === "https") {
    proxyModule = https;
  }

  // find app
  const findAppInfo = await modules.core.findAppByApiKey(apiKey, lhd);
  if (!findAppInfo.succ) {
    log.error(
      `${lhd} << failed proxy http for ck open. failed find app by api key. err [${findAppInfo.err}]`,
    );
    return utils.makeResData("E0001", "Failed");
  }
  app = findAppInfo.data;

  if (!app) {
    log.warn(
      `${lhd} << failed proxy http for ck open. not found app. api key [${apiKey}]`,
    );
    return utils.makeResData("E0001", "Wrong Request");
  }

  // check signature
  const isSignatureCorrect = await modules.core.crypto.checkSignature(
    signature,
    req.method,
    body,
    hDate,
    req._parsedUrl.pathname,
    app.api_secret,
    hContentType,
    lhd,
  );
  if (!isSignatureCorrect) {
    log.warn(`${lhd} << failed proxy http for ck open. invalid signature`);
    return utils.makeResData("E0001", "Wrong Request");
  }

  // set session data
  session = {
    app,
    user: null,
  };

  // execute proxy
  let _body = "";
  if (body) {
    _body = JSON.stringify(body);
  }

  const proxyOptions = {
    // hostname: 'http://localhost:11003',
    hostname: sConf.PROXY_HOST,
    port: sConf.PROXY_PORT,
    path: req.url,
    method: req.method,
    headers: {
      // 'Content-Type': 'application/json',
      // 'Content-Length': _body.length
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(_body, "utf8"),
      "ck-src": proxySrc,
    },
  };

  if (session) {
    proxyOptions.headers["ck-session"] = encodeURIComponent(
      JSON.stringify(session),
    );
  }

  let isBuffer = false;
  const handleProxyRes = (r, proxyRes) => {
    let body = "";
    const chunks = [];

    proxyRes.on("data", (chunk) => {
      body += chunk;
      chunks.push(chunk);
    });

    proxyRes.on("end", () => {
      const bodyBuffer = Buffer.concat(chunks);
      const contentType = proxyRes.headers["content-type"] || "";

      // handle json response
      if (contentType.includes("application/json")) {
        // JSON 응답이 확실할 경우 utf8로 문자열 변환
        const bodyString = bodyBuffer.toString("utf8");
        let json;
        try {
          json = JSON.parse(bodyString);
          return r({ succ: true, data: json });
        } catch (e) {
          return r({ succ: false, err: "JSON parse failed", raw: bodyString });
        }
      }
      // handle other response
      else {
        log.debug(
          `${lhd} check proxy res headers [${JSON.stringify(proxyRes.headers)}]`,
        );
        isBuffer = true;
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (
            key === "content-type" ||
            key === "content-disposition" ||
            key === "content-length"
          ) {
            log.debug(
              `${lhd} [out] response header. key [${key}], value [${value}]`,
            );
            res.set(key, value);
          }
        });

        // JSON이 아닌 경우는 바이너리로 처리
        return r({ succ: true, data: bodyBuffer });
      }
    });
  };
  const proxyInfo = await new Promise((r) => {
    const proxyReq = proxyModule.request(proxyOptions, (proxyRes) =>
      handleProxyRes(r, proxyRes),
    );

    proxyReq.on("error", (e) => {
      console.error(`Error: ${e.message}`);
      r({
        succ: false,
        err: e,
      });
    });

    proxyReq.write(_body, "utf8");
    proxyReq.end();
  });

  // access token 갱신
  // if (proxyInfo.data && proxyInfo.data.resCd === values.RES_CD_SUCCESS) {
  //     res.append(values.HTTP_HEADER_CK_ACCESS_TOKEN, proxyInfo.data.accessToken);
  // }

  log.info(`${lhd} << complete proxy http for ck open`);
  if (isBuffer) {
    res.end(proxyInfo.data);
    return;
  }

  return proxyInfo.data;
};
