# Chainlink Node Creation Flow
I faced problems while creating a custom Chainlink node and trying to fetch the data from it, so in this guide, I will share the step-by-step flow of doing it, based on my experience.

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
