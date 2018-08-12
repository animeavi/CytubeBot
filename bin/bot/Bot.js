const Connection = require("../structure/Connection");
const Emit = require('../structure/Socket').Emit;
const User = require("../structure/Message").User;
const Message = require("../structure/Message").Message;
const Validator = require("./Validator");
const Playlist = require("./Playlist");
const Patterns = require("./Pattern").Patterns;
const Library = require("./Library");
const Conversations = require("../structure/Conversations");
const Config = require("../structure/Config");
const Database = require("./Database").Database;
const utils = require("../core/Utils");
const Poll = require("./Poll").Poll;
const commands = require("../structure/CommandDictionary");
const Users = require("./Userlist");
const Time = require("../core/Time");
const logger = require("../core/Logger");

class CytubeBot {
    /**
     * @param configData, json data objectified
     */
    constructor(configData) {
        this.startTime = Time.current();
        User.static.bot = this;
        const config = new Config(configData);

        // Restructuring config data
        this.apikeys = config.apikeys;
        this.connection = new Connection(this, config);

        // Initiate structures for internal record keeping
        this.db = new Database(this, config.databasePath);
        this.validator = new Validator(this);
        this.userlist = new Users(this);
        this.patterns = new Patterns(this);
        this.conversations = new Conversations(this);
        this.poll = new Poll(this);
        this.library = new Library(this);
        this.playlist = new Playlist(this);

        // this.trivia = new Trivia();

        // Last setup part, connect to cytube
        this.connection.connect();
    }

    /**
     * @param {String|String[]} msg
     * @param {Message} receiver
     * @param {Boolean} forcePm
     */
    sendMsg(msg, receiver, forcePm = false) {
        // Splits messages longer than chat limit
        // Concat messages shorter than chat limit (adding linebreak between)
        const messages = utils.formatMessage(msg);
        if (utils.isEmpty(messages)) return;
        const connection = this.connection;
        const pack = {meta: {}};
        const pm = receiver.isPm || forcePm;
        if (pm) pack.to = receiver.user.name;
        const type = pm ? Emit.chat.pm : Emit.chat.public;
        logger.debug(messages);
        messages.forEach(message => {
            pack.msg = message;
            connection.emit(type, pack);
        });
    };

    /**
     * @param data
     * @param {Boolean} pm
     */
    receiveMessage(data, pm) {
        if (this.startTime.isBiggerThan(Time.from(data.time).addSeconds(1)))
            return;

        const lowName = this.connection.name.toLowerCase();
        const lowUser = data.username.toLowerCase();
        const lowMsg = utils.htmlDecode(data.msg.trim()).toLowerCase();

        const user = new User(data.username);
        const message = new Message(utils.htmlDecode(data.msg.trim()), pm, user);

        // Ignore messages from sources we shouldn't take commands from
        if (lowUser === lowName || lowUser === "[server]")
            return logger.chat(message);

        // Get long term info on user
        const dbUser = this.db.getUser(user);

        // Ignore user if told to
        if (utils.isDefined(dbUser) && dbUser.disallow)
            return logger.system(`Disallowed: ${user.name}`);

        // Ignore user if told to
        if (message.command === 'unignore') {
            this.handleCommand(message);
            return logger.command(message);
        }
        if (utils.isDefined(dbUser) && dbUser.ignore)
            return logger.system(`Ignoring: ${user.name}`);

        // Check if command
        if (utils.isDefined(message.command)) {
            // Everything is handled on Message creation

        // Check if command-pattern is made
        } else if (this.patterns.match(message)) {
            // Everything is handled inside .match

        // Check if conversation is to be kept
        } else if (lowMsg.indexOf(lowName) >= 0 || this.conversations.alive(user))
            message.command = 'talk';

        if (utils.isEmpty(message.command))
            return logger.chat(message);

        this.handleCommand(message);
    };

    /**
     * @param {Message} message
     */
    handleCommand(message) {
        const command = commands[message.command.toLowerCase()];
        if (utils.isUndefined(command))
            return this.sendMsg("Unknown command... do '$help'", message);
        if (!command.hasAccess(message.user) && !message.user.hasPermission(message.command))
            return this.sendMsg("Unauthorized access, terminators has been dispatched", message);
        logger.command(message);
        command.function(this, message);
    };
}

module.exports = CytubeBot;