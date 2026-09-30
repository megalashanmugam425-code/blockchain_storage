const fs = require("fs");
const zlib = require("zlib");

async function compressFile(inputPath) {

    const outputPath = `${inputPath}.gz`;

    return new Promise((resolve, reject) => {

        const input = fs.createReadStream(inputPath);

        const output = fs.createWriteStream(outputPath);

        /*
        |--------------------------------------------------------------------------
        | Optimized GZIP Compression
        |--------------------------------------------------------------------------
        | Level 6 gives a good balance between:
        | - Compression ratio
        | - CPU usage
        | - Upload speed
        |
        | We keep GZIP format unchanged so the existing
        | download/decompression process continues to work.
        |--------------------------------------------------------------------------
        */

        const gzip = zlib.createGzip({
            level: 6,
            memLevel: 8,
            strategy: zlib.constants.Z_DEFAULT_STRATEGY
        });

        input
            .pipe(gzip)
            .pipe(output);

        output.on("finish", () => {

            try {

                const originalSize =
                    fs.statSync(inputPath).size;

                const compressedSize =
                    fs.statSync(outputPath).size;

                const compressionRatio =
                    originalSize > 0
                        ? (
                            (1 - compressedSize / originalSize) *
                            100
                        ).toFixed(2)
                        : "0.00";

                resolve({
                    outputPath,
                    originalSize,
                    compressedSize,
                    compressionRatio
                });

            }

            catch (error) {

                reject(error);

            }

        });

        input.on("error", reject);
        gzip.on("error", reject);
        output.on("error", reject);

    });

}


function decompressFile(inputPath, outputPath) {

    return new Promise((resolve, reject) => {

        const input =
            fs.createReadStream(inputPath);

        const output =
            fs.createWriteStream(outputPath);

        const gunzip =
            zlib.createGunzip();

        input
            .pipe(gunzip)
            .pipe(output);

        output.on("finish", resolve);

        input.on("error", reject);
        gunzip.on("error", reject);
        output.on("error", reject);

    });

}


module.exports = {
    compressFile,
    decompressFile
};
