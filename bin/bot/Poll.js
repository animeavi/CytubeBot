const utils = require("../core/Utils");
const logger = require("../core/Logger");
const Emit = require('../structure/Socket').Emit;

class Poll {
    /**
     * @param {CytubeBot} bot
     */
    constructor(bot) {
        this.bot = bot;
        this.options = [];
        this.lookup = {};
        this.active = false;
    }

    /*
     * @returns {Option}
     */
    pickWinner() {
        if (this.options.length === 0)
            return new Option("There is no poll", 0, false);
        let maxVotes = 0;
        this.options.forEach(option => maxVotes = Math.max(maxVotes, option.votes));
        const ties = this.options.filter(option => option.votes === maxVotes);
        if (ties.length === 1)
            return new Option(ties[0].title, 0, false);
        return ties[utils.random(0, ties.length)];
    }

    /**
     * @returns {String[]}
     */
    getOptions(){
        return this.options.map(e => e.title);
    }

    /**
     * @param {Option[]} options
     */
    openEvent(options) {
        const self = this;
        this.options = options;
        this.lookup = {};
        this.options.forEach(option => self.lookup[option.title] = option);
        this.active = true;
    }

    /**
     * @param {Option[]} options
     */
    updateEvent(options) {
        if (!this.active) return;
        const self = this;
        options.forEach(option => self.lookup[option.title].votes = option.votes)
    }

    closeEvent() {
        this.active = false;
    }

    /**
     * @param {String} title
     * @param {String[]} options
     * @param {Boolean} obscured
     */
    create(title, options, obscured) {
        this.bot.connection.emit(Emit.poll.open, {
            title: title,
            obscured: obscured,
            opts: options
        });
    }

    /**
     * @param {User} user
     */
    close(user) {
        logger.system("'" + (user.name) + "' closed poll through me");
        this.bot.connection.emit(Emit.poll.close);
    }

}

class Option {
    /**
     * @param {String} title
     * @param {Number} votes
     * @param {Boolean} wasInTie
     */
    constructor(title, votes, wasInTie = true) {
        this.title = title.replace(/[']/g, '');
        this.votes = votes;
        this.wasInTie = wasInTie;
    }
}

module.exports = {
    Poll: Poll,
    Option: Option
};