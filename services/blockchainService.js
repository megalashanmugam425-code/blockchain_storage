
const {
    JsonRpcProvider,
    Wallet,
    Contract
} = require("ethers");

const fs = require("fs");
const path = require("path");

const RPC_URL =
    process.env.BLOCKCHAIN_RPC_URL ||
    "http://127.0.0.1:8545";

const PRIVATE_KEY =
    process.env.BLOCKCHAIN_PRIVATE_KEY;

const deploymentPath = path.join(
    __dirname,
    "..",
    "deployment.json"
);

if (!fs.existsSync(deploymentPath)) {
    throw new Error(
        "deployment.json not found. Deploy the smart contract first."
    );
}

const deployment = JSON.parse(
    fs.readFileSync(deploymentPath, "utf8")
);

const contractAddress = deployment.contractAddress;

if (!contractAddress) {
    throw new Error(
        "Contract address not found in deployment.json"
    );
}

const contractABI = [
    "function storeFile(string memory fileName, string memory ipfsCid) external returns (uint256)",
    "function getFile(uint256 fileId) external view returns (uint256 id, address owner, string memory fileName, string memory ipfsCid, uint256 timestamp)",
    "function getUserFiles(address owner) external view returns (uint256[])",
    "event FileStored(uint256 indexed fileId, address indexed owner, string fileName, string ipfsCid, uint256 timestamp)"
];

const provider = new JsonRpcProvider(RPC_URL);

function getProvider() {
    return provider;
}

function getContract() {
    if (!PRIVATE_KEY) {
        throw new Error(
            "BLOCKCHAIN_PRIVATE_KEY is not configured"
        );
    }

    const wallet = new Wallet(
        PRIVATE_KEY,
        provider
    );

    return new Contract(
        contractAddress,
        contractABI,
        wallet
    );
}

/*
|--------------------------------------------------------------------------
| Submit transaction without waiting for mining
|--------------------------------------------------------------------------
*/

async function submitFileTransaction(
    fileName,
    ipfsCid
) {
    if (!fileName || !ipfsCid) {
        throw new Error(
            "File name and IPFS CID are required"
        );
    }

    const contract = getContract();

    console.log(
        "===== BLOCKCHAIN TRANSACTION SUBMIT ====="
    );

    console.log("Contract:", contractAddress);
    console.log("Network:", deployment.network);

    const startTime = Date.now();

    const transaction = await contract.storeFile(
        fileName,
        ipfsCid
    );

    console.log(
        "Transaction Hash:",
        transaction.hash
    );

    console.log(
        "Submission time:",
        Date.now() - startTime,
        "ms"
    );

    return {
        transactionHash: transaction.hash
    };
}

/*
|--------------------------------------------------------------------------
| Legacy synchronous transaction method
|--------------------------------------------------------------------------
*/

async function storeFileOnBlockchain(
    fileName,
    ipfsCid
) {
    const contract = getContract();

    const transaction = await contract.storeFile(
        fileName,
        ipfsCid
    );

    const receipt = await transaction.wait();

    if (!receipt || Number(receipt.status) !== 1) {
        throw new Error(
            "Blockchain transaction failed"
        );
    }

    const iface = contract.interface;
    let fileId = null;

    for (const log of receipt.logs) {
        try {
            const parsed = iface.parseLog(log);

            if (parsed && parsed.name === "FileStored") {
                fileId = Number(parsed.args.fileId);
                break;
            }
        } catch {
            // Ignore logs from other contracts.
        }
    }

    if (fileId === null) {
        throw new Error(
            "FileStored event was not found"
        );
    }

    return {
        fileId,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
    };
}

/*
|--------------------------------------------------------------------------
| Check transaction receipt
|--------------------------------------------------------------------------
*/

async function getTransactionReceipt(
    transactionHash
) {
    if (!transactionHash) {
        throw new Error(
            "Transaction hash is required"
        );
    }

    const receipt =
        await provider.getTransactionReceipt(
            transactionHash
        );

    if (!receipt) {
        return null;
    }

    if (Number(receipt.status) !== 1) {
        return {
            confirmed: false,
            failed: true,
            transactionHash,
            blockNumber: receipt.blockNumber
        };
    }

    const iface = getContract().interface;

    let fileId = null;

    for (const log of receipt.logs) {
        try {
            const parsedLog = iface.parseLog(log);

            if (parsedLog?.name === "FileStored") {
                fileId = Number(parsedLog.args.fileId);
                break;
            }
        } catch {
            // Ignore unrelated contract logs.
        }
    }

    if (fileId === null) {
        return {
            confirmed: false,
            failed: true,
            transactionHash,
            blockNumber: receipt.blockNumber
        };
    }

    return {
        confirmed: true,
        failed: false,
        fileId,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
    };
}

/*
|--------------------------------------------------------------------------
| Get file from blockchain
|--------------------------------------------------------------------------
*/

async function getFileFromBlockchain(fileId) {
    if (
        fileId === undefined ||
        fileId === null ||
        fileId === ""
    ) {
        throw new Error(
            "Blockchain file ID is required"
        );
    }

    const contract = new Contract(
        contractAddress,
        contractABI,
        provider
    );

    const file = await contract.getFile(fileId);

    return {
        id: Number(file[0]),
        owner: file[1],
        fileName: file[2],
        ipfsCid: file[3],
        timestamp: Number(file[4])
    };
}

/*
|--------------------------------------------------------------------------
| Verify file on blockchain
|--------------------------------------------------------------------------
*/

async function verifyFileOnBlockchain(
    fileId,
    expectedFileName,
    expectedIpfsCid
) {
    const blockchainFile =
        await getFileFromBlockchain(fileId);

    const cidMatches =
        blockchainFile.ipfsCid === expectedIpfsCid;

    const fileNameMatches =
        blockchainFile.fileName === expectedFileName;

    return {
        verified: cidMatches && fileNameMatches,
        cidMatches,
        fileNameMatches,
        blockchainFile
    };
}

module.exports = {
    storeFileOnBlockchain,
    submitFileTransaction,
    getTransactionReceipt,
    getFileFromBlockchain,
    verifyFileOnBlockchain
};
