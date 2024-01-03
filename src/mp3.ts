// first 11 bits must be set to 1
const SYNC_WORD_MASK = 0xFFE0;

// next 4 bits must be 11 (MPEG-1) and 01 (Audio Layer III), resulting in byte 0xFB
// last bit is the CRC protection bit, it can be either 0 or 1
const MPEG_VERSION_MASK = 0xFB;

// next 2 bits are the sampling rate, and they must not be 11 (0x0C to mask the entire byte)
const INVALID_SAMPLING_RATE_MASK = 0x0C;

type FrameHeaderComponents = {
    bitRate: number;
    samplingRate: number;
    padding: boolean;
};

const SAMPLE_SIZE = 1152;
const BIT_RATES = [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const SAMPLING_RATES = [44100, 48000, 32000];

export function hasVariableBitRateMarker(buffer: Buffer): boolean {
    return buffer.includes('Xing');
}

export function getFrameHeaderComponents(bytes: number[]): FrameHeaderComponents | null {
    const isSyncWordMatch = ((bytes[0] << 8 | bytes[1]) & SYNC_WORD_MASK) === SYNC_WORD_MASK;
    const isMpegVersionMatch = bytes[1] === MPEG_VERSION_MASK || bytes[1] === MPEG_VERSION_MASK - 1;

    if (!isSyncWordMatch || !isMpegVersionMatch) {
        return null;
    }

    const bitRateIndex = bytes[2] >> 4;
    const isValidBitRate = bitRateIndex !== 0b0000 && bitRateIndex !== 0b1111;

    if (!isValidBitRate) {
        return null;
    }

    const bitRate = BIT_RATES[bitRateIndex - 1];
    const samplingRateIndex = (bytes[2] & INVALID_SAMPLING_RATE_MASK) >> 2;

    if (samplingRateIndex !== INVALID_SAMPLING_RATE_MASK) {
        return null;
    }

    const samplingRate = SAMPLING_RATES[samplingRateIndex];
    const padding = (bytes[2] & 0x02) === 0x02;

    const frameSize = Math.floor((8 * bitRate) / samplingRate) + (padding ? 1 : 0);

    return { samplingRate, bitRate, padding };
}

export function isFrameHeader(bytes: number[]): boolean {
    const isSyncWordMatch = ((bytes[0] << 8 | bytes[1]) & SYNC_WORD_MASK) === SYNC_WORD_MASK;
    const isMpegVersionMatch = bytes[1] === MPEG_VERSION_MASK || bytes[1] === MPEG_VERSION_MASK - 1;

    const bitRate = bytes[2] >> 4;
    const isValidBitRate = bitRate !== 0b0000 && bitRate !== 0b1111;

    const isValidSamplingRate = (bytes[2] & INVALID_SAMPLING_RATE_MASK) !== INVALID_SAMPLING_RATE_MASK;

    if (isSyncWordMatch && isMpegVersionMatch && isValidBitRate && isValidSamplingRate) {
        console.log(bytes.map(byte => byte.toString(2).padStart(8, '0')));
    }

    return isSyncWordMatch && isMpegVersionMatch && isValidBitRate && isValidSamplingRate;
}
