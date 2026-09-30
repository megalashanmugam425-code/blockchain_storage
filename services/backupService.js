const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fsp = fs.promises;

const BACKUP_ROOT =
    path.join(__dirname, "..", "backups");

const PRIMARY_DIR =
    path.join(BACKUP_ROOT, "primary");

const SECONDARY_DIR =
    path.join(BACKUP_ROOT, "secondary");

const TERTIARY_DIR =
    path.join(BACKUP_ROOT, "tertiary");


/*
|--------------------------------------------------------------------------
| Ensure backup directories exist
|--------------------------------------------------------------------------
*/

async function ensureBackupDirectories() {

    await Promise.all([

        fsp.mkdir(
            PRIMARY_DIR,
            {
                recursive: true
            }
        ),

        fsp.mkdir(
            SECONDARY_DIR,
            {
                recursive: true
            }
        ),

        fsp.mkdir(
            TERTIARY_DIR,
            {
                recursive: true
            }
        )

    ]);

}


/*
|--------------------------------------------------------------------------
| Calculate SHA256 asynchronously
|--------------------------------------------------------------------------
|
| Uses streaming instead of readFileSync().
| This avoids blocking the Node.js event loop.
|
|--------------------------------------------------------------------------
*/

function calculateSHA256(filePath) {

    return new Promise((resolve, reject) => {

        const hash =
            crypto.createHash("sha256");

        const stream =
            fs.createReadStream(filePath);

        stream.on(
            "data",
            (chunk) => {

                hash.update(chunk);

            }
        );

        stream.on(
            "end",
            () => {

                resolve(
                    hash.digest("hex")
                );

            }
        );

        stream.on(
            "error",
            reject
        );

        hash.on(
            "error",
            reject
        );

    });

}


/*
|--------------------------------------------------------------------------
| Copy encrypted file asynchronously
|--------------------------------------------------------------------------
*/

async function copyBackup(
    sourcePath,
    destinationPath
) {

    try {

        await fsp.access(
            sourcePath,
            fs.constants.F_OK
        );

    }

    catch (error) {

        throw new Error(
            `Encrypted source file not found: ${sourcePath}`
        );

    }


    await fsp.copyFile(
        sourcePath,
        destinationPath
    );

}


/*
|--------------------------------------------------------------------------
| Create 3 backups
|--------------------------------------------------------------------------
*/

async function createBackups(
    encryptedFilePath
) {

    console.log(
        "=========================================="
    );

    console.log(
        "STARTING 3-BACKUP PROCESS"
    );

    console.log(
        "Encrypted source:",
        encryptedFilePath
    );


    /*
    |--------------------------------------------------------------------------
    | Make sure directories exist
    |--------------------------------------------------------------------------
    */

    await ensureBackupDirectories();


    /*
    |--------------------------------------------------------------------------
    | Check source file
    |--------------------------------------------------------------------------
    */

    try {

        await fsp.access(
            encryptedFilePath,
            fs.constants.F_OK
        );

    }

    catch (error) {

        throw new Error(
            `Encrypted file does not exist: ${encryptedFilePath}`
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Get encrypted filename
    |--------------------------------------------------------------------------
    */

    const fileName =
        path.basename(
            encryptedFilePath
        );


    /*
    |--------------------------------------------------------------------------
    | Backup paths
    |--------------------------------------------------------------------------
    */

    const primaryPath =
        path.join(
            PRIMARY_DIR,
            fileName
        );

    const secondaryPath =
        path.join(
            SECONDARY_DIR,
            fileName
        );

    const tertiaryPath =
        path.join(
            TERTIARY_DIR,
            fileName
        );


    /*
    |--------------------------------------------------------------------------
    | Create all 3 backups in parallel
    |--------------------------------------------------------------------------
    |
    | Previously:
    |
    | Primary → Secondary → Tertiary
    |
    | Now:
    |
    | Primary
    | Secondary     } All run together
    | Tertiary
    |
    |--------------------------------------------------------------------------
    */

    console.log(
        "Creating 3 backups in parallel..."
    );


    await Promise.all([

        copyBackup(
            encryptedFilePath,
            primaryPath
        ),

        copyBackup(
            encryptedFilePath,
            secondaryPath
        ),

        copyBackup(
            encryptedFilePath,
            tertiaryPath
        )

    ]);


    console.log(
        "All 3 backup copies created"
    );


    /*
    |--------------------------------------------------------------------------
    | Verify all backups exist
    |--------------------------------------------------------------------------
    */

    const backupPaths = [

        primaryPath,
        secondaryPath,
        tertiaryPath

    ];


    await Promise.all(

        backupPaths.map(
            async (backupPath) => {

                try {

                    await fsp.access(
                        backupPath,
                        fs.constants.F_OK
                    );

                }

                catch (error) {

                    throw new Error(
                        `Backup file was not created: ${backupPath}`
                    );

                }

            }
        )

    );


    /*
    |--------------------------------------------------------------------------
    | Calculate SHA256 hashes in parallel
    |--------------------------------------------------------------------------
    */

    console.log(
        "Calculating backup SHA256 hashes..."
    );


    const [

        sourceHash,
        primaryHash,
        secondaryHash,
        tertiaryHash

    ] = await Promise.all([

        calculateSHA256(
            encryptedFilePath
        ),

        calculateSHA256(
            primaryPath
        ),

        calculateSHA256(
            secondaryPath
        ),

        calculateSHA256(
            tertiaryPath
        )

    ]);


    /*
    |--------------------------------------------------------------------------
    | Verify integrity
    |--------------------------------------------------------------------------
    */

    if (

        sourceHash !== primaryHash ||

        sourceHash !== secondaryHash ||

        sourceHash !== tertiaryHash

    ) {

        throw new Error(
            "Backup integrity verification failed"
        );

    }


    /*
    |--------------------------------------------------------------------------
    | File sizes
    |--------------------------------------------------------------------------
    */

    const [

        sourceStats,
        primaryStats,
        secondaryStats,
        tertiaryStats

    ] = await Promise.all([

        fsp.stat(
            encryptedFilePath
        ),

        fsp.stat(
            primaryPath
        ),

        fsp.stat(
            secondaryPath
        ),

        fsp.stat(
            tertiaryPath
        )

    ]);


    const sourceSize =
        sourceStats.size;

    const primarySize =
        primaryStats.size;

    const secondarySize =
        secondaryStats.size;

    const tertiarySize =
        tertiaryStats.size;


    /*
    |--------------------------------------------------------------------------
    | Final log
    |--------------------------------------------------------------------------
    */

    console.log(
        "PRIMARY backup:",
        primaryPath,
        `${primarySize} bytes`
    );

    console.log(
        "SECONDARY backup:",
        secondaryPath,
        `${secondarySize} bytes`
    );

    console.log(
        "TERTIARY backup:",
        tertiaryPath,
        `${tertiarySize} bytes`
    );

    console.log(
        "Source SHA256:",
        sourceHash
    );

    console.log(
        "Primary SHA256:",
        primaryHash
    );

    console.log(
        "Secondary SHA256:",
        secondaryHash
    );

    console.log(
        "Tertiary SHA256:",
        tertiaryHash
    );

    console.log(
        "Backup integrity: VERIFIED"
    );

    console.log(
        "3 BACKUPS CREATED SUCCESSFULLY"
    );

    console.log(
        "=========================================="
    );


    /*
    |--------------------------------------------------------------------------
    | Return backup information
    |--------------------------------------------------------------------------
    */

    return {

        primary:
            primaryPath,

        secondary:
            secondaryPath,

        tertiary:
            tertiaryPath,

        sourceSize:
            sourceSize,

        primarySize:
            primarySize,

        secondarySize:
            secondarySize,

        tertiarySize:
            tertiarySize,

        sourceHash:
            sourceHash,

        primaryHash:
            primaryHash,

        secondaryHash:
            secondaryHash,

        tertiaryHash:
            tertiaryHash,

        verified:
            true

    };

}


/*
|--------------------------------------------------------------------------
| Recover PRIMARY backup
|--------------------------------------------------------------------------
*/

async function recoverPrimaryBackup(fileName) {
    await ensureBackupDirectories();

    if (
        typeof fileName !== "string" ||
        !fileName ||
        path.basename(fileName) !== fileName
    ) {
        throw new Error("Invalid file name");
    }

    const primaryPath = path.join(PRIMARY_DIR, fileName);
    const secondaryPath = path.join(SECONDARY_DIR, fileName);
    const tertiaryPath = path.join(TERTIARY_DIR, fileName);

    console.log("==========================================");
    console.log("STARTING SECURE PRIMARY RECOVERY");
    console.log("File:", fileName);

    const candidates = [
        { name: "PRIMARY", path: primaryPath },
        { name: "SECONDARY", path: secondaryPath },
        { name: "TERTIARY", path: tertiaryPath }
    ];

    const available = [];

    for (const item of candidates) {
        try {
            await fsp.access(item.path, fs.constants.F_OK);

            const hash = await calculateSHA256(item.path);

            available.push({
                ...item,
                hash
            });

            console.log(`${item.name} SHA256:`, hash);
        } catch (error) {
            console.log(`${item.name} unavailable:`, error.message);
        }
    }

    // Need at least two copies to verify a matching majority.
    if (available.length < 2) {
        throw new Error(
            "Recovery stopped: Not enough backup copies to verify integrity"
        );
    }

    // Group backups by identical SHA-256 hash.
    const groups = new Map();

    for (const item of available) {
        if (!groups.has(item.hash)) {
            groups.set(item.hash, []);
        }

        groups.get(item.hash).push(item);
    }

    const majority = [...groups.values()]
        .find(group => group.length >= 2);

    if (!majority) {
        throw new Error(
            "Recovery stopped: No matching majority. Manual verification required."
        );
    }

    const trustedHash = majority[0].hash;

    console.log("Matching backup count:", majority.length);
    console.log("Verified majority SHA256:", trustedHash);

    const primary = available.find(
        item => item.name === "PRIMARY"
    );

    // Primary is already consistent with the matching copies.
    if (primary && primary.hash === trustedHash) {
        console.log("PRIMARY is already verified.");
        console.log("PRIMARY RECOVERY: NOT REQUIRED");

        return {
            primary: primaryPath,
            recoverySource: primaryPath,
            hash: trustedHash,
            verified: true
        };
    }

    // Select a matching secondary or tertiary copy.
    const source = majority.find(
        item => item.name !== "PRIMARY"
    );

    if (!source) {
        throw new Error("No valid recovery source found");
    }

    console.log("Recovery source:", source.name);

    // Copy to a temporary file first, preserving the current primary
    // until the recovered copy passes its hash check.
    const tempPath = `${primaryPath}.recovery-${process.pid}-${Date.now()}`;

    try {
        await fsp.copyFile(source.path, tempPath);

        const tempHash = await calculateSHA256(tempPath);

        if (tempHash !== trustedHash) {
            throw new Error(
                "Temporary recovery integrity verification failed"
            );
        }

        await fsp.rename(tempPath, primaryPath);

        const recoveredHash = await calculateSHA256(primaryPath);

        if (recoveredHash !== trustedHash) {
            throw new Error(
                "Recovered PRIMARY integrity verification failed"
            );
        }

        console.log("Recovered PRIMARY SHA256:", recoveredHash);
        console.log("PRIMARY RECOVERY: SUCCESS");
        console.log("==========================================");

        return {
            primary: primaryPath,
            recoverySource: source.path,
            hash: recoveredHash,
            verified: true
        };
    } finally {
        try {
            await fsp.unlink(tempPath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                console.error("Temporary file cleanup warning:", error.message);
            }
        }
    }
}


module.exports = {
    createBackups,
    recoverPrimaryBackup
};

