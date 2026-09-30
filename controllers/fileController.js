const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const File = require("../models/fileModel");

const FileActivity =
    require("../models/fileActivityModel");

const {
    encryptFile,
    decryptFile
} = require("../services/fileEncryption");

const {
    uploadToIPFS
} = require("../services/ipfsService");

const {
    submitFileTransaction,
    getFileFromBlockchain,
    verifyFileOnBlockchain
} = require("../services/blockchainService");
const {
    compressFile,
    decompressFile
} = require("../services/fileCompression");

const {
    createBackups,
    recoverPrimaryBackup
} = require("../services/backupService");


/*
|--------------------------------------------------------------------------
| Directories
|--------------------------------------------------------------------------
*/

const UPLOAD_DIR =
    path.join(
        __dirname,
        "..",
        "uploads"
    );

const ENCRYPTED_DIR =
    path.join(
        __dirname,
        "..",
        "encrypted"
    );

const DOWNLOAD_DIR =
    path.join(
        __dirname,
        "..",
        "downloads"
    );


/*
|--------------------------------------------------------------------------
| Ensure Directories
|--------------------------------------------------------------------------
*/

function ensureDirectories() {

    if (!fs.existsSync(UPLOAD_DIR)) {

        fs.mkdirSync(
            UPLOAD_DIR,
            {
                recursive: true
            }
        );

    }

    if (!fs.existsSync(ENCRYPTED_DIR)) {

        fs.mkdirSync(
            ENCRYPTED_DIR,
            {
                recursive: true
            }
        );

    }

    if (!fs.existsSync(DOWNLOAD_DIR)) {

        fs.mkdirSync(
            DOWNLOAD_DIR,
            {
                recursive: true
            }
        );

    }

}


/*
|--------------------------------------------------------------------------
| Get Client IP Address
|--------------------------------------------------------------------------
*/

function getClientIp(req) {

    return (
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip ||
        null
    );

}


/*
|--------------------------------------------------------------------------
| Create Activity Log Safely
|--------------------------------------------------------------------------
|
| Audit logging should never break the main file operation.
|
*/

async function createActivityLog(
    req,
    userId,
    fileId,
    activityType,
    activityDescription
) {

    try {

        if (!userId) {

            console.error(
                "Audit log skipped: user ID missing"
            );

            return;

        }


        await FileActivity.create(
            userId,
            fileId || null,
            activityType,
            activityDescription,
            getClientIp(req)
        );


        console.log(
            "AUDIT LOG:",
            activityType,
            "| File ID:",
            fileId || "N/A"
        );

    }

    catch (error) {

        /*
        |----------------------------------------------------------------------
        | Do NOT fail the main operation if audit logging fails.
        |----------------------------------------------------------------------
        */

        console.error(
            "Audit log error:",
            error.message
        );

    }

}


/*
|--------------------------------------------------------------------------
| Upload File
|--------------------------------------------------------------------------
*/


exports.uploadFile = async (req, res) => {

    let originalFilePath = null;
    let compressedFilePath = null;
    let encryptedFilePath = null;

    try {

        ensureDirectories();

        // MODULE 1: Check uploaded file
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        originalFilePath = req.file.path;

        const originalName = req.file.originalname;
        const userId = req.user.id;

        // Make filename safe
        const safeName = originalName.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

        const uniqueId = crypto.randomUUID();

        console.log("==========================================");
        console.log("STARTING SECURE FILE STORAGE PROCESS");
        console.log("Original file:", originalName);
        console.log("==========================================");

        // MODULE 2: Compress file
        const compressionStart = Date.now();

        const compressionResult = await compressFile(
            originalFilePath
        );

        compressedFilePath = compressionResult.outputPath;

        console.log(
            "TIMING - Compression:",
            Date.now() - compressionStart,
            "ms"
        );

        console.log(
            "Original size:",
            compressionResult.originalSize
        );

        console.log(
            "Compressed size:",
            compressionResult.compressedSize
        );

        console.log(
            "Compression ratio:",
            compressionResult.compressionRatio
        );

        // MODULE 3: Encrypt compressed file
        const encryptedName =
            uniqueId + "_" + safeName + ".enc";

        encryptedFilePath = path.join(
            ENCRYPTED_DIR,
            encryptedName
        );

        const encryptionStart = Date.now();

        encryptFile(
            compressedFilePath,
            encryptedFilePath
        );

        console.log(
            "TIMING - Encryption:",
            Date.now() - encryptionStart,
            "ms"
        );

        console.log("File encrypted successfully");

        // MODULE 3.5 and 4:
        // Create three backups and upload to IPFS
        const ipfsBackupStart = Date.now();

        const [backupResult, cid] = await Promise.all([
            createBackups(encryptedFilePath),
            uploadToIPFS(encryptedFilePath)
        ]);

        console.log(
            "TIMING - Backup + IPFS:",
            Date.now() - ipfsBackupStart,
            "ms"
        );

        console.log("Three backups created");
        console.log("IPFS CID:", cid);

        // MODULE 5:
        // Submit blockchain transaction without waiting
        // for transaction confirmation
        const blockchainStart = Date.now();

        const blockchainResult =
            await submitFileTransaction(
                encryptedName,
                cid
            );

        const transactionHash =
            blockchainResult.transactionHash;

        if (!transactionHash) {
            throw new Error(
                "Blockchain transaction hash was not returned"
            );
        }

        console.log(
            "TIMING - Blockchain submission:",
            Date.now() - blockchainStart,
            "ms"
        );

        console.log(
            "Blockchain transaction submitted"
        );

        console.log(
            "Transaction Hash:",
            transactionHash
        );

        // MODULE 6:
        // Store metadata in MySQL with pending status.
        // The worker will update the status after confirmation.
        const fileRecord = await File.create(
            userId,
            originalName,
            encryptedName,
            compressionResult.originalSize,
            compressionResult.compressedSize,
            compressionResult.compressionRatio,
            cid,
            "pending",
            null,
            transactionHash
        );

        const databaseFileId = fileRecord.insertId;

        console.log(
            "File metadata saved with pending status"
        );

        console.log(
            "Database File ID:",
            databaseFileId
        );

        // MODULE 7: Audit log
        await createActivityLog(
            req,
            userId,
            databaseFileId,
            "FILE_UPLOAD_PENDING",
            "File uploaded to IPFS; blockchain confirmation pending"
        );

        // Remove original temporary file
        if (
            originalFilePath &&
            fs.existsSync(originalFilePath)
        ) {
            fs.unlinkSync(originalFilePath);
            console.log("Original temporary file removed");
        }

        // Remove compressed temporary file
        if (
            compressedFilePath &&
            fs.existsSync(compressedFilePath)
        ) {
            fs.unlinkSync(compressedFilePath);
            console.log("Compressed temporary file removed");
        }

        console.log("==========================================");
        console.log("FILE UPLOAD SUBMITTED SUCCESSFULLY");
        console.log("BLOCKCHAIN CONFIRMATION PENDING");
        console.log("==========================================");

        // Return immediately without waiting for confirmation
        return res.status(201).json({

            message:
                "File encrypted, backed up to 3 locations and uploaded to IPFS. Blockchain confirmation is pending.",

            file: {

                id: databaseFileId,

                original_name: originalName,

                encrypted_name: encryptedName,

                file_size:
                    compressionResult.originalSize,

                compressed_size:
                    compressionResult.compressedSize,

                compression_ratio:
                    compressionResult.compressionRatio,

                ipfs_cid: cid,

                blockchain_file_id: null,

                blockchain_tx_hash: transactionHash,

                blockchain_block_number: null,

                upload_status: "pending",

                backups: {

                    primary: backupResult.primary,

                    secondary: backupResult.secondary,

                    tertiary: backupResult.tertiary,

                    verified: backupResult.verified

                }

            }

        });

    } catch (error) {

        console.error("==========================================");
        console.error("FILE UPLOAD ERROR");
        console.error(error);
        console.error("==========================================");

        // Cleanup original temporary file
        if (
            originalFilePath &&
            fs.existsSync(originalFilePath)
        ) {
            try {
                fs.unlinkSync(originalFilePath);
            } catch (cleanupError) {
                console.error(
                    "Original cleanup error:",
                    cleanupError.message
                );
            }
        }

        // Cleanup compressed temporary file
        if (
            compressedFilePath &&
            fs.existsSync(compressedFilePath)
        ) {
            try {
                fs.unlinkSync(compressedFilePath);
            } catch (cleanupError) {
                console.error(
                    "Compressed cleanup error:",
                    cleanupError.message
                );
            }
        }

        return res.status(500).json({

            message: "File upload failed",

            error: error.message

        });

    }

};
exports.getMyFiles = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.id;


        const files =
            await File.findByUserId(
                userId
            );


        return res.status(200).json({

            files

        });

    }

    catch (error) {

        console.error(
            "Get files error:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to fetch files",

            error:
                error.message

        });

    }

};


/*
|--------------------------------------------------------------------------
| Get File Security Details
|--------------------------------------------------------------------------
*/

exports.getFileDetails = async (
    req,
    res
) => {

    try {

        const fileId =
            req.params.id;

        const userId =
            req.user.id;


        const file =
            await File.findById(
                fileId,
                userId
            );


        if (!file) {

            return res.status(404).json({

                message:
                    "File not found or access denied"

            });

        }


        return res.status(200).json({

            id:
                file.id,

            original_name:
                file.original_name,

            encrypted_name:
                file.encrypted_name,

            original_size:
                file.file_size,

            compressed_size:
                file.compressed_size,

            compression_ratio:
                file.compression_ratio,

            encryption:
                "ChaCha20-Poly1305",

            ipfs_cid:
                file.ipfs_cid,

            blockchain_file_id:
                file.blockchain_file_id,

            blockchain_tx_hash:
                file.blockchain_tx_hash,

            upload_status:
                file.upload_status,

            owner_id:
                file.user_id,

            created_at:
                file.created_at

        });

    }

    catch (error) {

        console.error(
            "File details error:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to get file details",

            error:
                error.message

        });

    }

};


/*
|--------------------------------------------------------------------------
| Verify File Against Blockchain
|--------------------------------------------------------------------------
*/

exports.verifyFile = async (
    req,
    res
) => {

    try {

        const fileId =
            req.params.id;

        const userId =
            req.user.id;


        /*
        |----------------------------------------------------------------------
        | Find file belonging to logged-in user
        |----------------------------------------------------------------------
        */

        const file =
            await File.findById(
                fileId,
                userId
            );


        if (!file) {

            return res.status(404).json({

                message:
                    "File not found or access denied"

            });

        }


        /*
        |----------------------------------------------------------------------
        | Check blockchain mapping
        |----------------------------------------------------------------------
        */

        if (
            file.blockchain_file_id ===
                null ||
            file.blockchain_file_id ===
                undefined
        ) {

            return res.status(404).json({

                verified:
                    false,

                message:
                    "Blockchain record not found for this file"

            });

        }


        if (!file.ipfs_cid) {

            return res.status(400).json({

                verified:
                    false,

                message:
                    "IPFS CID is missing from database"

            });

        }


        /*
        |----------------------------------------------------------------------
        | Read blockchain record
        |----------------------------------------------------------------------
        */

        const blockchainFile =
            await getFileFromBlockchain(
                file.blockchain_file_id
            );


        /*
        |----------------------------------------------------------------------
        | Compare CID
        |----------------------------------------------------------------------
        */

        const cidMatches =
            blockchainFile.ipfsCid ===
            file.ipfs_cid;


        /*
        |----------------------------------------------------------------------
        | Compare encrypted file name
        |----------------------------------------------------------------------
        */

        const blockchainFileNameMatches =
            blockchainFile.fileName ===
            file.encrypted_name;


        /*
        |----------------------------------------------------------------------
        | Final verification
        |----------------------------------------------------------------------
        */

        const verified =
            cidMatches &&
            blockchainFileNameMatches;


        console.log(
            "=========================================="
        );

        console.log(
            "BLOCKCHAIN FILE VERIFICATION"
        );

        console.log(
            "Database File ID:",
            file.id
        );

        console.log(
            "Blockchain File ID:",
            file.blockchain_file_id
        );

        console.log(
            "Database IPFS CID:",
            file.ipfs_cid
        );

        console.log(
            "Blockchain IPFS CID:",
            blockchainFile.ipfsCid
        );

        console.log(
            "CID Match:",
            cidMatches
        );

        console.log(
            "File Name Match:",
            blockchainFileNameMatches
        );

        console.log(
            "VERIFIED:",
            verified
        );

        console.log(
            "=========================================="
        );


        /*
        |----------------------------------------------------------------------
        | FEATURE 4
        | Audit Log - File Verified
        |----------------------------------------------------------------------
        */

        await createActivityLog(
            req,
            userId,
            file.id,
            verified
                ? "FILE_VERIFIED"
                : "FILE_VERIFICATION_FAILED",
            verified
                ? "File integrity verified successfully against blockchain"
                : "File integrity verification failed against blockchain"
        );


        return res.status(200).json({

            verified,

            message:
                verified
                    ? "File verified successfully against blockchain"
                    : "Blockchain verification failed",

            database: {

                file_id:
                    file.id,

                original_name:
                    file.original_name,

                encrypted_name:
                    file.encrypted_name,

                ipfs_cid:
                    file.ipfs_cid,

                blockchain_file_id:
                    file.blockchain_file_id,

                blockchain_tx_hash:
                    file.blockchain_tx_hash

            },

            blockchain: {

                file_id:
                    blockchainFile.id,

                owner:
                    blockchainFile.owner,

                file_name:
                    blockchainFile.fileName,

                ipfs_cid:
                    blockchainFile.ipfsCid,

                timestamp:
                    blockchainFile.timestamp

            },

            checks: {

                cid_match:
                    cidMatches,

                file_name_match:
                    blockchainFileNameMatches

            }

        });

    }

    catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "BLOCKCHAIN VERIFICATION ERROR"
        );

        console.error(
            error
        );

        console.error(
            "=========================================="
        );


        return res.status(500).json({

            verified:
                false,

            message:
                "Blockchain verification failed",

            error:
                error.message

        });

    }

};


/*
|--------------------------------------------------------------------------
| Secure File Download
|--------------------------------------------------------------------------
*/

exports.downloadFile = async (
    req,
    res
) => {

    let decryptedFilePath = null;

    let originalFilePath = null;


    try {

        ensureDirectories();


        /*
        |----------------------------------------------------------------------
        | Get file ID
        |----------------------------------------------------------------------
        */

        const fileId =
            req.params.id;


        if (!fileId) {

            return res.status(400).json({

                message:
                    "File ID is required"

            });

        }


        /*
        |----------------------------------------------------------------------
        | Get logged-in user ID
        |----------------------------------------------------------------------
        */

        const userId =
            req.user.id;


        /*
        |----------------------------------------------------------------------
        | Find file belonging to logged-in user
        |----------------------------------------------------------------------
        */

        const file =
            await File.findById(
                fileId,
                userId
            );


        if (!file) {

            return res.status(404).json({

                message:
                    "File not found or access denied"

            });

        }


        /*
        |----------------------------------------------------------------------
        | Encrypted file path
        |----------------------------------------------------------------------
        */

        const encryptedFilePath =
            path.join(
                ENCRYPTED_DIR,
                file.encrypted_name
            );



/*
| Check encrypted file and recover if missing
*/

// Ownership has already been verified using File.findById
// before reaching this section.

if (!fs.existsSync(encryptedFilePath)) {
    console.log("Primary encrypted file missing.");
    console.log("Attempting backup recovery...");

    const recoveryResult = await recoverPrimaryBackup(
        file.encrypted_name
    );

    console.log(
        "Backup recovery result:",
        recoveryResult.recoverySource
    );

    if (!fs.existsSync(encryptedFilePath)) {
        throw new Error(
            "Backup recovery completed but primary file is still missing"
        );
    }

    await createActivityLog(
        req,
        userId,
        file.id,
        "FILE_RECOVERED",
        "Missing primary file restored from backup during download"
    );
}

        /*
        |----------------------------------------------------------------------
        | Temporary decrypted GZIP file
        |----------------------------------------------------------------------
        */

        decryptedFilePath =
            path.join(
                DOWNLOAD_DIR,
                `${crypto.randomUUID()}.gz`
            );


        /*
        |----------------------------------------------------------------------
        | Decrypt encrypted file
        |----------------------------------------------------------------------
        */

        decryptFile(
            encryptedFilePath,
            decryptedFilePath
        );


        console.log(
            "File decrypted successfully"
        );


        /*
        |----------------------------------------------------------------------
        | Temporary original file
        |----------------------------------------------------------------------
        */

        originalFilePath =
            path.join(
                DOWNLOAD_DIR,
                `${crypto.randomUUID()}_${file.original_name}`
            );


        /*
        |----------------------------------------------------------------------
        | Decompress GZIP file
        |----------------------------------------------------------------------
        */

        await decompressFile(
            decryptedFilePath,
            originalFilePath
        );


        console.log(
            "File decompressed successfully"
        );


        /*
        |----------------------------------------------------------------------
        | Download original file
        |----------------------------------------------------------------------
        */

        return res.download(
            originalFilePath,
            file.original_name,
            async (error) => {

                /*
                |------------------------------------------------------------------
                | FEATURE 4
                | Audit Log - File Downloaded
                |------------------------------------------------------------------
                */

                if (!error) {

                    await createActivityLog(
                        req,
                        userId,
                        file.id,
                        "FILE_DOWNLOADED",
                        "File downloaded successfully"
                    );

                }
                else {

                    await createActivityLog(
                        req,
                        userId,
                        file.id,
                        "FILE_DOWNLOAD_FAILED",
                        "File download failed"
                    );

                }


                /*
                |------------------------------------------------------------------
                | Cleanup temporary files
                |------------------------------------------------------------------
                */

                try {

                    if (
                        decryptedFilePath &&
                        fs.existsSync(
                            decryptedFilePath
                        )
                    ) {

                        fs.unlinkSync(
                            decryptedFilePath
                        );

                    }


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

                }

                catch (cleanupError) {

                    console.error(
                        "Download cleanup error:",
                        cleanupError.message
                    );

                }


                if (error) {

                    console.error(
                        "File download error:",
                        error
                    );

                }

            }
        );

    }

    catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "SECURE FILE DOWNLOAD ERROR"
        );

        console.error(
            error
        );

        console.error(
            "=========================================="
        );


        /*
        |----------------------------------------------------------------------
        | Cleanup temporary decrypted file
        |----------------------------------------------------------------------
        */

        if (
            decryptedFilePath &&
            fs.existsSync(
                decryptedFilePath
            )
        ) {

            try {

                fs.unlinkSync(
                    decryptedFilePath
                );

            }

            catch (cleanupError) {

                console.error(
                    "Decrypted cleanup error:",
                    cleanupError.message
                );

            }

        }


        /*
        |----------------------------------------------------------------------
        | Cleanup temporary original file
        |----------------------------------------------------------------------
        */

        if (
            originalFilePath &&
            fs.existsSync(
                originalFilePath
            )
        ) {

            try {

                fs.unlinkSync(
                    originalFilePath
                );

            }

            catch (cleanupError) {

                console.error(
                    "Original cleanup error:",
                    cleanupError.message
                );

            }

        }


        /*
        |----------------------------------------------------------------------
        | Audit failed download attempt
        |----------------------------------------------------------------------
        */

        if (
            req.user &&
            req.user.id
        ) {

            await createActivityLog(
                req,
                req.user.id,
                req.params.id || null,
                "FILE_DOWNLOAD_FAILED",
                "File download failed"
            );

        }


        return res.status(500).json({

            message:
                "File download failed",

            error:
                error.message

        });

    }

};


/*
|--------------------------------------------------------------------------
| Recover Primary Backup
|--------------------------------------------------------------------------
*/


exports.recoverPrimary = async (req, res) => {
    const userId = req.user.id;
    let fileId = null;

    try {
        const fileName = req.params.fileName;

        // Validate filename to prevent path traversal
        if (
            !fileName ||
            typeof fileName !== "string" ||
            path.basename(fileName) !== fileName ||
            fileName.includes("\0")
        ) {
            return res.status(400).json({
                message: "Invalid encrypted file name"
            });
        }

        // Confirm the file belongs to the logged-in user
        const userFiles = await File.findByUserId(userId);

        const matchingFile = userFiles.find(
            file => file.encrypted_name === fileName
        );

        // Never recover a file without verified ownership
        if (!matchingFile) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        fileId = matchingFile.id;

        console.log("STARTING PRIMARY BACKUP RECOVERY");
        console.log("User ID:", userId);
        console.log("Database File ID:", fileId);
        console.log("Encrypted File:", fileName);

        // Recover only after ownership has been verified
        const recoveryResult = await recoverPrimaryBackup(fileName);

        await createActivityLog(
            req,
            userId,
            fileId,
            "FILE_RECOVERED",
            "Primary encrypted file recovered from verified backup copies"
        );

        return res.status(200).json({
            message: "Primary backup recovered successfully",
            recovery: {
                primary: recoveryResult.primary,
                recovery_source: recoveryResult.recoverySource,
                sha256: recoveryResult.hash,
                verified: recoveryResult.verified
            }
        });

    } catch (error) {
        console.error("PRIMARY RECOVERY ERROR:", error);

        if (fileId) {
            await createActivityLog(
                req,
                userId,
                fileId,
                "FILE_RECOVERY_FAILED",
                "Primary backup recovery failed"
            );
        }

        return res.status(500).json({
            message: "Primary backup recovery failed",
            error: error.message
        });
    }
};
/*
|--------------------------------------------------------------------------
| Delete File (Soft Delete)
|--------------------------------------------------------------------------
| Hides the file from the user's dashboard.
| Does not delete IPFS backups or blockchain records.
|--------------------------------------------------------------------------
*/

exports.deleteFile = async (req, res) => {
    try {
        const fileId = Number(req.params.id);
        const userId = req.user.id;

        // Validate file ID
        if (
            !Number.isSafeInteger(fileId) ||
            fileId <= 0
        ) {
            return res.status(400).json({
                message: "Invalid file ID"
            });
        }

        // Verify file ownership
        const file = await File.findById(
            fileId,
            userId
        );

        if (!file) {
            return res.status(404).json({
                message: "File not found or access denied"
            });
        }

        // Soft delete the file
        const affectedRows = await File.softDelete(
            fileId,
            userId
        );

        if (!affectedRows) {
            return res.status(409).json({
                message: "File is already deleted"
            });
        }

        // Record the deletion in the audit log
        await createActivityLog(
            req,
            userId,
            fileId,
            "FILE_DELETED",
            `File "${file.original_name}" was soft-deleted`
        );

        console.log(
            "FILE SOFT-DELETED:",
            file.original_name,
            "| File ID:",
            fileId
        );

        return res.status(200).json({
            message: "File deleted successfully",
            id: fileId
        });

    } catch (error) {
        console.error(
            "Delete file error:",
            error
        );

        return res.status(500).json({
            message: "Failed to delete file"
        });
    }
};
