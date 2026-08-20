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

const deployment =
    JSON.parse(
        fs.readFileSync(
            deploymentPath,
            "utf8"
        )
    );

const contractAddress =
    deployment.contractAddress;

const contractABI = [
    "function storeFile(string memory fileName, string memory ipfsCid) external returns (uint256)",
    "function getFile(uint256 fileId) external view returns (uint256 id, address owner, string memory fileName, string memory ipfsCid, uint256 timestamp)",
    "function getUserFiles(address owner) external view returns (uint256[] memory)"
];

function getContract() {

    if (!PRIVATE_KEY) {
        throw new Error(
            "BLOCKCHAIN_PRIVATE_KEY is not configured"
        );
    }

    const provider =
        new JsonRpcProvider(RPC_URL);

    const wallet =
        new Wallet(
            PRIVATE_KEY,
            provider
        );

    return new Contract(
        contractAddress,
        contractABI,
        wallet
    );
}

async function storeFileOnBlockchain(
    fileName,
    ipfsCid
) {

    const contract =
        getContract();

    const transaction =
        await contract.storeFile(
            fileName,
            ipfsCid
        );

    const receipt =
        await transaction.wait();

    return {
        transactionHash: receipt.hash
    };
}

async function getFileFromBlockchain(
    fileId
) {

    const provider =
        new JsonRpcProvider(RPC_URL);

    const contract =
        new Contract(
            contractAddress,
            contractABI,
            provider
        );

    const file =
        await contract.getFile(
            fileId
        );

    return {
        id: Number(file[0]),
        owner: file[1],
        fileName: file[2],
        ipfsCid: file[3],
        timestamp: Number(file[4])
    };
}

module.exports = {
    storeFileOnBlockchain,
    getFileFromBlockchain
};
