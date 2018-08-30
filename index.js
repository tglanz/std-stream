#!node

const minimist = require('minimist');
const { spawn } = require('child_process');

const propsValidator = (...props) => (object, formatter) => {
    const missingProps = props.filter(prop => !object.hasOwnProperty(prop));
    if (missingProps.length > 0){
        throw new Error(formatter(missingProps));
    }
}

const onCloseAsync = childProcess => 
    new Promise(resolve => childProcess.once('exit', (code, signal) => resolve({ code, signal })));

const writeToStreamAsync = (stream, data, encoding='utf-8') => new Promise((resolve, reject) => {
    const errorListener = error => {
        stream.removeListener('error', errorListener);
        reject(error);
    }

    stream.write(data, encoding, () => {
        stream.removeListener('error', errorListener);
        resolve();
    });
});

async function main(){
    const argv = minimist(process.argv.slice(2));

    propsValidator('process')(argv, missing => `Missing Arguments: ${missing.join(', ')}`);
    await launchChild(argv.process);
};

async function launchChild(childProcessPath){
    const args = [];
    const options = {
        stdio: ['pipe', process.stdout, process.stderr]
    };

    console.log(`Spawning: ${childProcessPath}`);
    const child = spawn(childProcessPath, args, options); 

    child.on('error', error => {
        console.error("Child process errored", error);
    });

    let iterationIndex = 7;
    (async function iteration(){

        ++iterationIndex;

        console.log("========================================");

        const uint32Buffer = new Buffer(4);
        const address = 0xfaceb00b;
        const bufferSize = 0x04;
    
        uint32Buffer.writeUInt32LE(address);
        await writeToStreamAsync(child.stdin, uint32Buffer);
    
        uint32Buffer.writeUInt32LE(bufferSize)
        await writeToStreamAsync(child.stdin, uint32Buffer);
    
        const dataByteArray = new Uint8Array([iterationIndex, 0xaa, 0xbb, 0xcc]);
        const dataBuffer = Buffer.from(dataByteArray);
        await writeToStreamAsync(child.stdin, dataBuffer);

        setTimeout(iteration, 250);
    }());

    
    await onCloseAsync(child);
}

main()
    .then(() => console.log("done"))
    .catch(error => console.error(error));
