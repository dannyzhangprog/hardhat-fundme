require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
dotenv.config();
require("./tasks")
require("hardhat-deploy")
require("@nomicfoundation/hardhat-ethers");
require("hardhat-deploy");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL
const PRIVATE_KEY = process.env.PRIVATE_KEY
const PRIVATE_KEY_1 = process.env.PRIVATE_KEY_1
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

module.exports = {
  solidity: "0.8.28",
  defaultNetwork: "hardhat",
  mocha: {
    timeout: 300000
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY, PRIVATE_KEY_1],
      chainId: 11155111
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY
    }
  },
  namedAccounts: {
    deployer: { // 标准命名账户
      default: 0, // 本地和默认网络使用索引0
      sepolia: 0  // Sepolia 网络也使用索引0
    },
    user1: { // 次要账户标准命名
      default: 1
    }
  },
  gasReporter: {
    enabled: true,
    // currency: "USD", // 货币类型
    // coinmarketcap: COINMARKETCAP_API_KEY,
    // token: "ETH",    // 计价代币
    // excludeContracts: ["MockV3Aggregator"] // 排除 mock 合约
  }
};