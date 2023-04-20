require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.18",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
  networks: {
    hardhat: {
    }
  },
  gasReporter: {
      enabled: true,
      currency: "USD",
      gasPrice: 21,
      url: "http://localhost:8545",
  },
};
