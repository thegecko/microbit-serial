import { CortexM, WebUSB } from 'dapjs';

// https://infocenter.nordicsemi.com/index.jsp?topic=%2Fcom.nordic.infocenter.nrf52832.ps.v1.1%2Fficr.html
const FICR = 0x10000000;
const DEVICE_ID_1 = 0x064;

const MICROBIT_NAME_LENGTH = 5;
const MICROBIT_NAME_CODE_LETTERS = 5;
const CODEBOOK = [
    ['z', 'v', 'g', 'p', 't'],
    ['u', 'o', 'i', 'e', 'a'],
    ['z', 'v', 'g', 'p', 't'],
    ['u', 'o', 'i', 'e', 'a'],
    ['z', 'v', 'g', 'p', 't']
]

class MicroBit extends CortexM {

    // https://github.com/lancaster-university/codal-microbit-v2/blob/e7236cd69c01a5e803fe3697fd2ef994808794e9/source/MicroBitDevice.cpp#L130
    public async microbitFriendlyName(length = MICROBIT_NAME_LENGTH): Promise<string> {
        // Microbit only uses MSB of serial number
        let serial = await this.readMem32(FICR + DEVICE_ID_1);

        let d = MICROBIT_NAME_CODE_LETTERS;
        let ld = 1;
        let name = '';

        for (let i = 0; i < length; i++) {
            const h = Math.floor((serial % d) / ld);
            serial -= h;
            d *= MICROBIT_NAME_CODE_LETTERS;
            ld *= MICROBIT_NAME_CODE_LETTERS;
            name = CODEBOOK[i][h] + name;
        }

        return name;
    }
}

export const getFriendlyName = async (usbDevice: USBDevice): Promise<string | undefined> => {
    const transport = new WebUSB(usbDevice);
    const processor = new MicroBit(transport);

    try {
        await processor.connect();
        return processor.microbitFriendlyName();
    } catch {
        return undefined;
    } finally {
        await processor.disconnect();
    }
};
