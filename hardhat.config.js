/** @type import('hardhat/config').HardhatUserConfig */
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1337,
            },
            viaIR: true,
        },
    },
    networks: {
        hardhat: {},
        ethereum: {
            url: process.env.ETHEREUM_PROVIDER || "http://127.0.0.1:8555",
            accounts: [process.env.ETHEREUM_PRIVATE_KEY],
        },
        goerli: {
            url: process.env.GOERLI_PROVIDER || "http://127.0.0.1:8555",
            accounts: [process.env.GOERLI_PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_APIKEY,
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        gasPrice: 21,
        url: "http://localhost:8545",
    },
};
