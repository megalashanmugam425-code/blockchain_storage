require("dotenv").config();

const {
    storeFileOnBlockchain
} = require("../services/blockchainService");

async function main() {
    try {
        console.log("Storing test file on blockchain...");

        const result = await storeFileOnBlockchain(
            "sample.txt",
            "QmPVwRiBTWhKrAu8PkaA7tgqmJMjXdfhjuKhvZy5PYEhMf"
        );

        console.log("Blockchain storage successful!");
        console.log("Result:");
        console.log(result);

    } catch (error) {
        console.error("Blockchain test failed:");
        console.error(error);
    }
}

main();
