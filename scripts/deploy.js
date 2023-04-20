const path = require("path");
const fs = require("fs");

const hre = require("hardhat");
const Terser = require("Terser");

const utilities = require("../utils/utils");
const deployedContracts = require("../utils/deployedContracts");

const minifyJS = async (code) => {
    return (
        await Terser.minify(code, {
            mangle: true,
            ecma: 8,
            compress: false,
        })
    ).code;
};

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
    const traitsRaritiesHash =
        "0x43252ab79379691f924d20ae52eae95ea7897214a8cc7f8f475ef571bc4bc022";

    const scriptName = "lifeonchain";
    const scriptVersion = "1.0.2";
    const contractScriptName = `${scriptName}-v${scriptVersion}`;
    const contractScriptNameMinified = `${contractScriptName}.min`;

    console.log(`Minify script file ${contractScriptNameMinified}.js`);
    const payload = fs.readFileSync(`${__dirname}/${contractScriptName}.js`, {
        encoding: "utf8",
    });
    const minified = await minifyJS(payload);
    fs.writeFileSync(`${__dirname}/${contractScriptNameMinified}.js`, minified);

    console.log(`Start deploying ${contractScriptNameMinified}.js`);
    if (hre.network.name == "localhost" && !hre.network.config.forking) {
        console.warn("Only deploy to localhost that forks mainnet");
        return;
    }

    console.log("Deploy scripty contracts if necessary");
    const { scriptyStorageContract, scriptyBuilderContract } =
        await deployOrGetContracts(hre.network.name);

    console.log(
        `Store the ${contractScriptNameMinified} script on scripty in chunks`
    );
    await storeScript(
        scriptyStorageContract,
        contractScriptNameMinified,
        `./${contractScriptNameMinified}.js`
    );

    console.log("Deploy the main contract");
    const nftContract = await (
        await ethers.getContractFactory(contractCodeName)
    ).deploy(
        contractName,
        contractSymbol,
        contractSupply,
        contractScriptNameMinified,
        scriptyStorageContract.address,
        scriptyBuilderContract.address,
        traitsRaritiesHash
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
                contractScriptNameMinified,
                scriptyStorageContract.address,
                scriptyBuilderContract.address,
                traitsRaritiesHash,
            ],
        });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
