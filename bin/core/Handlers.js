const logger = require("./Logger");
const User = require("../structure/Message").User;
const Option = require("../bot/Poll").Option;
const Video = require("../structure/Playlist").Video;
const Time = require("../core/Time");
const Exit = require('./Exit');
const Code = Exit.code;
const utils = require("../core/Utils");
const On = require("../structure/Socket").On;

const addHandlers = function (bot) {
    const db = bot.db;
    const library = bot.library;
    const userlist = bot.userlist;
    const playlist = bot.playlist;
    const botPoll = bot.poll;
    const socket = bot.connection.socket;

    // On Actions taken against the bot
    socket.on(On.actions.kicked, data => Exit.terminate(data.reason === `You're banned!` ? Code.banned : Code.kicked, data.reason));

    socket.on(On.playlist.get, (videos) => playlist.setPlaylist(videos.map(video => Video.fromCytube(video))));
    socket.on(On.playlist.update, (data) => playlist.updateCurrentMedia(data.currentTime, data.paused));
    socket.on(On.playlist.change, (data) => {
        const video = Video.fromCytube(data);
        playlist.changeMedia(data.currentTime, video);
        db.deleteNominationsByTitleAndOnlineUsers(video.title, userlist.getNames()).finally();
    });
    socket.on(On.playlist.setCurrent, (id) => playlist.updateMedia(id));
    socket.on(On.playlist.move, (data) => playlist.moveEvent(data.from, data.after));
    socket.on(On.playlist.setTemp, (video) => playlist.setTemp(video.uid, video.temp));
    socket.on(On.playlist.delete, (video) => playlist.removeEvent(video.uid));
    socket.on(On.playlist.setLeader, (user) => playlist.setLeader(user.name));
    socket.on(On.playlist.queue, (media) => {
        const video = Video.fromCytube(media.item);
        db.moveVideoToAlive(video).finally();
        logger.debug(`Alive: ${video.title} (${video.url})`);
        playlist.addEvent(media.after, video);
    });

    socket.on(On.poll.update, (poll) => {
        const options = [];
        // Handle anon polls...
        const count = poll.counts[0];
        if (utils.isUsed(count) && typeof count === 'string' && count.slice(-1) === '?')
            poll.counts = poll.counts.map(c => c.substr(0, c.length - 1) - 0);

        for (let i in poll.options)
            options.push(new Option(utils.htmlDecode(poll.options[i]), poll.counts[i]))
        botPoll.updateEvent(options);
    });
    socket.on(On.poll.open, (poll) => {
        // const creator = poll.initiator;
        // Handle anon polls...
        const count = poll.counts[0];
        if (utils.isUsed(count) && typeof count === 'string' && count.slice(-1) === '?')
            poll.counts = poll.counts.map(c => c.substr(0, c.length - 1) - 0);

        const options = [];
        for (let i in poll.options)
            options.push(new Option(utils.htmlDecode(poll.options[i]), poll.counts[i]))
        botPoll.openEvent(options);
    });
    socket.on(On.poll.close, () => botPoll.closeEvent());

    socket.on(On.userlist.add, (user) => userlist.add(new User(user.name, user.rank)));
    socket.on(On.userlist.setRank, (user) => userlist.updateRank(new User(user.name, user.rank)));
    socket.on(On.userlist.leave, (user) => userlist.remove(new User(user.name)));
    socket.on(On.userlist.get, (users) => userlist.setUsers(
        Object.keys(users).map(key => new User(users[key].name, users[key].rank))
    ));

    socket.on(On.connect.connection, (data) => bot.connection.handleUserLogin(data));
    socket.on(On.connect.needPassword, (data) => bot.connection.handleChannelPassword(data));

    socket.on(On.chat.pm, (data) => bot.receiveMessage(data, true));
    socket.on(On.chat.public, (data) => bot.receiveMessage(data, false));

    socket.on(On.library.searchResults, (data) =>
        library.handleResults(data.results.map(video => Video.fromCytube(video))));

    socket.on(On.error.unknown, (err) => logger.error(err));
    socket.on(On.error.queue, data => {
        const video = Video.fromUrl(data.link);
        db.moveVideoToDead(video).finally();
        logger.debug(`Dead: ${video.url}`);
    });

    /* Unused listeners
    socket.on("disconnect",     (data) => {});
    socket.on("setPlaylistMeta", (data) => {});
    socket.on("emoteList", (emotes) => {});
    socket.on("removeEmote", (emote) => {});
    socket.on("updateEmote", (data) => {});
    socket.on("usercount", (data) => {});
    socket.on("drink", (data) => {});
    */
};

exports.addHandlers = addHandlers;
