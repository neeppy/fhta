import fs from 'fs';
import { isFrameHeader, hasVariableBitRateMarker } from './mp3';

const fileName = process.argv[2];

if (!fileName) {
    console.error('Please provide a file name');

    process.exit(1);
}

const fileStream = fs.createReadStream(fileName);

fileStream.on('data', (chunk: Buffer) => {
    let markerIndex = chunk.indexOf('Xing');

    if (markerIndex === -1) {
        markerIndex = chunk.indexOf('Info');
    }

    const flagByte = chunk[markerIndex + 7];

    // Xing VBR files may store the frame count within the metadata
    // if the frame count is stored, the first bit of the flag byte will be set to 1
    const hasFrameCount = (flagByte & 0b0001) === 0b0001;

    if (hasFrameCount) {
        const frameCount = chunk.readUIntBE(markerIndex + 8, 4);

        console.log(`Total number of frames: ${frameCount}`);
    } else {
        console.log('Could not determine number of frames.');
    }

    fileStream.close();
});
