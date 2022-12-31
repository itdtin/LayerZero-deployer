import ethers from "ethers";
import path, {dirname} from "path";
import {loadNetworks} from "./scripts/utils.js";
const SOURCES_PATH = path.resolve('contracts')
const BUILD_PATH = path.resolve('newContracts')
const WALLETS_PATH = path.resolve('wallets.txt')
const NETWORKS_PATH = path.resolve('networks.json')

export const config = {

    DATA_FILE: "built.json",
    WALLETS_PATH,
    NETWORKS_PATH,
    SOURCES_PATH,
    BUILD_PATH,

    OFT_TO_DEPLOY: ["OFT", "TestToken"],
    OFT_SUPPLY: ethers.utils.parseEther("1000000000"),
    OFT_TO_SEND: ethers.utils.parseEther("1000000"),
    OFT_DEPLOY: false,
    OFT_SEND_TO_CHILD_CHAINS: false,

    ONFT_TO_DEPLOY: ["UniversalONFT721"],
    ONFT_SUPPLY: 10000,
    ONFT_DEPLOY: false,
    ONFT_SEND_BETWEEN_CHAINS: false,

    WAIT_TX_SEND: 60,
    WAIT_TX_RECEIPT: 30,
    WAIT_STEP: 1,


    getProvider: function (network) {
        const networkObj = this.networks[network]
        if (networkObj) {
            return new ethers.providers.StaticJsonRpcProvider(networkObj.url, {
                chainId: networkObj.chainId,
                name: network
            });
        }
    },
    networks: loadNetworks(NETWORKS_PATH)

}

