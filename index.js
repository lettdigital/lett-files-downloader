const fs = require('fs');
const request = require('request');

// eslint-disable-next-line no-useless-escape
const regex = /((?!\/)[\w\_\-\+]+\.(\w{3,5})$)/i;

const LIMIT_RETRY = 3;
/**
 * @class
 * @description A class to manager multiple simultaneous downloads
 */
class FilesDownloader {
    /**
     * A downloader result definition schema
     * @typedef {Object} FilesDownloader~downloaderResult
     * @property {String} key - A file key
     * @property {String} status='SUCCESS'|'FAIL' - A status of download
     */

    /**
     * @constructor
     * @param  {Object} options A configuration object
     * @param  {String} options.path A path to download files
     * @param  {Number} [options.parallelDownloads=10] Max simultaneous downloads
     * @param  {RegExp} [options.fileInUrl=/((?!\/)[\w\_\-\+]+\.(\w{3,5})$)/i] A regex pattern to find filename on URL
     * @param  {Console} [options.log=console] A log instance
     * @param  {Object} [options.headers] An optional header to include on each download
     */
    constructor({ path, parallelDownloads = 10, fileInUrl = regex, log = console, headers }) {
        this.setPath(path);
        this.setParallelDownloads(parallelDownloads);
        this.setLog(log);
        this.setHeaders(headers);
        this.setFileInUrl(fileInUrl);
        this.resetProperties();
    }
    /**
     * @description A setter for path
     * @param  {String} path
     */
    setPath(path) {
        this.path = path;
    }
    /**
     * @description A setter for max simultaneous downloads
     * @param  {Number} parallelDownloads
     */
    setParallelDownloads(parallelDownloads) {
        this.parallelDownloads = parallelDownloads;
    }
    /**
     * @description A setter for headers
     * @param  {Object} headers
     */
    setHeaders(headers) {
        this.headers = headers;
    }
    /**
     * @description A setter for path
     * @param  {Console} log
     */
    setLog(log) {
        this.log = log;
    }
    /**
     * @description A setter for lookup pattern
     * @param  {RegExp} fileInUrl
     */
    setFileInUrl(fileInUrl) {
        this.fileInUrl = fileInUrl;
    }
    /**
     * @description An asyncronous downloader files
     * @param  {Object[]} urls Files to download
     * @param  {String} urls.url A file url
     * @param  {String} [urls.filename] An optional custom filename
     * @param  {String} urls.key A key to identify download status
     * @returns {downloaderResult[]} A status of each download
     */
    async downloadBatch(urls) {
        this.log.debug(`[DOWNLOAD BATCH] Init - urls length = ${urls.length}`);

        this.urls = urls;
        this.urlsLength = urls.length;

        // Reset properties
        this.resetProperties();

        // Initialize buffer
        await this.downloadManager();

        return this.downloaderResult;
    }

    resetProperties() {
        this.buffer = [];
        this.queueFinished = 0;
        this.downloaderResult = [];
    }

    downloadManager() {
        this.log.debug('[DOWNLOAD MANAGER] Init');
        return new Promise(resolve => {
            const { parallelDownloads } = this;
            for (let index = 0; index < parallelDownloads; index++) {
                this.log.debug(`[DOWNLOAD QUEUE] Init queue=${index}`);
                this.downloadQueue(index).then(() => {
                    if (this.downloaderResult.length === this.urlsLength) {
                        resolve();
                    }
                });
            }
        });
    }

    async downloadQueue(index) {
        if (this.urls.length) {
            const url = this.urls.shift();
            await this.downloadRetry(url);
            await this.downloadQueue(index);
        } else {
            this.log.debug(`[DOWNLOAD QUEUE] Finished queue=${index} no more urls to download`);
        }
    }

    async downloadRetry(url, retry = 0) {
        try {
            await this.downloadFile(url);
            this.downloaderResult.push({ key: url.key, status: 'SUCCESS' });
            this.log.debug(`[DOWNLOAD FILE] Success url=${url.url}`, {...url, downloaderResult: this.downloaderResult.length});
        } catch (err) {
            if (retry < LIMIT_RETRY) {
                retry++;
                this.log.warn(`[DOWNLOAD FILE] Pending, retry ${retry} - url=${url.url}`, url);
                await this.downloadRetry(url, retry);
            } else {
                this.downloaderResult.push({ key: url.key, status: 'FAIL', details: err });
                this.log.error(`[DOWNLOAD FILE] Fail - url=${url.url}`, {...err, ...url, downloaderResult: this.downloaderResult.length});
            }
        }
    }

    downloadFile({ url, filename }) {
        const { headers, log, path } = this;

        if (!filename) {
            filename = this.getFilename(url);
        }

        return new Promise((resolve, reject) => {
            request.head(url, (err, res) => {
                if (!err && res && res.statusCode === 200) {
                    let size = 0;
                    request({ url, headers })
                        .on('data', data => {
                            size = data.length;
                        })
                        .pipe(fs.createWriteStream(`${path}/${filename}`))
                        .on('close', () => {
                            if (!size) {
                                log.warn('Zero byte file');
                                try {
                                    fs.unlink(`${path}/${filename}`);
                                } catch (errorUnlink) {
                                    log.warn('Failed to unlink image!');
                                } finally {
                                    reject({ msg: 'Zero byte file' });
                                }
                            } else {
                                resolve(filename);
                            }
                        });
                } else {
                    reject({err, msg: `Download fail url=${url}`});
                }
            });
        });
    }

    getFilename(url) {
        const [filename] = url.match(this.fileInUrl);
        return filename;
    }
}

module.exports = FilesDownloader;
