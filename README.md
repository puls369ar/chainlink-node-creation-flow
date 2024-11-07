# Chainlink Node Creation Flow
I faced problems while creating a custom Chainlink node and trying to fetch the data from it, so in this guide, I will share the step-by-step flow of doing it, based on my experience.

## Running Docker For Chainlink Node
It is not mandatory, but it is recommended to [run](https://docs.chain.link/chainlink-nodes/v1/running-a-chainlink-node) the node in docker.

[Install](https://docs.docker.com/engine/install/) Docker. For my Windows *WSL Ubuntu Emulator* this set of commands installed in it
```shell
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
$ sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
$ apt-cache policy docker-ce
$ sudo apt install docker-ce
```

Make sure it is installed and running  
```bash
$ docker --version
Docker version 27.3.1, build ce12230
$ sudo systemctl status docker
● docker.service - Docker Application Container Engine
     Loaded: loaded (/usr/lib/systemd/system/docker.service; enabled; preset: enabled)
     Active: active (running) since Thu 2024-10-31 17:42:17 +04; 4 days ago
TriggeredBy: ● docker.socket
       Docs: https://docs.docker.com
   Main PID: 251 (dockerd)
      Tasks: 58
     Memory: 129.2M ()
```

Before configuring the actual chainlink-node first prepare the directory and create Postgres db.
```shell
$ mkdir chainlink-node
$ cd chainlink-node
$ docker run --name cl-postgres -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres
```
check if it is running
```shell
$ docker ps -a -f name=cl-postgres
CONTAINER ID   IMAGE      COMMAND                  CREATED          STATUS             PORTS                                       NAMES
    
a8956bab4663   postgres   "docker-entrypoint.s…"   20 seconds ago   20 seconds         0.0.0.0:5432->5432/tcp, :::5432->5432/tcp   cl-postgres
```

We need to create two files in a newly created internal `.chainlink-node` directory. Quick note, for testing purposes we use Amoy testnet, so configurations will be given according to it.

`.chainlink-node/config.toml`
```toml
[Log]
Level = 'warn'

[WebServer]
AllowOrigins = '\*'
SecureCookies = false

[WebServer.TLS]
HTTPSPort = 0

[[EVM]]
ChainID = '80002'

[[EVM.Nodes]]
Name = 'Amoy'
WSURL = 'wss://polygon-amoy.infura.io/ws/v3/0d808b97c77b43bbbbc1aded9b81d7de'
HTTPURL = 'https://polygon-amoy.infura.io/v3/0d808b97c77b43bbbbc1aded9b81d7de'
```

In another file we give previously created Postgres db's credentials

`.chainlink-node/secrets.toml`
```shell
[Password]
Keystore = 'mysecretkeystorepassword'
[Database]
URL = 'postgresql://postgres:mysecretpassword@host.docker.internal:5432/postgres?sslmode=disable'
```

Run docker command below to create the chainlink docker node
```shell
$ cd ~/.chainlink-node && docker run --platform linux/x86_64/v8 --name chainlink -v ~/.chainlink-node:/chainlink -it -p 6688:6688 --add-host=host.docker.internal:host-gateway smartcontract/chainlink:2.17.0 node -config /chainlink/config.toml -secrets /chainlink/secrets.toml start
```
Pay attention to the `-v ~/.chainlink-node:/chainlink` argument, it mounts local `.chainlink-node` folder to docker container's `/chainlink` one. If everything is done correctly you will see node running
```shell
docker ps -a -f name=chainlink
CONTAINER ID   IMAGE                            COMMAND                  CREATED          STATUS                   PORTS              NAMES 
                                    
063ba2548086   smartcontract/chainlink:2.17.0   "chainlink node -con…"   22 seconds ago   Up 25 seonds (healthy)   0.0.0.0:6688->6688/tcp, :::6688->6688/tcp   chainlink
```

and you should be able node's GUI on [localhost:6688](http://localhost:6688/)

## Configuring the node and creating related contracts
Usually, to for the reward for giving data the LINK token is used and configured when creating the node, but in our case we will have a single custom node for special data. Also you may want to create this node on custom chain or on any chain that has no LINK token present in the network. Therefore we need to create our custom Mock Link `MLINK` token in network. The bridge between the network and offchain node is `Operator.sol` contract that keeps information about LINK 

As written in [docs](https://docs.chain.link/chainlink-nodes/v1/fulfilling-requests) . 


*A very important note: The token should implement `ERC677` standard expanding `ERC20` functionality with `transferAndCall()` function. It's third argument gets encoded data
that is the core of interacting with node's offchain part*

There is an official [implementation](https://github.com/smartcontractkit/LinkToken/blob/master/contracts/v0.4/LinkToken.sol) of the simplest ERC677 token, You can just redeploy it with your custom token name. It has `LinkToken()` function mints 1,000,000 tokens to caller's address, if it is a creator. This tokens will be needed for the contract that requests data, so this tokens should be transfer to the contract.

Our chainlink node has the wallet address that needs to be funded by native tokens to pay for gas fees when interacting with network
![Main page of Chainlink node GUI](https://github.com/puls369ar/chainlink-node-creation-flow/blob/main/images/chainlinkGUImain.png)

Also, there is an [Operator](https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/operatorforwarder/Operator.sol) contract which is the representative of the node and the main oracle that responds to data requests and collects `LINK` rewards for it. When deploying it two constructor arguments are passed
`LINK` is the address of the ERC677 token that will be used as a reward and `OWNER` is authority with privileges, collecting rewards. After being deployed `setAuthorizedSenders()` function should be called and the address of the node discussed above should be passed as an array (There can be other nodes too). This makes `Operator` know which nodes are permitted to work with it.




![Chainlink Node Architecture](https://github.com/puls369ar/chainlink-node-creation-flow/blob/main/images/chainlinkNodeArchitecture.svg)


Above is visual representation of chainlink node architecture. Also there are contracts and hardhat [script](https://github.com/puls369ar/chainlink-node-creation-flow/blob/main/code/chainlink-create-flow.ts)  present in this repo, covering all the steps discussed above. 
Finally, at the end  we need to create a job and provide it with Operator's address for it to know which Oracle is it interacting with. In node's GUI go to `Jobs->New Job`, in a text area we need to specify `TOML` syntax instructions that will fetch the data from the offchain APIs. In our example the job will request simple ETH/USD price with default `TOML` code
```toml

# THIS IS EXAMPLE CODE THAT USES HARDCODED VALUES FOR CLARITY.
# THIS IS EXAMPLE CODE THAT USES UN-AUDITED CODE.
# DO NOT USE THIS CODE IN PRODUCTION.

name = "Get > Uint256 - (TOML) for lif3 5.0"
schemaVersion = 1
type = "directrequest"
# evmChainID for LIF3 Testnet
evmChainID = "<CHAIN_ID>"
# Optional External Job ID: Automatically generated if unspecified
# externalJobID = "b1d42cd5-4a3a-4200-b1f7-25a68e48aad8"
contractAddress = "<OPERATOR_ADDRESS>"
maxTaskDuration = "0s"
minIncomingConfirmations = 0
observationSource = """
    decode_log   [type="ethabidecodelog"
                  abi="OracleRequest(bytes32 indexed specId, address requester, bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes data)"
                  data="$(jobRun.logData)"
                  topics="$(jobRun.logTopics)"]

    decode_cbor  [type="cborparse" data="$(decode_log.data)"]
    fetch        [type="http" method=GET url="$(decode_cbor.get)" allowUnrestrictedNetworkAccess="true"]
    parse        [type="jsonparse" path="$(decode_cbor.path)" data="$(fetch)"]

    multiply     [type="multiply" input="$(parse)" times="$(decode_cbor.times)"]

    encode_data  [type="ethabiencode" abi="(bytes32 requestId, uint256 value)" data="{ \\"requestId\\": $(decode_log.requestId), \\"value\\": $(multiply) }"]
    encode_tx    [type="ethabiencode"
                  abi="fulfillOracleRequest2(bytes32 requestId, uint256 payment, address callbackAddress, bytes4 callbackFunctionId, uint256 expiration, bytes calldata data)"
                  data="{\\"requestId\\": $(decode_log.requestId), \\"payment\\":   $(decode_log.payment), \\"callbackAddress\\": $(decode_log.callbackAddr), \\"callbackFunctionId\\": $(decode_log.callbackFunctionId), \\"expiration\\": $(decode_log.cancelExpiration), \\"data\\": $(encode_data)}"
                  ]
    submit_tx    [type="ethtx" to="<OPERATOR_ADDRESS>" data="$(encode_tx)"]

    decode_log -> decode_cbor -> fetch -> parse -> multiply -> encode_data -> encode_tx -> submit_tx
"""

```

Find more details about the instructions [here](https://docs.chain.link/chainlink-nodes/oracle-jobs/all-jobs)
Hit `Create Job` button, If you did all right `JOB SUCCESSFULLY CREATED` message should appear at top.

## Requesting Data
[ATestnetConsumer](https://github.com/puls369ar/chainlink-node-creation-flow/blob/main/code/ATestnetConsumer.sol) contract takes `LINK` address for constructor argument (MLINK for us). Don't forget to fund the contract with some tokens. After being deployed `getEthereumPrice()` function can be called with input arguments of Operator's address and `JobID` of the job created previously in node's GUI
![JobID](https://github.com/puls369ar/chainlink-node-creation-flow/blob/main/images/id.png)

*Important note: Don't forget to remove dashes from JobID before calling the request*

After the call you will be able to see the proccess of your instructions performances by choosing your specific run in `Runs` window
![Runs]https://github.com/puls369ar/chainlink-node-creation-flow/blob/main/images/job.png

*Note: Don't be afraid if the last submitting instructions is pending for long time, it takes over 5-7 minutes to finish. Also call's transaction will finish much earlier then the ndoe run itself* 

If you've done everything correctly, after run completed, getting `currentPrice` by it's getter `currentPrice()` function should return expected **ETH/USD** price fetched from the oracle and specified `LINK` token should be transfered from `ATestnetConsumer` to `Operator` contract.

## And Lastly
If this article helped you even a little bit and prevented from repeating my sins (on which I spend not a small amount of energy and time) then I consider the mission complete. I am open to critics and changes. Feel free to create pull request for an article if needed. Thanks.

