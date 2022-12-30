const {ethers} = require("ethers");
const net = require("net");
const path = require("path");
const {dirname} = require("path");

module.exports = {

    DATA_FILE: "built.json",

    OFT_TO_DEPLOY: ["OFT", "TestToken"],
    OFT_SUPPLY: ethers.utils.parseEther("1000000000"),
    OFT_TO_SEND: ethers.utils.parseEther("1000000"),
    OFT_DEPLOY: true,
    OFT_SEND_TO_CHILD_CHAINS: true,

    ONFT_TO_DEPLOY: ["UniversalONFT721"],
    ONFT_SUPPLY: 10000,
    ONFT_DEPLOY: true,
    ONFT_SEND_BETWEEN_CHAINS: true,

    WAIT_TX_SEND: 60,
    WAIT_TX_RECEIPT: 30,
    WAIT_STEP: 1,
    sourceDir: path.resolve(dirname(require.main.filename), 'contracts'),
    buildFolderPath: path.resolve(dirname(require.main.filename), 'newContracts'),

    getProvider: function (network) {
        const networkObj = this.networks[network]
        if (networkObj) {
            return new ethers.providers.StaticJsonRpcProvider(networkObj.url, {
                chainId: networkObj.chainId,
                name: network
            });
        }
    },
    networks: {
        // ethTestnet: {
        //     url: `https://thrilling-convincing-fire.ethereum-goerli.quiknode.pro/2dccda67a7706727111291f27b483c645ce05f77`,
        //     chainId: 5,
        // },
        // bscTestnet: {
        //     url: `https://old-twilight-frog.bsc-testnet.quiknode.pro/5e2ac88418bb925fbc3328cf7fb22c93c38f7eaf`,
        //     chainId: 97,
        // },
        avalancheTestnet: {
            url: `https://api.avax-test.network/ext/bc/C/rpc`,
            chainId: 43113,
        },
        polygonTestnet: {
            url: 'https://rpc.ankr.com/polygon_mumbai',
            chainId: 80001,
        },
        // arbitrumTestnet: {
        //     url: 'https://goerli-rollup.arbitrum.io/rpc',
        //     chainId: 421613,
        // },
        // optimismTestnet: {
        //     url: `https://goerli.optimism.io/`,
        //     chainId: 420,
        // },
        fantomTestnet: {
            url: `https://rpc.ankr.com/fantom_testnet`,
            chainId: 4002,
        }
    }

}

