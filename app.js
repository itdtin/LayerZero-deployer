const ethers = require('ethers');
const config = require("./config");
const {loadWallets} = require("./scripts/utils");
const {Deployer} = require("./scripts/deployer");
const path = require("path");
const LZ_CHAIN_IDS = require("./constants/chainIds.json");

const {dirname} = require("path");
const buildFolderPath = path.resolve(dirname(require.main.filename), 'newContracts');



const mainConfig = {
    buildsPaths: "", // will be filled below
    baseChain: "", // will be filled below
    childChains: [], // will be filled below
}
const contractsToDeploy = config.OFT_TO_DEPLOY.concat(config.ONFT_TO_DEPLOY)

async function main(deployConfig) {
    const wallets = loadWallets();
    const deployer = new Deployer()
    for (const walletPk of wallets) {
        const {baseChain, childChains} = await deployer.getRandomChains()
        const baseProvader = config.getProvider(deployConfig.baseChain)
        const baseWallet = new ethers.Wallet(walletPk, baseProvader);
        const walletAddr = baseWallet.address

        const buildsPaths = deployer.createAndBuildNewContracts(walletAddr, contractsToDeploy)
        deployConfig.baseChain = baseChain
        deployConfig.childChains = childChains
        deployConfig.buildsPaths = buildsPaths

        // Deploy OFT
        let ofts;
        if(config.OFT_DEPLOY) {
            ofts = await deployer.deployOft(walletPk, deployConfig)
            await deployer.setupCommunications(ofts[walletAddr].oft, "oft")
        }

        // Send OFT
        if(config.OFT_SEND_TO_CHILD_CHAINS) {
            ofts = ofts ? ofts[walletAddr].oft : await deployer.getDeployedContracts(walletPk, walletAddr, "oft")
            await deployer.sendOft(ofts, walletAddr)
        }

        // Deploy ONFT
        let oNfts;
        if(config.ONFT_DEPLOY) {
            oNfts = await deployer.deployOnfts(walletPk, deployConfig)
            await deployer.setupCommunications(oNfts[walletAddr].onft, "onft")
        }

        // Send ONFT
        oNfts = oNfts ? oNfts[walletAddr].onft : await deployer.getDeployedContracts(walletPk, walletAddr, "onft")
        if(config.ONFT_SEND_BETWEEN_CHAINS) {
            console.log("Minting ONft...")
            const minted = await deployer.mintONft(oNfts)
            await deployer.sendONfts(oNfts, walletAddr, minted)
        }
    }
}


if (require.main === module) {
    main(mainConfig)
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}

