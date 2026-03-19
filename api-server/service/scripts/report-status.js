const { getLhd } = require("./common");
const { makeResData } = require("./error-code");

module.exports = async (ctx, src, packet) => {
  const { log, utils } = ctx;
  let lhd = getLhd(packet.hd.tid, src, "report-status");

  log.info(
    `${lhd} >> start report-status. data [${JSON.stringify(packet.dt)}], session [${JSON.stringify(packet.ss)}]`,
  );

  // set variables
  const output = { data: "Hello, World!" };

  log.info(`${lhd} << complete report-status`);
  return makeResData(utils, "S0001", output);
};
