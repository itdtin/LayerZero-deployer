const path = require('path');
const {dirname} = require('path');
const solc = require('solc');

const {ethers} = require("ethers");
const config = require("../config");
const {getRandomChoise, sample, getFileNameFromPath, sleep} = require("./utils");
const fs = require('fs-extra');
const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json");
const LZ_CHAIN_IDS = require("../constants/chainIds.json");
const BaseAbi = require("../abis/BasedOFT.json");
const OftAbi = require("../abis/OFT.json");
const ONftAbi = require("../abis/UniversalONFT721.json");
const sourceDir = path.resolve(dirname(require.main.filename), 'contracts');
const buildFolderPath = path.resolve(dirname(require.main.filename), 'newContracts');

class Deployer {

    constructor() {
        fs.removeSync(buildFolderPath);
        fs.ensureDirSync(buildFolderPath);
    }

    async getRandomChains() {
        let networksNames = Object.keys(config.networks)
        const baseChain = networksNames[getRandomChoise(networksNames)]
        networksNames = networksNames.filter(networkName => networkName !== baseChain)
        const childChains = sample(networksNames, networksNames.length)

        if (childChains.length === 0) {
            let num = getRandomChoise(networksNames)
            if(networksNames[num] === baseChain) {
                num += 1
            }
            childChains.push(networksNames[num])
        }
        return {baseChain, childChains }
    }

    getSources(namesToModify) {
        let getContractSource = function (contractFileName) {
            const contractPath = path.resolve(sourceDir, contractFileName);
            return fs.readFileSync(contractPath, 'utf8');
        }

        let sourcesToModify = {}
        let additionalSources = {}

        const list = fs.readdirSync(sourceDir);
        list.forEach(function (file) {
            const fileName = file
            file = path.resolve(sourceDir, file);
            const stat = fs.statSync(file);

            if (file.substr(file.length - 4, file.length) === ".sol" && namesToModify.indexOf(fileName.split(".")[0]) !== -1 ) {
                const content = getContractSource(file)
                sourcesToModify = {
                    ...sourcesToModify,
                    [file]: {
                        content: content
                    }
                };
            } else if(file.substr(file.length - 4, file.length) === ".sol") {
                const content = getContractSource(file)
                additionalSources = {
                    ...additionalSources,
                    [file]: {
                        content: content
                    }
                };
            }

        });
        return { sourcesToModify, additionalSources };
    }

    compile(sources) {
        const input = {
            language: 'Solidity',
            sources,
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['*']
                    }
                }
            }
        }

        console.log('\nCompiling contracts...');
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        if (output.errors) {
            console.error(output.errors);
            // throw '\nError in compilation please check the contract\n';
            for (const error of output.errors) {
                if (error.severity === 'error') {
                    throw 'Error found';
                }
            }
        }
        console.log('Done');
        return output
    }

    build(compiled) {
        console.log('\nBuilding please wait...');
        let buildedPaths = [];
        for (let contractFile in compiled.contracts) {

            const walletAddr = contractFile.split(buildFolderPath)[1].split(getFileNameFromPath(contractFile))[0].replace(/\//g, "")
            for (let key in compiled.contracts[contractFile]) {
                const builtPath = path.resolve(buildFolderPath, walletAddr, `${key}.json`)
                buildedPaths.push(builtPath)
                fs.outputJsonSync(
                    builtPath,
                    {
                        abi: compiled.contracts[contractFile][key]["abi"],
                        bytecode: compiled.contracts[contractFile][key]["evm"]["bytecode"]["object"]
                    },
                    {
                        spaces: 2,
                        EOL: "\n"
                    }
                );
            }
        }
        console.log('Build finished successfully!\n');
        return buildedPaths
    }

    async deploy(buildPath, wallet, args) {
        const contractBuildedObject = JSON.parse(fs.readFileSync(buildPath));
        console.log(`\nDeploying ${getFileNameFromPath(buildPath).split(".")[0]} on chain ${wallet.provider.network.name}`);
        try {
            let contract = new ethers.ContractFactory(
                contractBuildedObject.abi,
                contractBuildedObject.bytecode,
                wallet
            );

            let instance = await contract.deploy(...args);
            console.log(`deployed at ${instance.address}`)
            config[`${process.argv[2]}`] = instance.address
            console.log("Waiting for the contract to get mined...")
            await instance.deployed()
            console.log("Contract deployed\n")
            await sleep(2)
            return instance
        } catch (e) {
            console.log(`Can't deploy contract on chain ${wallet.provider.network.name}`)

        }

    }

    modifySource(content, walletAddress) {
        const startCodeContractIndex = content.indexOf("{") + 1
        return content.slice(0, startCodeContractIndex) +
            `\n    address private accountAddress = ${walletAddress};\n` +
            content.slice(startCodeContractIndex, content.length)
    }

    saveSource(content, filePath) {
        const dirName = path.dirname(filePath)
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName);
        }
        fs.writeFileSync(filePath, content)
        console.log(`Saved to > ${filePath}`);
    }

    async saveData(address, content, filePath, type, deepKeys = []) {
        let data = {}
        if (fs.existsSync(filePath)) {
            data = JSON.parse(fs.readFileSync(filePath).toString())
        }
        if(!data[address]) {
            data[address] = {}
        }
        data[address][type] = content

        fs.writeFileSync(filePath, JSON.stringify(data))
    }

    getContractSource(contractFileName) {
        const contractPath = path.resolve(sourceDir, contractFileName);
        return fs.readFileSync(contractPath, 'utf8');
    }

    createNewContracts(walletAddress, names) {
        const sources = this.getSources(names)
        let sourcesToDeploy = {}
        for (const sourcePath of Object.keys(sources.sourcesToModify)) {
            const newSource = this.modifySource(sources.sourcesToModify[sourcePath].content, walletAddress)
            const filePath = path.resolve(buildFolderPath, walletAddress, getFileNameFromPath(sourcePath))
            this.saveSource(newSource, filePath)
            sourcesToDeploy = {
                ...sourcesToDeploy,
                [filePath]: {
                    content: this.getContractSource(filePath)
                }
            };
        }
        for (const sourcePath of Object.keys(sources.additionalSources)) {
            const filePath = path.resolve(buildFolderPath, walletAddress, getFileNameFromPath(sourcePath))
            this.saveSource(sources.additionalSources[sourcePath].content, filePath)
            sourcesToDeploy = {
                ...sourcesToDeploy,
                [filePath]: {
                    content: this.getContractSource(filePath)
                }
            };
        }
        return sourcesToDeploy
    }

    filterBuildPathToDeploy(buildsPaths, contractNames) {
        let result = []
        for(const buildPath of buildsPaths) {
            const fileNameFromPath = getFileNameFromPath(buildPath).split(".")[0]
            for(const j of contractNames) {
                if(fileNameFromPath === j) {
                    result.push(buildPath)
                }
            }
        }
        return result
    }

    createAndBuildNewContracts(walletAddress, contractNames) {
        const sourcesToDeploy = this.createNewContracts(walletAddress, contractNames)
        const compiled = this.compile(sourcesToDeploy)
        return this.build(compiled)
    }

    async deployLzContracts(pk, deployConfig, type) {
        const {buildsPaths, baseChain, childChains} = deployConfig
        const toSave = {}
        let instances = {};

        // Deploy BaseOFT on baseChain
        const baseProvader = config.getProvider(baseChain)
        const baseWallet = new ethers.Wallet(pk, baseProvader);
        const walletAddr = baseWallet.address
        toSave[walletAddr] = {oft: {}, onft: {}}
        instances[walletAddr] = {oft: {}, onft: {}}

        if(type === "oft") {
            console.log(`Deploying OFT token on base: ${baseChain} and childChains: ${childChains}`)
            const contractsToDeploy = this.filterBuildPathToDeploy(buildsPaths, config.OFT_TO_DEPLOY)
            let baseOft;
            for (const buildPath of contractsToDeploy) {
                if (buildPath.endsWith("TestToken.json")) {
                    baseOft = await this.deploy(buildPath, baseWallet, [LZ_ENDPOINTS[baseChain], config.OFT_SUPPLY])
                    toSave[walletAddr]["oft"]["base"] = baseChain
                    instances[walletAddr]["oft"]["base"] = baseChain
                    toSave[walletAddr]["oft"][baseChain] = baseOft.address
                    instances[walletAddr]["oft"][baseChain] = baseOft
                }
                else if(buildPath.endsWith("OFT.json")){
                    let oft;
                    for(const childChain of childChains) {
                        const provider = config.getProvider(childChain)
                        const wallet = new ethers.Wallet(pk, provider);
                        const tokenName = childChain + "OFT"
                        const tokenSymbol = "OFT" + childChain.slice(0, 1)

                        oft = await this.deploy(buildPath, wallet, [tokenName, tokenSymbol, LZ_ENDPOINTS[childChain], config.OFT_SUPPLY])
                        toSave[walletAddr]["oft"][childChain] = oft.address
                        instances[walletAddr]["oft"][childChain] = oft
                    }
                }
            }
            await this.saveData(walletAddr, toSave[walletAddr]["oft"], path.resolve(dirname(require.main.filename), config.DATA_FILE), "oft")
        }
        else if (type === "onft"){
            console.log(`Deploying ONFT token on base: ${baseChain} and childChains: ${childChains}`)
            const contractsToDeploy = this.filterBuildPathToDeploy(buildsPaths, config.ONFT_TO_DEPLOY)
            let chains = childChains
            chains.push(baseChain)

            for(const buildPath of contractsToDeploy) {

                const {minIds, maxIds} = this.getMinMaxId(chains, config.ONFT_SUPPLY)

                for(const network of chains) {
                    const minId = minIds[chains.indexOf(network)]
                    const maxId = maxIds[chains.indexOf(network)]
                    const provider = config.getProvider(network)
                    const wallet = new ethers.Wallet(pk, provider);
                    const tokenName = network + "ONFT"
                    const tokenSymbol = "ONFT" + network.slice(0, 1)
                    const oNft = await this.deploy(buildPath, wallet, [tokenName, tokenSymbol, LZ_ENDPOINTS[network], minId, maxId])
                    toSave[baseWallet.address]["onft"][network] = {address: oNft.address, maxId: maxId, minId: minId}
                    instances[baseWallet.address]["onft"][network] = oNft
                }
            }
            await this.saveData(baseWallet.address, toSave[baseWallet.address]["onft"], path.resolve(dirname(require.main.filename), config.DATA_FILE), "onft")
        }
        return instances
    }

    async mintONft(oNftInstances) {
        const filePath = path.resolve(dirname(require.main.filename), config.DATA_FILE)
        const minted = {}
        for(const [key, oNft] of Object.entries(oNftInstances)) {
            const walletAddr = await oNft.signer.address
            let counter = Object.keys(oNftInstances).length
            while (counter !== 0) {
                const mintedId = await oNft.nextMintId()
                const mintTx = await oNft.mint()
                await this.waitTxReceipt(mintTx, oNft.provider)
                const alreadyMinted = minted[walletAddr] || {}
                const alreadyMintedForNetwork = alreadyMinted[key] ? alreadyMinted[key] : []
                alreadyMintedForNetwork.push(mintedId.toString())
                alreadyMinted[key] = alreadyMintedForNetwork
                minted[walletAddr] = alreadyMinted
                counter -= 1
                console.log(`ONft with Id ${mintedId} has just minted on chain ${key}`)
            }
        }

        this.saveMintedId(minted, filePath)
        return minted
    }

    saveMintedId(content, filePath) {
        let data = {}

        if (fs.existsSync(filePath)) {
            data = JSON.parse(fs.readFileSync(filePath).toString())
        }
        for (const [walletAddr, mintedInNetwork] of Object.entries(content)) {
            for(const [networkName, mintedId] of Object.entries(mintedInNetwork)) {
                let mintedIds = data[walletAddr]["onft"][networkName]["mintedIds"] || []
                mintedIds = mintedIds.concat(mintedId)
                data[walletAddr]["onft"][networkName]["mintedIds"] = mintedIds
            }
        }
        fs.writeFileSync(filePath, JSON.stringify(data))
    }

    getMinMaxId(chains, totalSupply) {
        let initId = 1
        let maxId = 0;
        let minIds = []
        let maxIds = []
        for (const _ of chains) {
            if(maxIds.length === chains.length) {
                break
            }
            initId = initId + maxId
            maxId = maxId === 0 ? parseInt(totalSupply / chains.length + 1) : maxId + maxId
            minIds.push(initId)
            maxIds.push(maxId)
        }
        return {minIds, maxIds}
    }

    async deployOft(pk, deployConfig) {
        return await this.deployLzContracts(pk, deployConfig, "oft")
    }

    async deployOnfts(pk, deployConfig) {
        return await this.deployLzContracts(pk, deployConfig, "onft")
    }

    async getDeployedContracts(pk, address, type) {
        const filePath = path.resolve(dirname(require.main.filename), config.DATA_FILE)
        const deployed = fs.readJsonSync(filePath)
        let instances = {}
        const addresses = deployed[address][type]
        if(type === "oft") {
            const baseChain = addresses["base"];
            for(const key of Object.keys(addresses)) {
                if (key === baseChain) {
                    const baseProvider = config.getProvider(baseChain)
                    const baseWallet = new ethers.Wallet(pk, baseProvider);
                    instances[key] = new ethers.Contract(addresses[baseChain], BaseAbi, baseWallet)
                } else if(key !== "base" && key !== baseChain){
                    const provider = config.getProvider(key)
                    const wallet = new ethers.Wallet(pk, provider);
                    instances[key] = new ethers.Contract(addresses[key], OftAbi, wallet)
                } else {
                    instances[key] = addresses["base"]
                }
            }
        } else if (type === "onft") {
            for(const key of Object.keys(addresses)) {
                const provider = config.getProvider(key)
                const wallet = new ethers.Wallet(pk, provider);
                instances[key] = new ethers.Contract(addresses[key].address, ONftAbi, wallet)
            }
        }
        return instances
    }

    async setupCommunications(instances, type) {
        console.log(`Setting up communications for ${type}`)
        if(type === "oft") {
            const base = instances.base
            const baseInstance = instances[base]
            for (const [key, instance] of Object.entries(instances)) {
                if(key !== base && key !== "base") {
                    try {
                        const lzChainId = LZ_CHAIN_IDS[key]
                        const remoteAddress = ethers.utils.solidityPack(["address", "address"], [instance.address, baseInstance.address])
                        await this.sendTx(baseInstance.setTrustedRemote, baseInstance.provider, [lzChainId, remoteAddress])

                        const baseLzChainId = LZ_CHAIN_IDS[base]
                        const remoteAddressBase = ethers.utils.solidityPack(["address", "address"], [baseInstance.address, instance.address])
                        await this.sendTx(instance.setTrustedRemote, instance.provider, [baseLzChainId, remoteAddressBase])


                    } catch (e) {
                        console.log(`The error occured while setting up communications for ${type}`)
                    }
                }
            }
        } else if( type === "onft") {
            for (const [key1, instance1] of Object.entries(instances)) {
                for (const [key2, instance2] of Object.entries(instances)) {
                    if (key1 !== key2) {
                        const lzChainId1 = LZ_CHAIN_IDS[key1]
                        const lzChainId2 = LZ_CHAIN_IDS[key2]
                        const dstPath = ethers.utils.solidityPack(["address", "address"], [instance2.address, instance1.address])
                        const srcPath = ethers.utils.solidityPack(["address", "address"], [instance1.address, instance2.address])

                        await this.sendTx(instance1.setTrustedRemote, instance1.provider, [lzChainId2, dstPath])
                        await this.sendTx(instance2.setTrustedRemote, instance2.provider, [lzChainId1, srcPath])

                    }
                }
            }
        }
        console.log(`Just Set up communications for ${type}`)
    }

    async sendOft(ofts, walletAddr) {
        const base = ofts["base"]
        const BaseToken = ofts[base]
        for(const [name, oft] of Object.entries(ofts)){
            if(name !== "base" && name !== base) {
                console.log(`Sending OFT from baseChain ${base} to dstChain ${name}`)
                let adapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 200000])
                try {
                    const amount = config.OFT_TO_SEND.toString()
                    let nativeFee = (await BaseToken.estimateSendFee(LZ_CHAIN_IDS[name], walletAddr, false, amount, adapterParams)).nativeFee
                    await this.sendTx(BaseToken.send, BaseToken.provider, [
                        LZ_CHAIN_IDS[name], // destination chainId
                        walletAddr, // destination address to send tokens to
                        amount, // quantity of tokens to send (in units of wei)
                        walletAddr, // LayerZero refund address (if too much fee is sent gets refunded)
                        ethers.constants.AddressZero, // future parameter
                        adapterParams, // adapterParameters empty bytes specifies default settings
                        { value: nativeFee }
                    ])

                } catch (e) {
                    console.log(`Can't send OFT from ${base} to ${name} amount ${amount}\n${e}`)
                }

            }
        }
    }

    async sendONfts(onfts, walletAddr, minted) {

        let txs = []
        for(const [srcChainName, srcONft] of Object.entries(onfts)){
            const onChainIds = minted[walletAddr][srcChainName]
            if(onChainIds.length > 0) {
                for (const [dstChainName, dstONft] of Object.entries(onfts)) {
                    if (dstChainName !== srcChainName) {
                        const adapterParams = ethers.utils.solidityPack(["uint16", "uint256"], [1, 200000])
                        const tokenIdToSend = onChainIds[Object.keys(onfts).indexOf(dstChainName)]
                        //ownerOf
                        try {
                            const nativeFee = (await srcONft.estimateSendFee(LZ_CHAIN_IDS[dstChainName], walletAddr, tokenIdToSend, false, adapterParams)).nativeFee
                            await this.sendTx(srcONft.sendFrom, srcONft.provider, [
                                walletAddr,
                                LZ_CHAIN_IDS[dstChainName], // destination chainId
                                walletAddr, // destination address to send tokens to
                                tokenIdToSend, // tokenId to send
                                walletAddr, // LayerZero refund address (if too much fee is sent gets refunded)
                                ethers.constants.AddressZero, // future parameter
                                adapterParams, // adapterParameters empty bytes specifies default settings
                                {value: nativeFee} // pass a msg.value to pay the LayerZero message fee
                            ])
                            console.log(`Sent ONft with id: ${tokenIdToSend}, from SrcChain: ${srcChainName} to dstChain: ${dstChainName}`)
                        } catch (e) {
                            console.log(`Can't send ONft with id: ${tokenIdToSend}, from SrcChain: ${srcChainName} to dstChain: ${dstChainName}\n${e}`)
                        }
                    }
                }
            }
        }
        Promise.all(txs).then((tx) => {
            tx.wait();
        });
        return txs
    }

    async sendTx(functionToCall, provider, args) {
        let result;
        let waited = 0;
        while (waited < config.WAIT_TX_SEND) {
            try {
                result = await functionToCall(...args);
                if (result === null) {
                    console.log(`Trying again to send txn ....`);
                    await sleep(config.WAIT_STEP)
                    waited += config.WAIT_STEP
                    continue;
                }
                return await this.waitTxReceipt(result, provider)
            } catch (e) {
                console.log(`Receipt error:`, e);
                break;
            }
        }
    }

    async waitTxReceipt(tx, provider) {
        let receipt;
        let waited = 0;

        while (!receipt && waited < config.WAIT_TX_RECEIPT) {
            try {
                receipt = await provider.getTransactionReceipt(tx.hash);
                if (!receipt) {
                    console.log(`Trying again to fetch txn receipt....`);
                    await sleep(config.WAIT_STEP)
                    waited += config.WAIT_STEP
                    continue;
                }
                console.log(`Receipt confirmations:`, receipt.confirmations);
                return receipt
            } catch (e) {
                console.log(`Receipt error:`, e);
                break;
            }
        }
    }
}

module.exports = {Deployer}