require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat: {
      accounts: {
        count: 1500, // Aumenta el número de cuentas disponibles
      },
    },
  },
  solidity: "0.8.28",
};