import PlaylistVideo from "./models/PlaylistVideo.js";
import Utils from "../infrastructure/Utils";

const Subscribe = {
    playlist: 'playlist',
    update: 'mediaUpdate',
    change: 'changeMedia',
    setCurrent: 'setCurrent',
    move: 'moveVideo',
    setTemp: 'setTemp',
    setLeader: 'setLeader',
    delete: 'delete',
    queue: 'queue',
    queueFail: 'queueFail'
};

const Publish = {
    move: 'moveMedia',
    queue: 'queue',
    jumpTo: 'jumpTo',
    request: 'requestPlaylist',
    delete: 'delete'
};

export default class PlaylistService {

    /**
     * @param {CytubeService} cytube
     * @param {LibraryService} library
     * @param {MessageService} message
     */
    constructor(cytube, library, message) {
        this._library = library;
        this._cytube = cytube;
        this._playlist = [];
        this._currentUid = null;
        this._currentPlaytime = 0;
        this._message = message;
        this._isPlaying = true;
    }

    /**
     * @param {PlaylistVideo} video
     * @param {boolean} tempPos
     * @returns {Promise<{success: boolean, data: PlaylistVideo|string}>}
     */
    async queueVideo(video, tempPos = false) {
        return await new Promise(async resolve => {
            const onDone = {
                func: () => {
                }
            };
            const removeSuccess = await this._cytube.on(Subscribe.queue, data => {
                const id = data.item.media.id;
                const type = data.item.media.type;
                if (id !== video.link.id || type !== video.link.type) return;
                onDone.func(true, PlaylistVideo.fromCytubeServer(data.item));
            });
            const removeFail = await this._cytube.on(Subscribe.queueFail, data => {
                const id = data.id;
                if (id !== video.link.id) return;
                onDone.func(false, data.msg.htmlDecode());
            });
            onDone.func = (success, data) => {
                removeSuccess();
                removeFail();
                resolve({success: success, data: data});
            };
            this._cytube.emit(Publish.queue, tempPos ? video.asTempQueueObject : video.asQueueObject);
        });
    }

    subscribe() {
        const self = this;
        this._cytube.on(Subscribe.playlist, data => {
            self._playlist = data.map(e => PlaylistVideo.fromCytubeServer(e));
            self._playlist.forEach(async e => {
                if (!(await self._library.isDead(e)))
                    await self._library.addVideo(e);
            });
        });
        this._cytube.on(Subscribe.update, data => self._currentPlaytime = data.currentTime);
        this._cytube.on(Subscribe.setCurrent, uid => self._currentUid = uid);
        this._cytube.on(Subscribe.move,
            /**
             * @param {{from:number, after:number|string}} data
             */
            data => {
                const fromIndex = self.indexFromUid(data.from);
                if (fromIndex === -1) return;
                const video = self._playlist.splice(fromIndex, 1)[0];
                if (data.after === 'prepend') {
                    self._playlist.unshift(video);
                } else {
                    const afterIndex = self.indexFromUid(data.after);
                    if (afterIndex === -1) return;
                    self._playlist.splice(afterIndex + 1, 0, video);
                }
            });
        this._cytube.on(Subscribe.setTemp,
            /**
             * @param {{uid: number, temp: boolean}} data
             */
            data => {
                const video = self.getByUid(data.uid);
                if (video)
                    video.temp = data.temp;
            });
        // this._cytube.on(Subscribe.setLeader, data => { /* not used */ });
        this._cytube.on(Subscribe.delete,
            /**
             * @param {{uid: number}} data
             */
            data => {
                const index = self.indexFromUid(data.uid);
                if (index !== -1) self._playlist.splice(index, 1);
            });
        this._cytube.on(Subscribe.queue,
            /**
             * @param {{item: *, after: number}} data
             * @returns {Promise<void>}
             */
            async data => {
                const video = PlaylistVideo.fromCytubeServer(data.item);
                self._library.addVideo(video).finally();
                if (self._playlist.length === 0)
                    self._playlist.push(video);
                else {
                    const index = self.indexFromUid(data.after);
                    if (index === -1) return;
                    this._playlist.splice(index + 1, 0, video);
                }
            });

        this._cytube.emit(Publish.request);
    }

    /**
     * @returns {{movie: PlaylistVideo, between: PlaylistVideo[]}}
     */
    get nextMovie() {
        const start = this.indexFromUid(this._currentUid);
        if (start === -1) return undefined;
        const response = {
            between: [],
            movie: undefined,
        };
        for (let i = start + 1; i < this._playlist.length; i++) {
            if (!this._playlist[i].isIntermission) {
                response.movie = this._playlist[i];
                return response;
            }
            response.between.push(this._playlist[i]);
        }

        return undefined;
    }

    /**
     * @param {Number} uid
     * @returns {Promise<int>}
     */
    async remove(uid) {
        return await new Promise(async resolve => {
            const onDone = {
                func: () => {
                }
            };
            const remove = await this._cytube.on(Subscribe.delete, data => {
                if (uid !== data.uid) return;
                onDone.func();
            });
            onDone.func = () => {
                remove();
                resolve(uid);
            };
            this._cytube.emit(Publish.delete, uid);
        });
    }

    /**
     * @param {number} offset
     * @returns {PlaylistVideo}
     */
    getByOffset(offset = 0) {
        const from = this.indexFromUid(this._currentUid);
        if (from === -1) return undefined;
        const at = from + offset;
        const secured = Math.max(0, Math.min(this._playlist.length - 1, at));
        return this._playlist[secured];
    }

    /**
     * @param {string} tag
     * @returns {PlaylistVideo}
     */
    getByTag(tag) {
        switch (tag) {
            case 'prev':
                return this.getByOffset(-1);
            case 'curr':
                return this.getByOffset(0);
            case 'next':
                return this.getByOffset(1);
        }
    }

    /**
     * @param {number} uid
     * @returns {PlaylistVideo}
     */
    getByUid(uid) {
        const index = this.indexFromUid(uid);
        if (index === -1) return undefined;
        return this._playlist[index];
    }

    /**
     * @param {Number} uid
     * @returns {number}
     */
    indexFromUid(uid) {
        for (let i = 0; i < this._playlist.length; i++)
            if (this._playlist[i].uid === uid)
                return i;
        return -1;
    }

    /**
     * @param {PlaylistVideo} video
     * @param {int|"prepend"} after
     * @returns {Promise<void>}
     */
    async moveVideo(video, after) {
        return await new Promise(async resolve => {
            const onDone = {
                func: () => {
                }
            };
            const remove = await this._cytube.on(Subscribe.move, data => {
                if (video.uid !== data.from || after !== data.after) return;
                onDone.func();
            });
            onDone.func = () => {
                remove();
                resolve();
            };
            this._cytube.emit(Publish.move, {from: video.uid, after: after});
        });
    }

    /**
     * @param {PlaylistVideo} video
     */
    jumpTo(video) {
        this._cytube.emit(Publish.jumpTo, video.uid);
    }

    /**
     * @returns {int}
     */
    get size() {
        return this._playlist.length;
    }

    /**
     * @param {int} i
     * @returns {PlaylistVideo|undefined}
     */
    getByIndex(i) {
        return this._playlist[i];
    }
}

