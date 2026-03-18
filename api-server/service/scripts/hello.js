const { getLhd } = require("./common");
module.exports = async (ctx, src, packet) => {
  const { log, utils } = ctx;
  let lhd = `[${src}:${packet.hd.tid}] sample -`;

  log.info(
    `${lhd} >> ${getLhd(packet.hd.tid, src, "hello")} start hello. data [${JSON.stringify(packet.dt)}], session [${JSON.stringify(packet.ss)}]`,
  );

  // set variables
  const output = { data: "Hello, World!" };

  log.info(`${lhd} << complete sample 3`);
  return utils.makeResData("S0001", "Success", output);
};
