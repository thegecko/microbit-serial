import { WebUSB, DAPLink } from 'dapjs';
import { getServices } from 'microbit-web-bluetooth';
import { LedMatrix } from 'microbit-web-bluetooth/types/services/led';
import { getFriendlyName, getPairPattern } from './microbit';

const VENDOR_ID = 3368;
const PRODUCT_ID = 516;
const MICROBIT_PREFIX = 'BBC micro:bit';
const FLASH_FILE = 'microbit-DEVICE-PRODUCTION.hex';
const SERVICE_UUID = 'e95d0753-251d-470a-a062-fa1922dfa9a8';

const usbNavigator = navigator && navigator.usb;
const bleNavigator = navigator && navigator.bluetooth;

const usbButtonEl = document.getElementById('usb-button') as HTMLButtonElement;
const flashButtonEl = document.getElementById('flash-button') as HTMLButtonElement;
const bleButtonEl = document.getElementById('ble-button') as HTMLButtonElement;
const resultEl = document.getElementById('result') as HTMLDivElement;
const matrixEl = document.getElementById('matrix') as HTMLDivElement;

let usbDevice: USBDevice | undefined;
let friendlyName: string | undefined;

const log = (message: string, clearFirst = false) => {
    if (clearFirst) {
        resultEl.innerText = '';
    }
    resultEl.innerText += `${message}\n`;
}

const updateMatrix = (state?: LedMatrix) => {
    matrixEl.innerHTML = '';
    if (state) {
        for (let i = 0; i < 5; i ++) {
            for (let j = 0; j < 5; j ++) {
                const led = document.createElement('div');
                led.id = `led-${i}-${j}`;
                led.className = state[i][j] ? 'led-on' : 'led-off';
                matrixEl.appendChild(led);
            }
        }
    }
};

const updateDevice = async (device?: USBDevice | undefined) => {
    resultEl.innerText = '';
    usbDevice = device;
    friendlyName = usbDevice ? await getFriendlyName(usbDevice) : undefined;
    const matrix = usbDevice ? getPairPattern(friendlyName) : undefined;

    flashButtonEl.disabled = bleButtonEl.disabled = !usbDevice;
    bleButtonEl.innerText = 'Connect Bluetooth Device' + (friendlyName ? ` [${friendlyName}]` : '');
    updateMatrix(matrix);
}

usbButtonEl.addEventListener('click', async () => {
    if (!usbNavigator) {
        throw new Error('WebUSB is not supported in this browser, please refer to https://caniuse.com/webusb for supported browsers');
    }

    try {
        const device = await usbNavigator.requestDevice({
            filters: [{
                vendorId: VENDOR_ID,
                productId: PRODUCT_ID
            }]
        });

        updateDevice(device);
    } catch (error) {
        log(error);
    }
});

flashButtonEl.addEventListener('click', async () => {
    if (!usbDevice) {
        return;
    }

    const response = await fetch(FLASH_FILE);
    const buffer = await response.arrayBuffer();

    const transport = new WebUSB(usbDevice);
    const target = new DAPLink(transport);

    target.on(DAPLink.EVENT_PROGRESS, progress => {
        log(`Flashing ${Math.ceil(progress * 100)}%`, true);
    });

    try {
        // Flash binary to board
        await target.connect();
        await target.flash(buffer);
        await target.disconnect();

        log('Flash complete!', true);
    } catch (error) {
        log(error);
    }
});

bleButtonEl.addEventListener('click', async () => {
    if (!bleNavigator) {
        throw new Error('Web Bluetooth is not supported in this browser, please refer to https://caniuse.com/web-bluetooth for supported browsers');
    }

    try {
        const namePrefix = MICROBIT_PREFIX + (friendlyName ? ` [${friendlyName}]` : '');
        const bleDevice = await bleNavigator.requestDevice({
            filters: [{ namePrefix }],
            optionalServices: [ SERVICE_UUID ]
        });

        const services = await getServices(bleDevice);

        if (services.accelerometerService) {
            services.accelerometerService.addEventListener('accelerometerdatachanged', ev => {
                log(`x: ${ev.detail.x}`, true);
                log(`y: ${ev.detail.y}`);
                log(`z: ${ev.detail.z}`);
            });
        }
    } catch (error) {
        log(error);
    }
});

window.addEventListener('load', () => {
    if (!usbNavigator) {
        return;
    }

    usbNavigator.addEventListener('connect', async ev => {
        if (ev.device.vendorId === VENDOR_ID && ev.device.productId === PRODUCT_ID) {
            updateDevice(ev.device);
        }
    });

    usbNavigator.addEventListener('disconnect', ev => {
        if (ev.device === usbDevice) {
            updateDevice(undefined);
        }
    });
});
