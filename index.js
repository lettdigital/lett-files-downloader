const fs = require('fs');
const request = require('request');

// eslint-disable-next-line no-useless-escape
const regex = /((?!\/)[\w\_\-\+]+\.(\w{3,5})$)/i;

class FilesDownloader {
    constructor({ path, parallelDownloads = 10, fileInUrl = regex, log = console, headers }) {
        this.setPath(path);
        this.setParallelDownloads(parallelDownloads);
        this.setLog(log);
        this.setHeaders(headers);
        this.setFileInUrl(fileInUrl);
        this.buffer = [];
        this.finishes = 0;
        this.finalStatus = [];
    }

    setPath(path) {
        this.path = path;
    }
    setParallelDownloads(parallelDownloads) {
        this.parallelDownloads = parallelDownloads;
    }
    setHeaders(headers) {
        this.headers = headers;
    }
    setLog(log) {
        this.log = log;
    }
    setFileInUrl(fileInUrl) {
        this.fileInUrl = fileInUrl;
    }

    async downloadBatch(urls) {
        this.urls = urls;

        // Initialize buffer
        await this.downloadManager();

        return this.finalStatus;
    }

    downloadManager() {
        return new Promise(resolve => {
            const { parallelDownloads } = this;
            for (let index = 0; index < parallelDownloads; index++) {
                this.downloadQueue(index).then(() => {
                    if (this.finishes === parallelDownloads) {
                        resolve();
                    }
                });
            }
        });
    }

    async downloadQueue(index) {
        if (this.urls.length) {
            const url = this.urls.shift();
            try {
                await this.downloadFile(url);
                this.finalStatus.push({ key: url.key, status: 'SUCCESS' });
            } catch (err) {
                this.finalStatus.push({ key: url.key, status: 'FAIL' });
            } finally {
                await this.downloadQueue(index);
            }
        } else {
            this.finishes++;
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
                    reject({ msg: 'File not exists' });
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
