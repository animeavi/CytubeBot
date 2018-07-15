const rank = require("../structure/Ranks");
const Command = require("../structure/Command");
const utils = require("../core/Utils");

module.exports = new Command(
    rank.guest,
    "",
    (bot, message) => {
        const msg = message.msg.trim();

        if(utils.isEmpty(msg) && message.user.rank >= rank.mod && bot.poll.options.length > 0)
            return bot.sendMsg(`I pick ${bot.poll.pickWinner().title} as winner!`, message);

        if (message.array.length === 0)
            return bot.sendMsg('You need to give me some options', message);

        bot.sendMsg(`I pick ${utils.random(message.array)}`, message);
    }
);