const { E_CODE } = require("./error-code");

const setProxyInfo = (sConf, conf) => {
  // proxy server setup from conf
  sConf.PROXY_PROTOCOL = conf["api-server"].protocol || sConf.PROXY_PROTOCOL;
  sConf.PROXY_HOST = conf["api-server"].host || sConf.PROXY_HOST;
  sConf.PROXY_PORT = conf["api-server"].port || sConf.PROXY_PORT;

  return sConf;
};

const getLhd = (tid, src, name) => tid || `${src}:${Date.now()} ${name} - `;

const onOptionMethod = (lhd, ctx, req, res) => {
  const { utils, modules, log } = ctx;
  const { values } = modules;

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
};

const _checkListener = (lhd, log, listener) => {
  if (listener.interface !== "http") {
    log.error(
      `${lhd} << failed proxy http for open. not supported interface. expected [http], actual [${listener.interface}]`,
    );
    return E_CODE.E0002;
  }
  return null;
};

const _checkApiKey = (lhd, log, apiKey, confApiKey) => {
  if (!apiKey) {
    log.error(
      `${lhd} << failed proxy http for open. not found mandatory header. key [apiKey]`,
    );
    return E_CODE.E0003;
  }
  if (apiKey !== confApiKey) {
    log.error(
      `${lhd} << failed proxy http for open. invalid api key. api key [${apiKey}] != [${confApiKey}]`,
    );
    return E_CODE.E0003;
  }
  return null;
};

const hasNotValidItem = (lhd, ctx, listener) => {
  const { log, conf } = ctx;

  let notValid = _checkListener(lhd, log, listener);
  if (notValid) {
    return notValid;
  }
  notValid = _checkApiKey(
    lhd,
    log,
    listener.req.get("apiKey"),
    conf["api-key"],
  );
  if (notValid) {
    return notValid;
  }
  return null;
};

module.exports = { setProxyInfo, getLhd, onOptionMethod, hasNotValidItem };
