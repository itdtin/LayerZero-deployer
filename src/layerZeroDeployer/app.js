import ethers from 'ethers';
import {config} from "./config.js";
import {loadWallets} from "./scripts/utils.js";
import {Deployer} from "./scripts/deployer.js";




async function main() {
    const deployConfig = {
        buildsPaths: "", // will be filled below
        baseChain: "", // will be filled below
        childChains: [], // will be filled below
    }
    const wallets = loadWallets(config.WALLETS_PATH);
    const deployer = new Deployer()
    for (const walletPk of wallets) {
        const {baseChain, childChains} = await deployer.getRandomChains()
        console.log(baseChain)
        console.log(childChains)
        const baseProvider = config.getProvider(baseChain)
        const baseWallet = new ethers.Wallet(walletPk, baseProvider);
        const walletAddr = baseWallet.address
        const buildsPaths = deployer.createAndBuildNewContracts(walletAddr, config.OFT_TO_DEPLOY.concat(config.ONFT_TO_DEPLOY))
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
        if(config.ONFT_SEND_BETWEEN_CHAINS) {
            console.log("Minting ONft...")
            oNfts = oNfts ? oNfts[walletAddr].onft : await deployer.getDeployedContracts(walletPk, walletAddr, "onft")
            const minted = await deployer.mintONft(oNfts)
            await deployer.sendONfts(oNfts, walletAddr, minted)
        }
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })


