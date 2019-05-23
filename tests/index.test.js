const FilesDownloader = require('../index');
const fs = require('fs');

const path = './tmp';
const imgUrl = 'https://i.imgur.com/wYTCtRu.jpg';

const batchImgs = [
    { url: 'https://i.imgur.com/wYTCtRu.jpg', filename: '1.jpg', key: 1 },
    { url: 'https://i.imgur.com/wYTCtRud.jpg', filename: '2.jpg', key: 2 },
    { url: 'https://i.imgur.com/wYTCtRu.jpg', filename: '3.jpg', key: 3 },
    { url: 'https://i.imgur.com/wYTCtRu.jpg', filename: '4.jpg', key: 4 },
    { url: 'https://i.imgur.com/wYTCtRu.jpg', filename: '5.jpg', key: 5 },
    { url: 'https://i.imgur.com/wYTCtRu.jpg', filename: '6.jpg', key: 6 },
];

describe('Testing FilesDownloader', () => {
    beforeAll(() => {
        deleteFolderRecursive(path);
    });
    beforeEach(() => {
        fs.mkdirSync(path, { recursive: true });
    });

    test('Download a file with filename', async () => {
        const filename = 'cat.jpg';
        const filesDownloader = new FilesDownloader({ path });
        await filesDownloader.downloadFile({ url: imgUrl, filename });

        const exist = fs.existsSync(`${path}/${filename}`);

        expect(exist).toBeTruthy();
    });

    test('Download a file with no filename', async () => {
        const filesDownloader = new FilesDownloader({ path });
        const filename = filesDownloader.getFilename(imgUrl);
        await filesDownloader.downloadFile({ url: imgUrl });

        const exist = fs.existsSync(`${path}/${filename}`);

        expect(exist).toBeTruthy();
    });

    test('Download batch images', async () => {
        const filesDownloader = new FilesDownloader({ path, parallelDownloads: 4 });

        const res = await filesDownloader.downloadBatch(batchImgs);

        let fails = 0;
        let success = 0;

        res.forEach(v => {
            if (v.status === 'SUCCESS') {
                success++;
            } else {
                fails++;
            }
        });

        expect(fails).toBe(1);
        expect(success).toBe(5);
    }, 20000);

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
