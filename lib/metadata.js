const fs = require("node:fs/promises");
const path = require("node:path");

async function loadMetadataForDirectory(dir) {
  dir = path.resolve(dir);

  let metadata = {};

  const parentDir = path.dirname(dir);

  if (parentDir !== dir) {
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

  return Object.assign(
    metadata,
    rawMetadata == null || rawMetadata == "" ? {} : JSON.parse(rawMetadata)
  );
}

module.exports = { loadMetadataForDirectory };
