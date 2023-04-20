const hre = require("hardhat");
const utilities = require("../utils/utils");
const deployedContracts = require("../utils/deployedContracts");
const path = require("path");

const waitIfNeeded = async (tx) => {
    if (tx.wait) {
        await tx.wait();
    }
};

const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

async function deployOrGetContracts(networkName) {
    // Use already deployed contracts if not localhost
    if (networkName == "localhost") {
        const contentStoreContract = await (
            await ethers.getContractFactory("ContentStore")
        ).deploy();
        await contentStoreContract.deployed();

        const scriptyStorageContract = await (
            await ethers.getContractFactory("ScriptyStorage")
        ).deploy(contentStoreContract.address);
        await scriptyStorageContract.deployed();
        console.log("ScriptyStorage deployed");

        const scriptyBuilderContract = await (
            await ethers.getContractFactory("ScriptyBuilder")
        ).deploy();
        await scriptyBuilderContract.deployed();
        console.log("ScriptyBuilder deployed");

        return {
            scriptyStorageContract,
            scriptyBuilderContract,
        };
    } else {
        const scriptyStorageAddress = deployedContracts.addressFor(
            networkName,
            "ScriptyStorage"
        );
        const scriptyStorageContract = await ethers.getContractAt(
            "ScriptyStorage",
            scriptyStorageAddress
        );
        console.log(
            "ScriptyStorage is already deployed at",
            scriptyStorageAddress
        );

        const scriptyBuilderAddress = deployedContracts.addressFor(
            networkName,
            "ScriptyBuilder"
        );
        const scriptyBuilderContract = await ethers.getContractAt(
            "ScriptyBuilder",
            scriptyBuilderAddress
        );
        console.log(
            "ScriptyBuilder is already deployed at",
            scriptyBuilderAddress
        );

        return {
            scriptyStorageContract,
            scriptyBuilderContract,
        };
    }
}

async function storeScript(storageContract, name, filePath) {
    // Check if script is already stored
    const storedScript = await storageContract.scripts(name);
    if (storedScript.size > 0) {
        console.log(`${name} is already stored`);
        return;
    }

    // Grab file and break into chunks that SSTORE2 can handle
    const script = utilities.readFile(path.join(__dirname, filePath));
    const scriptChunks = utilities.chunkSubstr(script, 24575);

    // First create the script in the storage contract
    await waitIfNeeded(
        await storageContract.createScript(name, utilities.stringToBytes(name))
    );

    // Store each chunk
    // [WARNING]: With big files this can be very costly
    for (let i = 0; i < scriptChunks.length; i++) {
        await waitIfNeeded(
            await storageContract.addChunkToScript(
                name,
                utilities.stringToBytes(scriptChunks[i])
            )
        );
        console.log(
            `${name} chunk #`,
            i,
            "/",
            scriptChunks.length - 1,
            "chunk length: ",
            scriptChunks[i].length
        );
    }
    console.log(`${name} is stored`);
}

async function main() {
    const contractCodeName = "LifeOnchain";
    const contractName = "LIFEONCHAIN";
    const contractSymbol = "LIFE";
    const contractSupply = 333;

    const scriptName = "lifeonchain";
    const scriptVersion = "1.0.1";
    const contractScriptName = `${scriptName}-v${scriptVersion}`;
    console.log(`Start deploying ${contractScriptName}`);

    if (hre.network.name == "localhost" && !hre.network.config.forking) {
        console.warn("Only deploy to localhost that forks mainnet");
        return;
    }

    console.log("Deploy scripty contracts if necessary");
    const { scriptyStorageContract, scriptyBuilderContract } =
        await deployOrGetContracts(hre.network.name);

    console.log("Store the JS script on scripty in chunks");
    await storeScript(
        scriptyStorageContract,
        contractScriptName,
        `./${contractScriptName}.js`
    );

    console.log("Deploy the main contract");
    const nftContract = await (
        await ethers.getContractFactory(contractCodeName)
    ).deploy(
        contractName,
        contractSymbol,
        contractSupply,
        contractScriptName,
        scriptyStorageContract.address,
        scriptyBuilderContract.address
    );
    await nftContract.deployed();
    console.log("Contract is deployed", nftContract.address);

    if (hre.network.name == "goerli") {
        console.log("Try to verify on Etherscan Goerli");
        await delay(30000);

        await hre.run("verify:verify", {
            address: nftContract.address,
            constructorArguments: [
                contractName,
                contractSymbol,
                contractSupply,
                contractScriptName,
                scriptyStorageContract.address,
                scriptyBuilderContract.address,
            ],
        });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
