/*
 This code creates a Scanner for port 8545, the most common default port for
    geth applications. This scanner allows attackers to scan port 8545 and look
    for open RCI interfaces to steal funds

 Your own geth node accepting RPC is needed to run this scanner.

 To run first:
 if on Windows in your cli enter: npm install -g web3
 if on Linux in your cli enter: sudo npm install -g web3
 */

let Web3 = require('web3');

let gethServer = {
    host: 'YOUR_GETH_HOSTNAME/IP',
    port: 8545 
    /* 8545 is set as it is usually the default port, however
    other ports can be scanned for open RCI interfaces as well
    */
};
/*  The above code configures the attacker's host and port number
    host value will be set to the attacker's geth hostname/IP, should be a string
    port value will be set to the attacker's geth RPC port, should be a number
    Example: 
    host: '10.0.0.10',
    port: 8545
    */

let wallet = 'YOUR_ACCOUNT_HERE';
/*  The above code configures the attacker's account number
    Should be a String
    Example: let wallet = '0xa000000000ECa0f000a000dc00000b000000BB01';
*/

let firstBlockNumber = 0;
/*  The above code allows the attacker to set the first block to scan. 
    Depending on the attacker's cpu, hundreds of blocks a second can be scanned.
*/

let maxThreads = 200;
/*  The above code allows the attacker to set the amount of threads scanning blocks.
    The more threads the faster, but too high and the geth server or the attacker's
        client machine can become overloading sending network errors.
*/


if (typeof web3 !== 'undefined') {
    web3 = new Web3(web3.currentProvider);
} else {
    console.log(`Connecting to geth on RPC @ ${gethServer.host}:${gethServer.port}`);
    // set the provider you want from Web3.providers
    web3 = new Web3(new Web3.providers.HttpProvider(`http://${gethServer.host}:${gethServer.port}`));
}
// The above code initializes the Ethereum Web3 client

/**
 * Scan an individual transaction
 *
 * This is called once for every transaction found between the
 * starting block and the ending block.
 *
 * Do whatever you want with this transaction.
 */
function scanTransactionCallback(txn, block) {

//    console.log(JSON.stringify(block, null, 4));
//    console.log(JSON.stringify(txn, null, 4));

    if (txn.to === wallet) {

        // A transaction credited ether into this wallet
        var ether = web3.fromWei(txn.value, 'ether');
        console.log(`\r${block.timestamp} +${ether} from ${txn.from}`);

    } else if (txn.from === wallet) {

        // A transaction debitted ether from this wallet
        var ether = web3.fromWei(txn.value, 'ether');
        console.log(`\r${block.timestamp} -${ether} to ${txn.to}`);

    }
}


function scanBlockCallback(block) {

    if (block.transactions) {
        for (var i = 0; i < block.transactions.length; i++) {
            var txn = block.transactions[i];
            scanTransactionCallback(txn, block);
        }
    }
}
//  The above code is a function that scans an individual block


function scanBlockRange(startingBlock, stoppingBlock, callback) {

    if (typeof stoppingBlock === 'undefined') {
        stoppingBlock = web3.eth.blockNumber;
    }

    if (startingBlock > stoppingBlock) {
        return -1;
    }

    let blockNumber = startingBlock,
        gotError = false,
        numThreads = 0,
        startTime = new Date();

    function getPercentComplete(bn) {
        var t = stoppingBlock - startingBlock,
            n = bn - startingBlock;
        return Math.floor(n / t * 100, 2);
    }

    function exitThread() {
        if (--numThreads == 0) {
            var numBlocksScanned = 1 + stoppingBlock - startingBlock,
                stopTime = new Date(),
                duration = (stopTime.getTime() - startTime.getTime())/1000,
                blocksPerSec = Math.floor(numBlocksScanned / duration, 2),
                msg = `Scanned to block ${stoppingBlock} (${numBlocksScanned} in ${duration} seconds; ${blocksPerSec} blocks/sec).`,
                len = msg.length,
                numSpaces = process.stdout.columns - len,
                spaces = Array(1+numSpaces).join(" ");

            process.stdout.write("\r"+msg+spaces+"\n");
            if (callback) {
                callback(gotError, stoppingBlock);
            }
        }
        return numThreads;
    }

    function asyncScanNextBlock() {

        if (gotError) {
            return exitThread();
        }
        // The above code stops the scan if an error happens

        if (blockNumber > stoppingBlock) {
            return exitThread();
        }
        // The above code stops the scan if the stoppingBlock number is reached

        var myBlockNumber = blockNumber++;
        // Increases block number to scan next block

        if (myBlockNumber % maxThreads == 0 || myBlockNumber == stoppingBlock) {
            var pctDone = getPercentComplete(myBlockNumber);
            process.stdout.write(`\rScanning block ${myBlockNumber} - ${pctDone} %`);
        }
        // Shows current scanning progress

        web3.eth.getBlock(myBlockNumber, true, (error, block) => {

            if (error) {
                // Error retrieving this block
                gotError = true;
                console.error("Error:", error);
            } else {
                scanBlockCallback(block);
                asyncScanNextBlock();
            }
        });
        // Allows multiple threads to scan, increasing speed exponentially
    }

    var nt;
    for (nt = 0; nt < maxThreads && startingBlock + nt <= stoppingBlock; nt++) {
        numThreads++;
        asyncScanNextBlock();
    }

    return nt; 
    // Returns number of threads spawned
}
//  The above function calls the function to scan an individual block, and scans a range of blocks

scanBlockRange(firstBlockNumber, undefined);
/* The above code scans all blocks from the starting block up to current,
   and then keep scanning forever. 
*/

/* Sample Output:
user@geth:~$ node ./Port-8545-Scanner.js
Connecting to geth on RPC @ 10.240.0.4:8545
1468864992 +1.0062231070066566 from 0xea674fdde714fd979de3edf0f56aa9716b898ec8
1468885219 +1.0328395604683791 from 0xea674fdde714fd979de3edf0f56aa9716b898ec8
1468907893 +1.0454603977622094 from 0xea674fdde714fd979de3edf0f56aa9716b898ec8
1468930523 +1.0598223082859195 from 0xea674fdde714fd979de3edf0f56aa9716b898ec8
Scanned to block 1914297 (5298 in 16.111 seconds; 328 blocks/sec).
*/
