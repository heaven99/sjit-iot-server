module.exports = async (ctx, src, packet) => {
    const { log, utils } = ctx;
    let lhd = `[${src}:${packet.hd.tid}] sample -`;

    log.info(`${lhd} >> start sample. packet [${JSON.stringify(packet)}]`);

    // set variables
    const output = {};

    log.info(`${lhd} << complete sample 3`);
    return utils.makeResData('S0001', 'Success', output);
};
