import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const targetDir = 'C:/Users/dacth/.gemini/antigravity/brain/814c0103-c30b-40ef-a494-c0bbb1845093';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const viewports = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'laptop_1366x768', width: 1366, height: 768 },
  { name: 'mobile_375x667', width: 375, height: 667 },
];

for (const vp of viewports) {
  const outFile = path.join(targetDir, `search_${vp.name}.png`);
  const url = `http://127.0.0.1:3005/?q=${encodeURIComponent('chi phí được')}`;
  const cmd = `"${edgePath}" --headless=new --disable-gpu --virtual-time-budget=5000 --window-size=${vp.width},${vp.height} --screenshot="${outFile}" "${url}"`;
  console.log('Capturing:', vp.name);
  execSync(cmd);
  console.log('Saved:', outFile);
}

console.log('All screenshots captured successfully!');


async function main() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log('Spawning Edge...');
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9229',
    '--user-data-dir=' + userDataDir,
    'about:blank',
  ]);

  let connected = false;
  let targets = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch('http://127.0.0.1:9229/json');
      targets = await res.json();
      if (targets && targets.length > 0) {
        connected = true;
        break;
      }
    } catch (e) {
      console.log('Waiting for Edge CDP...', attempt);
    }
  }

  if (!connected || !targets) {
    console.error('Could not connect to Edge CDP');
    edgeProc.kill();
    return;
  }

  const wsUrl = targets[0].webSocketDebuggerUrl;
  console.log('Connecting to WebSocket:', wsUrl);
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const handler = (event) => {
        try {
          const raw = typeof event.data === 'string' ? event.data : event.data.toString('utf8');
          const msg = JSON.parse(raw);
          if (msg.id === msgId) {
            ws.removeEventListener('message', handler);
            if (msg.error) {
              reject(new Error(JSON.stringify(msg.error)));
            } else {
              resolve(msg.result);
            }
          }
        } catch (e) {
          // ignore non-matching chunk
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900, mobile: false },
    { name: 'laptop_1366x768', width: 1366, height: 768, mobile: false },
    { name: 'mobile_375x667', width: 375, height: 667, mobile: true },
  ];

  for (const vp of viewports) {
    console.log(`Setting viewport for ${vp.name}...`);
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
    });

    console.log(`Navigating to http://127.0.0.1:3005 ...`);
    await send('Page.navigate', { url: 'http://127.0.0.1:3005' });
    await new Promise((r) => setTimeout(r, 2000));

    // Trigger search modal open
    console.log('Triggering search modal open...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[aria-label*="Tìm kiếm"], input[placeholder*="Tìm kiếm"]');
          if (btn) btn.click();
          else {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          }
        })()
      `,
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Type query
    console.log('Typing query "chi phí được"...');
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const input = document.querySelector('input[role="combobox"]');
          if (input) {
            input.focus();
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, 'chi phí được');
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `,
    });
    await new Promise((r) => setTimeout(r, 1500));

    console.log(`Capturing screenshot for ${vp.name}...`);
    const sRes = await send('Page.captureScreenshot', { format: 'png' });
    const filePath = path.join(targetDir, `search_${vp.name}.png`);
    fs.writeFileSync(filePath, Buffer.from(sRes.data, 'base64'));
    console.log('Saved:', filePath);
  }

  ws.close();
  edgeProc.kill();
  console.log('All screenshots captured successfully!');
}

main().catch(console.error);