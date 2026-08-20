const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {

    const SecureStorage =
        await hre.ethers.getContractFactory("SecureStorage");

    const secureStorage =
        await SecureStorage.deploy();

    await secureStorage.waitForDeployment();

    const contractAddress =
        await secureStorage.getAddress();

    console.log("SecureStorage deployed successfully");
    console.log("Contract Address:", contractAddress);

    const deploymentData = {
        contractAddress: contractAddress,
        network: "localhost",
        chainId: 31337
    };

    const filePath = path.join(
        __dirname,
        "..",
        "deployment.json"
    );

    fs.writeFileSync(
        filePath,
        JSON.stringify(deploymentData, null, 2)
    );

    console.log(
        "Deployment information saved to deployment.json"
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
