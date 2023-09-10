const { spawn } = require("node:child_process");
const { read } = require("node:fs");

const NOOP = () => {};

/**
 *
 * @param args {string[]}
 * @param handleStdOut {((string) => void)|undefined}
 * @param handleStdErr {((string) => void)|undefined}
 * @returns Promise<string>
 */
function ffmpeg(args, handleStdOut = undefined, handleStdErr = undefined) {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", args);

    /** @var {string[]} */
    const stdErr = [];
    /** @var {string[]} */
    const stdOut = [];

    const cleanUpStdErr = lineOrientedReader(p.stderr, (line) => {
      stdErr.push(line);
      if (handleStdErr) {
        handleStdErr(line);
      }
    });

    const cleanUpStdOut = lineOrientedReader(p.stdout, (line) => {
      stdOut.push(line);
      if (handleStdOut) {
        handleStdOut(line);
      }
    });

    p.on("error", reject);

    p.on("close", () => {
      cleanUpStdErr();
      cleanUpStdOut();
      resolve();
    });

    p.on("exit", (code) => {
      cleanUpStdErr();
      cleanUpStdOut();

      if (code !== 0) {
        const err = new Error(
          `ffmpeg exited with code ${code}\n${stdErr
            .map((line) => `  ${line}`)
            .join("\n")}`
        );
        err.exitCode = code;
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function ffmpegDynAudNorm(inputFile, outputFile) {
  return ffmpeg([
    "-i",
    inputFile,
    "-filter:a",
    "dynaudnorm=p=0.9:s=5",
    outputFile,
  ]);
}

function ffmpegExtractCoverArt(file, coverArtFile) {
  return ffmpeg(["-i", file, "-an", "-c:v", "copy", "-y", coverArtFile]);
}

async function ffmpegNormalize(inputFile, outputFile) {
  const args = [
    "-i",
    inputFile,
    "-af",
    "loudnorm=print_format=json",
    "-f",
    "null",
    "-",
  ];

  // Do the first pass to get a bunch of values
  const json = [];
  let readingJson = false;
  await ffmpeg(args, NOOP, (line) => {
    if (readingJson) {
      json.push(line);
      return;
    }

    if (/Parsed_loudnorm_/.test(line)) {
      readingJson = true;
    }
  });

  const values = JSON.parse(json.join("\n"));

  // Actually apply the loudnorm filter
  const loudNormValues = {
    linear: "true",
    measured_I: values.input_i,
    measured_LRA: values.input_lra,
    measured_TP: values.input_tp,
    measured_thresh: values.input_thresh,
  };

  const pass2Args = [
    "-i",
    inputFile,
    "-af",
    [
      "loudnorm=",
      Object.keys(loudNormValues)
        .map((k) => `${k}=${loudNormValues[k]}`)
        .join(":"),
    ].join(""),
    "-y",
    outputFile,
  ];

  await ffmpeg(pass2Args);
}

function ffmpegWavToMp3(file, outputFile) {
  return ffmpeg([
    "-i",
    file,
    "-vn", // Disable video
    "-b:a",
    "192k", // Bitrate,
    "-y",
    outputFile,
  ]);
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
  ffmpegExtractCoverArt,
  ffmpegNormalize,
  ffmpegDynAudNorm,
  ffmpegWavToMp3,
};
