const { getLhd } = require("./common");
const { makeResData } = require("./error-code");

const parseGWData = (data) => {
  const _data = {
    gateway: {
      gw_name: "GW1",
      gw_address: "E4:5F:01:71:81:BC",
      gw_version: "1.0.4",
      gw_latitude: 37.566512,
      gw_longitude: 126.978123,
      gw_boot_time: 183927,
      gw_timestamp: 1758713719,
    },
    tag_data: [
      {
        tag_address: "A1:B2:C3:D4:E5:A2",
        tag_device_type: 2,
        tag_fw_version: "2.0.0",
        tag_deui: "A1:B2:C3:D4:E5:A1",
        tag_rssi: -70,
        tag_battery_voltage: 2987,
        tag_temperature: [36.0, 36.0, 36.0, 36.0, 37.0, 35.0],
        tag_activity: [120, 1500, 1500, 1400, 1000, 900],
        tag_rumination: [25, 32, 18, 28, 22, 30],
        tag_latitude: 37.566512,
        tag_longitude: 126.978123,
        tag_adv_count: 19,
        tag_frame_count: 8,
      },
      {
        tag_address: "A1:B2:C3:D4:E5:A1",
        tag_device_type: 1,
        tag_fw_version: "1.0.0",
        tag_deui: "A1:B2:C3:D4:E5:A1",
        tag_rssi: -70,
        tag_battery_voltage: 2987,
        tag_temperature: [36.0, 36.0, 36.0, 36.0, 37.0, 35.0],
        tag_activity: [120, 1500, 1500, 1400, 1000, 900],
        tag_adv_count: 19,
        tag_frame_count: 8,
      },
    ],
  };

  return {};
};

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
