const { spawn } = require("node:child_process");

const NOOP = () => {};

/**
 *
 * @param args {string[]}
 * @returns Promise<string>
 */
function ffmpeg(args, handleStdOut = NOOP, handleStdErr= NOOP) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", args);

    const cleanUpStdErr = lineOrientedReader(p.stderr, handleStdErr);

    const cleanUpStdOut = lineOrientedReader(p.stdout, handleStdOut);

    p.on("error", reject);

    p.on("close", () => {
      cleanUpStdErr();
      cleanUpStdOut();
      resolve();
    });
  });
}

function lineOrientedReader(stream, handler) {
  let remainder = "";

  stream.on("data", (chunk) => {
    const lines = (remainder + chunk.toString("utf-8")).split("\n");
    remainder = lines.pop();
    lines.forEach((line) => handler(line));
  });

  return () => {
    if (remainder.length === 0) {
      return;
    }

    handler(remainder);
  };
}

module.exports = {
  ffmpeg,
};
