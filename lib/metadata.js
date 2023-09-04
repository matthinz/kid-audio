const fs = require("node:fs/promises");
const path = require("node:path");

async function loadMetadataForFile(file) {
  file = path.resolve(file);
  const metadata = await loadMetadataForDirectory(path.dirname(file));
  return metadata;
}

async function loadMetadataForDirectory(dir) {
  dir = path.resolve(dir);

  let metadata = {};

  const parentDir = path.dirname(dir);

  if (parentDir !== dir && dir !== process.cwd()) {
    metadata = Object.assign(
      metadata,
      await loadMetadataForDirectory(parentDir)
    );
  }

  const metadataFile = path.join(dir, ".metadata.json");

  let rawMetadata;
  try {
    rawMetadata = await fs.readFile(metadataFile, "utf-8");
  } catch (err) {
    if (err.code != "ENOENT") {
      throw new Error(`Error reading ${metadataFile}: ${err.message}`);
    }
  }

  let stat;
  try {
    stat = await fs.stat(metadataFile);
  } catch (err) {
    if (err.code != "ENOENT") {
      throw err;
    }
  }

  let __mtime = 0;

  [metadata.__mtime, stat?.mtime].forEach((mtime) => {
    if (mtime != null && mtime > __mtime) {
      __mtime = mtime;
    }
  });

  return Object.assign(
    metadata,
    rawMetadata == null || rawMetadata == "" ? {} : JSON.parse(rawMetadata),
    {
      __mtime,
    }
  );
}

module.exports = { loadMetadataForDirectory, loadMetadataForFile };
