const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

function ensureBackupDirectories() {

    [
        BACKUP_ROOT,
        PRIMARY_DIR,
        SECONDARY_DIR,
        TERTIARY_DIR
    ].forEach((dir) => {

        if (!fs.existsSync(dir)) {

            fs.mkdirSync(dir, {
                recursive: true
            });

        }

    });

}


/*
|--------------------------------------------------------------------------
| Calculate SHA256
|--------------------------------------------------------------------------
*/

function calculateSHA256(filePath) {

    const data =
        fs.readFileSync(filePath);

    return crypto
        .createHash("sha256")
        .update(data)
        .digest("hex");

}


/*
|--------------------------------------------------------------------------
| Copy encrypted file
|--------------------------------------------------------------------------
*/

function copyBackup(
    sourcePath,
    destinationPath
) {

    if (!fs.existsSync(sourcePath)) {

        throw new Error(
            `Encrypted source file not found: ${sourcePath}`
        );

    }

    fs.copyFileSync(
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

    ensureBackupDirectories();


    /*
    |--------------------------------------------------------------------------
    | Check source file
    |--------------------------------------------------------------------------
    */

    if (!fs.existsSync(encryptedFilePath)) {

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
        path.basename(encryptedFilePath);


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
    | BACKUP 1 - PRIMARY
    |--------------------------------------------------------------------------
    */

    console.log(
        "Creating PRIMARY backup..."
    );

    copyBackup(
        encryptedFilePath,
        primaryPath
    );


    /*
    |--------------------------------------------------------------------------
    | BACKUP 2 - SECONDARY
    |--------------------------------------------------------------------------
    */

    console.log(
        "Creating SECONDARY backup..."
    );

    copyBackup(
        encryptedFilePath,
        secondaryPath
    );


    /*
    |--------------------------------------------------------------------------
    | BACKUP 3 - TERTIARY
    |--------------------------------------------------------------------------
    */

    console.log(
        "Creating TERTIARY backup..."
    );

    copyBackup(
        encryptedFilePath,
        tertiaryPath
    );


    /*
    |--------------------------------------------------------------------------
    | Verify all backups
    |--------------------------------------------------------------------------
    */

    const primaryExists =
        fs.existsSync(primaryPath);

    const secondaryExists =
        fs.existsSync(secondaryPath);

    const tertiaryExists =
        fs.existsSync(tertiaryPath);


    if (
        !primaryExists ||
        !secondaryExists ||
        !tertiaryExists
    ) {

        throw new Error(
            "One or more backup files were not created"
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Calculate hashes
    |--------------------------------------------------------------------------
    */

    const sourceHash =
        calculateSHA256(
            encryptedFilePath
        );

    const primaryHash =
        calculateSHA256(
            primaryPath
        );

    const secondaryHash =
        calculateSHA256(
            secondaryPath
        );

    const tertiaryHash =
        calculateSHA256(
            tertiaryPath
        );


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

    const sourceSize =
        fs.statSync(
            encryptedFilePath
        ).size;

    const primarySize =
        fs.statSync(
            primaryPath
        ).size;

    const secondarySize =
        fs.statSync(
            secondaryPath
        ).size;

    const tertiarySize =
        fs.statSync(
            tertiaryPath
        ).size;


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

        primary: primaryPath,

        secondary: secondaryPath,

        tertiary: tertiaryPath,

        sourceSize: sourceSize,

        primarySize: primarySize,

        secondarySize: secondarySize,

        tertiarySize: tertiarySize,

        sourceHash: sourceHash,

        primaryHash: primaryHash,

        secondaryHash: secondaryHash,

        tertiaryHash: tertiaryHash,

        verified: true

    };

} 
/*
|--------------------------------------------------------------------------
| Recover PRIMARY backup
|--------------------------------------------------------------------------
*/

async function recoverPrimaryBackup(
    fileName
) {

    ensureBackupDirectories();

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


    console.log(
        "=========================================="
    );

    console.log(
        "STARTING PRIMARY BACKUP RECOVERY"
    );

    console.log(
        "File:",
        fileName
    );


    /*
    |--------------------------------------------------------------------------
    | Check PRIMARY
    |--------------------------------------------------------------------------
    */

    if (fs.existsSync(primaryPath)) {

        try {

            console.log(
                "Checking PRIMARY integrity..."
            );

            const primaryHash =
                calculateSHA256(
                    primaryPath
                );

            console.log(
                "PRIMARY SHA256:",
                primaryHash
            );

        } catch (error) {

            console.log(
                "PRIMARY check failed:",
                error.message
            );

        }

    } else {

        console.log(
            "PRIMARY backup is missing"
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Find valid recovery source
    |--------------------------------------------------------------------------
    */

    let recoverySource = null;

    if (fs.existsSync(secondaryPath)) {

        console.log(
            "Checking SECONDARY backup..."
        );

        recoverySource =
            secondaryPath;

    } else if (fs.existsSync(tertiaryPath)) {

        console.log(
            "SECONDARY unavailable."
        );

        console.log(
            "Using TERTIARY backup..."
        );

        recoverySource =
            tertiaryPath;

    }


    /*
    |--------------------------------------------------------------------------
    | No valid backup
    |--------------------------------------------------------------------------
    */

    if (!recoverySource) {

        throw new Error(
            "No valid backup available for recovery"
        );

    }


    /*
    |--------------------------------------------------------------------------
    | Recover PRIMARY
    |--------------------------------------------------------------------------
    */

    console.log(
        "Recovery source:",
        recoverySource
    );

    fs.copyFileSync(
        recoverySource,
        primaryPath
    );


    /*
    |--------------------------------------------------------------------------
    | Verify recovered PRIMARY
    |--------------------------------------------------------------------------
    */

    const recoveredHash =
        calculateSHA256(
            primaryPath
        );

    const sourceHash =
        calculateSHA256(
            recoverySource
        );


    if (
        recoveredHash !== sourceHash
    ) {

        throw new Error(
            "PRIMARY recovery integrity verification failed"
        );

    }


    console.log(
        "Recovered PRIMARY SHA256:",
        recoveredHash
    );

    console.log(
        "PRIMARY RECOVERY: SUCCESS"
    );

    console.log(
        "=========================================="
    );


    return {

        primary: primaryPath,

        recoverySource: recoverySource,

        hash: recoveredHash,

        verified: true

    };

}



module.exports = {
    createBackups,
    recoverPrimaryBackup
};
