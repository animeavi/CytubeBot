const rank = require("../structure/Ranks");
const Command = require("../structure/Command");
const utils = require("../core/Utils");
const Api = require("../core/Api");
const Video = require("../structure/Playlist").Video;

module.exports = new Command(
    rank.user,
    "",
    (bot, message) => {
        const video = Video.fromMessage(bot, message);
        Api.searchTheMovieDatabase(bot, message, video, '').then(resp => {
            if(!resp.success) return;
            const result = resp.result;

            const saying = [];

            if (utils.isDefined(result.status) && result.status !== "Released")
                saying.push(`**Status ${result.status}**`);
            else
                saying.push(`**Rated ${result.vote_average} from ${result.vote_count} votes**`);

            if (utils.isDefined(result.tagline))
                saying.push(`**${result.tagline}**`);

            saying.push(`**Plot** ${result.overview}`);

            if (utils.isDefined(result.genres))
                saying.push(`**Genres** ${result.genres.map(e => e.name).join(", ")}`);

            saying.push(`**Imdb link** https://www.imdb.com/title/${result.imdb_id}/`);

            bot.sendMsg(saying, message);
        });
    }
);