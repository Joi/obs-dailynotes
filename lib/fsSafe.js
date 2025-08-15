const fs = require('fs');
const path = require('path');

async function writeFileAtomic(filePath, content, options = 'utf8') {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    const tmpPath = path.join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.promises.writeFile(tmpPath, content, options);
    await fs.promises.rename(tmpPath, filePath);
}

module.exports = {
    writeFileAtomic,
};


