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
As written in [docs](https://docs.chain.link/chainlink-nodes/v1/fulfilling-requests)


Logs below were generated after `chainlink-flow.ts` script completed
```
MLink token deployed to: 0x47CC0b4B6C2AC1D26345c6Ad40c2E251991a1121

Minting all present `Mlink` tokens into the *OWNER* account who is also the token creator with `MLink::LinkToken()` function
TX address: 0x638bf4874a22ad29b3b985b653cbfc410616788a5e05ddfcf9addd7b5ff79539

Deploying `Operator` giving `LINK: MLink.address` and `OWNER: msg.sedner()` as constructor parameters
Operator deployed to: 0xE9fb047EA6A54099C9ecb49786EE3f42fB03cea4
LINK: 0x47CC0b4B6C2AC1D26345c6Ad40c2E251991a1121
OWNER: 0xe5BefEB20b7Cd906a833B2265DCf22f495E29214

Setting *Authorized Chainlink Node* by calling `setAuthorizedSenders([nodeAddress])` function
TX address: 0x6d83020a2616048538bb5800dd84d205549905301a3fca99b3d8f3932398ad56

JobID: cabcd695d7894a4ea5c0e41eaf1b6309
Deploying `ATestnetConsumer` giving `MLink` address in constructor
0x6196E56D45Bac15ee4679a9861Ef7e074F380dc2
```
