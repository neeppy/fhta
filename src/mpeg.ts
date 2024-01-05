import { Readable } from 'stream';

// first 11 bits must be set to 1
const SYNC_WORD_MASK = 0xFFE0;

// next 4 bits must be 11 (MPEG-1) and 01 (Audio Layer III), resulting in byte 0xFB
// last bit is the CRC protection bit, it can be either 0 or 1
const MPEG_VERSION_MASK = 0xFB;

// next 2 bits are the sampling rate, and they must not be 11 (0x0C to mask the entire byte)
const INVALID_SAMPLING_RATE_MASK = 0x0C;

// this function checks if a given byte array is a valid MPEG frame header
function isFrameHeader(bytes: number[]): boolean {
    const isSyncWordMatch = ((bytes[0] << 8 | bytes[1]) & SYNC_WORD_MASK) === SYNC_WORD_MASK;
    const isMpegVersionMatch = bytes[1] === MPEG_VERSION_MASK || bytes[1] === MPEG_VERSION_MASK - 1;

    const bitRate = bytes[2] >> 4;
    const isValidBitRate = bitRate !== 0b0000 && bitRate !== 0b1111;

    const isValidSamplingRate = (bytes[2] & INVALID_SAMPLING_RATE_MASK) !== INVALID_SAMPLING_RATE_MASK;

    return isSyncWordMatch && isMpegVersionMatch && isValidBitRate && isValidSamplingRate;
}

const SAMPLE_SIZE = 1152; // constant for MPEG-1 Audio Layer III
const BIT_RATES = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const SAMPLING_RATES = [44100, 48000, 32000];

// formula function for computing the frame size, given all the required parameters
const frameSize = (bitRate: number, samplingRate: number, padding: number): number =>
    Math.floor(padding + (SAMPLE_SIZE / 8) * bitRate / samplingRate * 1000);

// compute the frame size out of a mpeg frame header
function getFrameSize(bytes: number[]): number {
    // first 4 bits of 3rd byte are the bit rate index
    const bitRateIndex = bytes[2] >> 4;

    // next 2 bits of 3rd byte are the sampling rate index
    const samplingRateIndex = (bytes[2] & 0b00001100) >> 2;

    const bitRate = BIT_RATES[bitRateIndex - 1];
    const samplingRate = SAMPLING_RATES[samplingRateIndex];
    const padding = (bytes[2] & 0b00000010) >> 1;

    return frameSize(bitRate, samplingRate, padding);
}

export function countFrames(buffer: Buffer): number {
    let frameCount = 0;

    // find the first frame header, marked by FF FB sequence
    let i = buffer.findIndex((byte, index) => byte === 0xFF && buffer[index + 1] === 0xFB);
    let bytes = [buffer[i], buffer[i + 1], buffer[i + 2], buffer[i + 3]];

    while (isFrameHeader(bytes) && i < buffer.length) {
        frameCount++;

        i += getFrameSize(bytes);

        // chose to do this instead of creating a new array on every iteration, because memory allocation is slower than mutating an existing array
        bytes.forEach((_, index) => bytes[index] = buffer[i + index]);
    }

    return frameCount - 1;
}

// found this as a smarter way of finding the frame count in a MP3 file
// this looks for some metadata markers and, if found, it attempts to read the frame count stored in that metadata
export function getStoredFrameCount(buffer: Buffer): number {
    const markerIndex = ['Xing', 'Info', 'VBRI', 'VBRII']
        .map(marker => buffer.indexOf(marker))
        .find(index => index !== -1);

    if (markerIndex === -1) {
        throw new Error('No encoding markers found - attempting manual frame count.');
    }

    // markers are followed by 4 bytes of flags, the presence of the frame count being the first bit
    const flagByte = buffer[markerIndex + 7];

    // Xing VBR files may store the frame count within the metadata
    // if the frame count is stored, the first bit of the flag byte will be set to 1
    const hasFrameCount = (flagByte & 0b0001) === 0b0001;

    if (hasFrameCount) {
        return buffer.readUIntBE(markerIndex + 8, 4);
    } else {
        throw new Error('Frame count flag is disabled on this file - attempting manual frame count.');
    }
}

// this function technically does the same thing as countFrames, but it does it via streams
// it works, but for some reason, the stream would sometimes end before the entire file was read, resulting in an incorrect frame count
// therefore, I chose not to use this version and instead buffer the entire file in memory, even if that's not ideal
export function countFramesInStream(fileStream: Readable) {
    let frameCount = 0;

    fileStream.on('data', (chunk: Buffer) => {
        frameCount += countFrames(chunk);
    });

    return new Promise(resolve => {
        fileStream.on('end', () => resolve(frameCount));
    });
};
