const User = require("../structure/Message").User;
const utils = require("../core/Utils");
const Response = require("../structure/Api").Response;

class Users {

    /**
     * @param {CytubeBot} bot
     */
    constructor(bot) {
        this.bot = bot;
        this.users = {};
    }

    /**
     * @param {User[]} users
     */
    setUsers(users) {
        const self = this;
        self.users = {};
        users.forEach(user => {
            self.users[user.name] = user;
            self.bot.db.insertUser(user).finally();
        });
    }

    /**
     * @param {User} user
     */
    add(user) {
        this.bot.db.insertUser(user).finally();
        this.users[user.name] = user;
    }

    /**
     * @param {User} user
     */
    remove(user) {
        this.bot.db.insertUser(user).finally();
        delete this.users[user.name];
    }

    /**
     * @param {User} user
     */
    updateRank(user) {
        this.add(user);
    }

    /**
     * @param {String} name
     * @returns {Boolean}
     */
    isOnline(name) {
        return utils.isDefined(this.users[name]);
    }

    /**
     * @returns {string[]}
     */
    getNames() {
        return Object.keys(this.users);
    }

    /**
     * @param {User} user
     * @param {String} victimName
     * @return {Promise<Response>}
     */
    hasHigherRank(user, victimName) {
        return this.bot.db.getUserByName(victimName)
            .then(victim => {
                if (utils.isUndefined(victim))
                    return new Response(false, "Victim need to exist in the archives");

                if (user.rank <= victim.rank)
                    return new Response(false, "You need to be higher rank than your victim");

                return new Response(true, `Target acquired, ${victim.name} will be ~~terminated~~ handled`);
            });
    }
}

module.exports = Users;