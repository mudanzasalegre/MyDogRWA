require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      accounts: {
        count: 1200, // Aumenta el número de cuentas disponibles
      },
    },
  },
  solidity: "0.8.28",
};