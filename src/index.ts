import { WebUSB, DAPLink } from 'dapjs';
import { getServices } from 'microbit-web-bluetooth';
import { MicroBit } from './microbit';

const usbNavigator = navigator && navigator.usb;
const bleNavigator = navigator && navigator.bluetooth;
const usbButtonEl = document.getElementById('usb-button') as HTMLButtonElement;
const flashButtonEl = document.getElementById('flash-button') as HTMLButtonElement;
const bleButtonEl = document.getElementById('ble-button') as HTMLButtonElement;
const resultEl = document.getElementById('result') as HTMLDivElement;

let usbDevice: USBDevice | undefined;
let friendlyName: string | undefined;

const writeLine = (message: string) => {
    resultEl.innerText += `${message}\n`;
}

const updateUI = () => {
    flashButtonEl.disabled = !usbDevice;
    bleButtonEl.disabled = !friendlyName;
    flashButtonEl.innerText = 'Flash Device' + (friendlyName ? ` [${friendlyName}]` : '');
    bleButtonEl.innerText = 'Connect Bluetooth Device' + (friendlyName ? ` [${friendlyName}]` : '');
}

const getFriendlyName = async (usbDevice: USBDevice): Promise<string> => {
    const transport = new WebUSB(usbDevice);
    const processor = new MicroBit(transport);

    try {
        await processor.connect();
        return processor.microbitFriendlyName();
    } finally {
        await processor.disconnect();
    }
};

usbButtonEl.addEventListener('click', async () => {
    if (!usbNavigator) {
        throw new Error('WebUSB is not supported in this browser, please refer to https://caniuse.com/webusb for supported browsers');
    }

    try {
        usbDevice = await usbNavigator.requestDevice({
            filters: [{
                vendorId: 3368,
                productId: 516
            }]
        });

        friendlyName = await getFriendlyName(usbDevice);
        updateUI();
    } catch (error) {
        writeLine(error);
    }
});

flashButtonEl.addEventListener('click', async () => {
    if (!usbDevice) {
        return;
    }

    const response = await fetch('microbit-DEVICE-PRODUCTION.hex');
    const buffer = await response.arrayBuffer();

    const transport = new WebUSB(usbDevice);
    const target = new DAPLink(transport);

    target.on(DAPLink.EVENT_PROGRESS, progress => {
        resultEl.innerText = `${Math.ceil(progress * 100)}%`;
    });

    try {
        // Push binary to board
        writeLine(`Flashing binary file ${buffer.byteLength} words long...`);
        await target.connect();
        await target.flash(buffer);
        await target.disconnect();
        resultEl.innerText = '';
        writeLine("Flash complete!");
    } catch (error) {
        writeLine(error);
    }
});

bleButtonEl.addEventListener('click', async () => {
    if (!bleNavigator) {
        throw new Error('Web Bluetooth is not supported in this browser, please refer to https://caniuse.com/web-bluetooth for supported browsers');
    }

    try {
        const bleDevice = await bleNavigator.requestDevice({
            filters: [{
                namePrefix: `BBC micro:bit [${friendlyName}]`
            }],
            optionalServices: [
                'e95d0753-251d-470a-a062-fa1922dfa9a8'
            ]
        });

        const services = await getServices(bleDevice);

        if (services.accelerometerService) {
            services.accelerometerService.addEventListener('accelerometerdatachanged', ev => {
                resultEl.innerText = '';
                writeLine(`x: ${ev.detail.x}`);
                writeLine(`y: ${ev.detail.y}`);
                writeLine(`z: ${ev.detail.z}`);
            });
        }
    } catch (error) {
        writeLine(error);
    }
});

window.addEventListener('load', () => {
    updateUI();

    if (!usbNavigator) {
        return;
    }

    usbNavigator.addEventListener('connect', async ev => {
        usbDevice = ev.device;            
        friendlyName = await getFriendlyName(usbDevice);
        updateUI();
    });

    usbNavigator.addEventListener('disconnect', ev => {
        if (ev.device === usbDevice) {
            usbDevice = undefined;
            friendlyName = undefined;
            updateUI();
        }
    });
});
