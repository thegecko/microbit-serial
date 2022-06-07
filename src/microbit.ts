import { CortexM } from 'dapjs';

// https://infocenter.nordicsemi.com/index.jsp?topic=%2Fcom.nordic.infocenter.nrf52832.ps.v1.1%2Fficr.html
const DEVICE_ID_1 = 0x10000064; // FICR (0x10000000) + DEVICE_ID (0x064)
const MICROBIT_NAME_LENGTH = 5;
const MICROBIT_NAME_CODE_LETTERS = 5;

const CODEBOOK = [
    ['z', 'v', 'g', 'p', 't'],
    ['u', 'o', 'i', 'e', 'a'],
    ['z', 'v', 'g', 'p', 't'],
    ['u', 'o', 'i', 'e', 'a'],
    ['z', 'v', 'g', 'p', 't']
]

export class MicroBit extends CortexM {
    // https://github.com/lancaster-university/codal-microbit-v2/blob/e7236cd69c01a5e803fe3697fd2ef994808794e9/source/MicroBitDevice.cpp#L130
    async microbitFriendlyName(): Promise<string> {
        // Microbit only uses MSB of serial number
        let msb = await this.readMem32(DEVICE_ID_1);

        let d = MICROBIT_NAME_CODE_LETTERS;
        let ld = 1;
        let name = '';

        for (let i = 0; i < MICROBIT_NAME_LENGTH; i++) {
            const h = Math.floor((msb % d) / ld);
            msb -= h;
            d *= MICROBIT_NAME_CODE_LETTERS;
            ld *= MICROBIT_NAME_CODE_LETTERS;
            name = CODEBOOK[i][h] + name;
        }

        return name;
    }
}
