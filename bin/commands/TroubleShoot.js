const rank = require("../structure/Ranks");
const Command = require("../structure/Command");
module.exports = new Command(
    rank.mod,
    "",
    (bot, message) => {
        bot.sendMsg("Under construction", message);
    }
);