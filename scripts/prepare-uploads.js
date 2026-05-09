'use strict';

const fs = require('node:fs');
const path = require('node:path');

const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;

if (!volumePath) {
  process.exit(0);
}

const appUploadsPath = path.join(process.cwd(), 'public', 'uploads');

fs.mkdirSync(volumePath, { recursive: true });
fs.mkdirSync(path.dirname(appUploadsPath), { recursive: true });

try {
  const stat = fs.lstatSync(appUploadsPath);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(appUploadsPath);
    if (target === volumePath) {
      process.exit(0);
    }
  }

  fs.rmSync(appUploadsPath, { recursive: true, force: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

fs.symlinkSync(volumePath, appUploadsPath, 'dir');
console.log(`Linked ${appUploadsPath} -> ${volumePath}`);
