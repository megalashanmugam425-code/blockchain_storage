const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const File = require("../models/fileModel");

const {
    encryptFile
} = require("../services/fileEncryption");

const {
    uploadToIPFS
} = require("../services/ipfsService");

const {
    storeFileOnBlockchain
} = require("../services/blockchainService");


const UPLOAD_DIR =
    path.join(__dirname, "..", "uploads");

const ENCRYPTED_DIR =
    path.join(__dirname, "..", "encrypted");


function ensureDirectories() {

    if (!fs.existsSync(UPLOAD_DIR)) {

        fs.mkdirSync(UPLOAD_DIR, {
            recursive: true
        });

    }

    if (!fs.existsSync(ENCRYPTED_DIR)) {

        fs.mkdirSync(ENCRYPTED_DIR, {
            recursive: true
        });

    }
}


/*
|--------------------------------------------------------------------------
| Upload File
|--------------------------------------------------------------------------
*/

exports.uploadFile = async (req, res) => {

    let originalFilePath = null;
    let encryptedFilePath = null;

    try {

        ensureDirectories();


        // Check uploaded file

        if (!req.file) {

            return res.status(400).json({
                message: "No file uploaded"
            });

        }


        // Original uploaded file

        originalFilePath =
            req.file.path;


        const originalName =
            req.file.originalname;


        // Make filename safe

        const safeName =
            originalName.replace(
                /[^a-zA-Z0-9._-]/g,
                "_"
            );


        // Generate unique ID

        const uniqueId =
            crypto.randomUUID();


        // Encrypted filename

        const encryptedName =
            `${uniqueId}_${safeName}.enc`;


        // Encrypted file path

        encryptedFilePath =
            path.join(
                ENCRYPTED_DIR,
                encryptedName
            );


        /*
        |--------------------------------------------------------------------------
        | MODULE 2
        | Encrypt file using ChaCha20-Poly1305
        |--------------------------------------------------------------------------
        */

        encryptFile(
            originalFilePath,
            encryptedFilePath
        );


        console.log(
            "File encrypted successfully"
        );


        /*
        |--------------------------------------------------------------------------
        | MODULE 3
        | Upload encrypted file to IPFS
        |--------------------------------------------------------------------------
        */

        const cid =
            await uploadToIPFS(
                encryptedFilePath
            );


        console.log(
            "File uploaded to IPFS"
        );

        console.log(
            "IPFS CID:",
            cid
        );


        /*
        |--------------------------------------------------------------------------
        | MODULE 4
        | Store file metadata on Blockchain
        |--------------------------------------------------------------------------
        */

        const blockchainResult =
            await storeFileOnBlockchain(
                originalName,
                cid
            );


        console.log(
            "File stored on blockchain"
        );

        console.log(
            "Transaction Hash:",
            blockchainResult.transactionHash
        );


        /*
        |--------------------------------------------------------------------------
        | MODULE 5
        | Save metadata in MySQL
        |--------------------------------------------------------------------------
        */

        await File.create(
            req.user.id,
            originalName,
            encryptedName,
            req.file.size,
            cid,
            "uploaded"
        );


        console.log(
            "File metadata saved in database"
        );


        /*
        |--------------------------------------------------------------------------
        | Remove original temporary file
        |--------------------------------------------------------------------------
        */

        if (
            fs.existsSync(
                originalFilePath
            )
        ) {

            fs.unlinkSync(
                originalFilePath
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Success Response
        |--------------------------------------------------------------------------
        */

        return res.status(201).json({

            message:
                "File encrypted, uploaded to IPFS and stored on blockchain successfully",

            file: {

                original_name:
                    originalName,

                encrypted_name:
                    encryptedName,

                file_size:
                    req.file.size,

                ipfs_cid:
                    cid,

                transaction_hash:
                    blockchainResult.transactionHash,

                status:
                    "uploaded"

            }

        });


    } catch (error) {

        console.error(
            "File upload error:"
        );

        console.error(
            error
        );


        /*
        |--------------------------------------------------------------------------
        | Cleanup original file if error occurs
        |--------------------------------------------------------------------------
        */

        if (
            originalFilePath &&
            fs.existsSync(
                originalFilePath
            )
        ) {

            fs.unlinkSync(
                originalFilePath
            );

        }


        return res.status(500).json({

            message:
                "File upload failed",

            error:
                error.message

        });

    }

};


/*
|--------------------------------------------------------------------------
| Get My Files
|--------------------------------------------------------------------------
*/

exports.getMyFiles = async (req, res) => {

    try {

        const files =
            await File.findByUserId(
                req.user.id
            );


        return res.json({

            message:
                "Files retrieved successfully",

            files

        });


    } catch (error) {

        console.error(
            error
        );


        return res.status(500).json({

            message:
                "Failed to retrieve files"

        });

    }

};
