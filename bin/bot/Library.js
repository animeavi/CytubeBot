const Message = require("../structure/Message").Message;
const User = require("../structure/Message").User;
const logger = require("../core/Logger");
const Emit = require('../structure/Socket').Emit;

class Library {
    /**
     * @param {CytubeBot} bot
     */
    constructor(bot) {
        this.message = new Message('', true, new User(bot.connection.name));
        this.bot = bot;
    }

    getEverything() {
        this.search("");
    }

    /**
     * @param {String} query
     */
    search(query) {
        this.bot.connection.emit(Emit.library.search, {source: "library", query: query});
    }

    handleResults(videos) {
        videos = videos.filter(video => !video.isIntermission());
        const db = this.bot.db;
        const table = db.structure.videos.table;
        const c = db.structure.videos.columns;

        const validator = this.bot.validator;
        this.bot.sendMsg(`Received ${videos.length} videos from the library`, this.message, true);
        videos.forEach(video => {
            if (db.isDead(video) || db.getVideoExact(video))
                return;
            validator.add(video);
        });
    }

}

module.exports = Library;