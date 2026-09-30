const { execFile } = require("child_process");
const fs = require("fs");


// ============================================================
// UPLOAD FILE TO IPFS
// ============================================================

function uploadToIPFS(filePath) {

    return new Promise((resolve, reject) => {

        execFile(
            "ipfs",
            ["add", "-Q", filePath],
            {
                timeout: 120000
            },
            (error, stdout, stderr) => {

                if (error) {

                    console.error("IPFS upload error:");
                    console.error(stderr);

                    return reject(
                        new Error(
                            "Failed to upload file to IPFS"
                        )
                    );
                }

                const cid = stdout.trim();

                if (!cid) {

                    return reject(
                        new Error(
                            "IPFS did not return a CID"
                        )
                    );
                }

                resolve(cid);
            }
        );

    });
}


// ============================================================
// DOWNLOAD FILE FROM IPFS
// ============================================================

function downloadFromIPFS(cid, outputPath) {

    return new Promise((resolve, reject) => {

        if (!cid) {

            return reject(
                new Error("IPFS CID is required")
            );
        }


        execFile(
            "ipfs",
            [
                "get",
                cid,
                "-o",
                outputPath
            ],
            {
                timeout: 120000
            },
            (error, stdout, stderr) => {

                if (error) {

                    console.error(
                        "IPFS download error:"
                    );

                    console.error(stderr);

                    return reject(
                        new Error(
                            "Failed to download file from IPFS"
                        )
                    );
                }


                if (!fs.existsSync(outputPath)) {

                    return reject(
                        new Error(
                            "Downloaded IPFS file not found"
                        )
                    );
                }


                resolve(outputPath);

            }
        );

    });
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    uploadToIPFS,

    downloadFromIPFS

};
