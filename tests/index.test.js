const FilesDownloader = require('../index');
const fs = require('fs');

const path = './tmp';
const imgUrl = 'https://i.imgur.com/wYTCtRu.jpg';

describe('Testing FilesDownloader', () => {
    beforeAll(() => {
        deleteFolderRecursive(path);
    });

    test('Download a file with filename', async () => {
        const filename = 'cat.jpg';
        fs.mkdirSync(path, { recursive: true });
        const filesDownloader = new FilesDownloader({ path });
        await filesDownloader.downloadFile({ url: imgUrl, filename });

        const exist = fs.existsSync(`${path}/${filename}`);

        expect(exist).toBeTruthy();
    });

    test('Download a file with no filename', async () => {
        fs.mkdirSync(path, { recursive: true });
        const filesDownloader = new FilesDownloader({ path });
        const filename = filesDownloader.getFilename(imgUrl);
        await filesDownloader.downloadFile({ url: imgUrl });

        const exist = fs.existsSync(`${path}/${filename}`);

        expect(exist).toBeTruthy();
    });

    afterEach(() => {
        deleteFolderRecursive(path);
    });
});

function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file, _index) {
            var curPath = path + '/' + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            } else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}
