const { execFile } = require("child_process");

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
                        new Error("Failed to upload file to IPFS")
                    );
                }

                const cid = stdout.trim();

                if (!cid) {
                    return reject(
                        new Error("IPFS did not return a CID")
                    );
                }

                resolve(cid);
            }
        );

    });
}

module.exports = {
    uploadToIPFS
};
