
const File = require("../models/fileModel");

const {
    getTransactionReceipt
} = require("./blockchainService");

let isRunning = false;

async function processPendingTransactions() {
    if (isRunning) {
        return;
    }

    isRunning = true;

    try {
        const pendingFiles =
            await File.findPendingTransactions();

        for (const file of pendingFiles) {
            try {
                const result =
                    await getTransactionReceipt(
                        file.blockchain_tx_hash
                    );

                if (!result) {
                    // Still waiting for mining.
                    continue;
                }

                if (result.failed) {
                    await File.markAsFailed(
                        file.id,
                        file.blockchain_tx_hash
                    );

                    console.error(
                        "Blockchain transaction failed:",
                        file.id
                    );

                    continue;
                }

                if (result.confirmed) {
                    await File.markAsConfirmed(
                        file.id,
                        result.fileId,
                        file.blockchain_tx_hash
                    );

                    console.log(
                        "Blockchain transaction confirmed:",
                        file.id
                    );

                    console.log(
                        "Blockchain File ID:",
                        result.fileId
                    );

                    console.log(
                        "Block Number:",
                        result.blockNumber
                    );
                }
            } catch (error) {
                console.error(
                    "Transaction monitoring error:",
                    file.id,
                    error.message
                );
            }
        }
    } catch (error) {
        console.error(
            "Blockchain worker error:",
            error.message
        );
    } finally {
        isRunning = false;
    }
}

function startBlockchainWorker() {
    console.log(
        "Blockchain confirmation worker started"
    );

    processPendingTransactions();

    const workerTimer = setInterval(
        processPendingTransactions,
        15000
    );

    if (workerTimer.unref) {
        workerTimer.unref();
    }
}

module.exports = {
    startBlockchainWorker,
    processPendingTransactions
};
