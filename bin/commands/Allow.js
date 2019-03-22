const rank = require("../structure/Ranks");
const Command = require("../structure/Command");
const logger = require("../core/Logger");

module.exports = new Command(
    rank.mod,
    "",
    (bot, message) => {
        const victim = message.msg.trim();
        bot.userlist.hasHigherRank(message.user, victim)
            .then(async resp => {
                if (resp.isFailure) {
                    logger.system(`${message.user.name} is not high enough rank to allow ${message.msg}`);
                    return bot.sendMsg(resp.result, message, true);
                }
                resp = await bot.db.setDisallowUser(victim, false);
                logger.system(`Allowed ${message.msg}`);
                bot.sendMsg(resp.result, message, true);
            });
    }
);