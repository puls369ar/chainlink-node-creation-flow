import { ethers, run } from "hardhat";

// Verification function
async function verifyContract(address: string, contractPath: string, constructorArgs: any[] = []) {
    try {
        await run("verify:verify", {
            address,
            contract: contractPath,
            constructorArguments: constructorArgs, // Pass constructor arguments here
        });
        console.log(`Contract at ${address} verified on Etherscan!`);
        console.log("");
        console.log("");
    } catch (err: any) {
        if (err.message.includes("Already Verified")) {
            console.log(`Contract at ${address} is already verified.`);
            console.log("");
            console.log("");
        } else {
            console.error(`Verification failed for contract at ${address}:`, err);
            console.log("");
            console.log("");
        }
    }
}

async function chainlinkFlow() {
    const gasPrice = ethers.parseUnits('120', 'gwei');
    const gasLimit = 5000000;

    // Create a signer using the private key and provider
    const signer = new ethers.Wallet(process.env.POLYGON_PRIVATE_KEY!, new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC_URL));
    const signer_address = await signer.getAddress();

    // Set your node address
    const nodeAddress = "<YOUR_NODE_ADDRESS>";

    console.log("Deploying Mock `MLink` token");
    const MLink = await ethers.getContractFactory("MLink");
    const mlink = await MLink.deploy({ gasPrice: gasPrice, gasLimit: gasLimit });
    await mlink.waitForDeployment();
    const mlink_address = await mlink.getAddress();
    console.log("MLink token deployed to:", mlink_address);
    console.log("");

    // Wait for confirmations before verifying
    await mlink.deploymentTransaction()?.wait(6);
    await verifyContract(mlink_address, "MLink.sol:MLink", []); // No args for MLink

    console.log("Minting all present `Mlink` tokens into the *OWNER* account who is also the token creator with `MLink::LinkToken()` function");
    console.log("TX address:", (await mlink.LinkToken()).hash);
    console.log("");

    console.log("Deploying `Operator` contract");
    const Operator = await ethers.getContractFactory("Operator");
    const operator = await Operator.deploy(mlink_address, signer_address, { gasPrice: gasPrice, gasLimit: gasLimit });
    await operator.waitForDeployment();
    const operator_address = await operator.getAddress();
    console.log("");

    console.log("Operator deployed to:", operator_address);
    console.log("LINK:", mlink_address);
    console.log("OWNER:", signer_address);

    // Wait for confirmations before verifying
    await operator.deploymentTransaction()?.wait(6);
    await verifyContract(operator_address, "Operator.sol:Operator", [
        mlink_address,  // First argument
        signer_address, // Second argument
    ]);

    console.log("Setting *Authorized Chainlink Node* by calling `setAuthorizedSenders([nodeAddress])` function");
    console.log("TX address:", (await operator.setAuthorizedSenders([nodeAddress])).hash);
    console.log("");

}

chainlinkFlow()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
