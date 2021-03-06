class Response {
    /**
     * @param {Boolean} success
     * @param {*} result
     * @constructor
     */
    constructor(success, result) {
        this.isSuccess = success;
        this.result = result;
    }

    get isFailure() {
        return !this.isSuccess;
    }

}

class Available extends Response {
    /**
     * @param {Boolean} success
     * @param {*} result
     * @param {Video} video
     * @param {Boolean} avail
     * @param {Boolean} retry
     */
    constructor(success, result, video, avail = true, retry = false) {
        super(success, result);
        this.avail = avail;
        this.retry = retry;
        this.video = video;
    }

}

module.exports = {
    Response: Response,
    Available: Available
};