const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const helper = fs.readFileSync(path.join(__dirname, 'content_flow_video.js'), 'utf8');
let browser;
before(async () => { browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' }); });
after(async () => { await browser?.close(); });

async function fixture({ references = [], wrongAsset = false, model = 'veo-31-fast', agent = false } = {}) {
  const page = await browser.newPage();
  const requests = [];
  await page.route('https://**/*', async route => {
    if (route.request().url().includes('batchexecute')) {
      requests.push(JSON.parse(JSON.parse(new URLSearchParams(route.request().postData()).get('f.req'))[0][0][1]));
      return route.fulfill({ status: 200, body: '[]' });
    }
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
  });
  await page.goto('https://flow.google.com/u/0/project/video-fixture');
  await page.evaluate(({ references, wrongAsset, agent }) => {
    window.fixture = { selected: 'Omni 1.2 Flash', generated: 0, settingsClicks: 0, searches: [] };
    document.body.innerHTML = `<input aria-label="Search"><div class="ProseMirror" contenteditable="true"></div>
      <button aria-label="Add ingredients to the prompt box">add</button>
      <button aria-pressed="${agent}" id="agent">Agent</button>
      <button aria-label="Settings trigger"><span>🍌 Nano Banana 2.1</span><mat-icon>crop_9_16</mat-icon>x4</button>
      <button aria-label="Start generation">arrow_forward</button><div id="chips"></div>`;
    const trigger = document.querySelector('[aria-label="Settings trigger"]');
    const groups = { Mode: ['Image', 'Video'], 'Video type': ['Frames', 'Ingredients'], 'Aspect ratio': ['16:9', '9:16'], 'Output count': ['x1', 'x4'] };
    const icons = { Image: 'image', Video: 'videocam', Frames: 'crop_free', Ingredients: 'chrome_extension', '16:9': 'crop_16_9', '9:16': 'crop_9_16' };
    function settings() {
      fixture.settingsClicks++;
      const old = document.querySelector('#settings');
      if (old) {
        fixture.selections = Object.fromEntries([...old.querySelectorAll('[data-group]')].map(group => [group.dataset.group, group.querySelector('[aria-checked="true"] span')?.textContent]));
        old.remove(); return;
      }
      const panel = document.createElement('div'); panel.id = 'settings';
      panel.innerHTML = Object.entries(groups).map(([group, names]) => `<div data-group="${group}">${names.map((name, index) => {
        const checked = index === (group === 'Output count' ? 1 : 0);
        return `<mat-button-toggle class="mat-button-toggle${checked ? ' mat-button-toggle-checked' : ''}"><button role="radio" aria-checked="${checked}">${icons[name] ? `<mat-icon>${icons[name]}</mat-icon>` : ''}<span>${name}</span></button></mat-button-toggle>`;
      }).join('')}</div>`).join('') + '<button aria-label="Select model family"><span>Omni 1.2 Flash</span><mat-icon>arrow_drop_down</mat-icon></button>';
      document.body.append(panel);
      // The real Material wrapper precedes its clickable radio in document order.
      panel.querySelectorAll('button[role="radio"]').forEach(button => button.onclick = () => {
        button.closest('[data-group]').querySelectorAll('button').forEach(other => other.setAttribute('aria-checked', String(other === button)));
      });
      panel.querySelector('[aria-label="Select model family"]').onclick = event => {
        const menu = document.createElement('div'); menu.id = 'models'; menu.setAttribute('role', 'menu');
        menu.innerHTML = ['Omni 1.2 Flash', 'Veo 3.1 - Fast Leaving Dec 5', 'Veo 3.1 - Quality Leaving Dec 5'].map(name => `<button role="menuitem">${name}<mat-icon>chevron_right</mat-icon></button>`).join('');
        document.body.append(menu);
        menu.querySelectorAll('button').forEach(button => button.onclick = () => {
          fixture.selected = button.childNodes[0].textContent;
          event.target.closest('button').querySelector('span').textContent = fixture.selected;
          menu.remove();
        });
      };
    }
    trigger.onclick = settings;
    document.querySelector('#agent').onclick = event => event.target.setAttribute('aria-pressed', 'false');
    document.querySelector('[aria-label="Add ingredients to the prompt box"]').onclick = () => {
      const old = document.querySelector('#assets'); if (old) { old.remove(); return; }
      const selected = [...document.querySelectorAll('flow-image-ingredient-chip')].map(el => el.dataset.mediaId);
      const panel = document.createElement('div'); panel.id = 'assets';
      panel.innerHTML = '<input aria-label="Search assets" placeholder="Search assets"><div role="listbox"></div>';
      document.body.append(panel);
      panel.querySelector('input').oninput = event => {
        fixture.searches.push(event.target.value);
        const ref = references.find(ref => ref.fileName === event.target.value && !selected.includes(ref.mediaId));
        const list = panel.querySelector('[role="listbox"]'); list.innerHTML = '';
        if (!ref) return;
        const option = document.createElement('button'); option.setAttribute('role', 'option'); option.dataset.mediaId = ref.mediaId; option.textContent = ref.fileName;
        option.onclick = () => {
          const chip = document.createElement('flow-image-ingredient-chip'); chip.dataset.mediaId = wrongAsset ? 'wrong-id' : ref.mediaId; chip.textContent = ref.fileName;
          document.querySelector('#chips').append(chip); panel.remove();
        };
        list.append(option);
      };
    };
    document.querySelector('[aria-label="Start generation"]').onclick = async () => {
      fixture.generated++;
      const payload = { prompt: document.querySelector('.ProseMirror').innerText, references: [...document.querySelectorAll('flow-image-ingredient-chip')].map(el => el.dataset.mediaId) };
      await fetch('/data/batchexecute', { method: 'POST', body: new URLSearchParams({ 'f.req': JSON.stringify([[['videoRpc', JSON.stringify(payload), null, 'generic']]]) }) });
      const video = document.createElement('video'); video.src = 'https://flow-content.google/video/fixture-result'; document.body.append(video);
    };
  }, { references, wrongAsset, agent });
  await page.addScriptTag({ content: helper });
  const config = { id: 'job', projectId: 'video-fixture', prompt: 'SCENE: A "blue" cup.\nMOTION: Slow camera pan.', model, aspect: 'VIDEO_ASPECT_RATIO_PORTRAIT', references };
  await page.evaluate(config => GucFlowVideoNative.begin(config), config);
  await page.waitForFunction(() => ['ready', 'failed'].includes(GucFlowVideoNative.status('job').stage), null, { timeout: 10000 });
  return { page, requests, config, status: await page.evaluate(() => GucFlowVideoNative.status('job')) };
}

test('current Settings trigger composer reaches ready with exact references, icons and one output', async () => {
  const references = [{ mediaId: 'subject', fileName: 'subject.jpg' }, { mediaId: 'outfit', fileName: 'outfit.jpg' }];
  const { page, status } = await fixture({ references, agent: true });
  try {
    assert.equal(status.stage, 'ready', status.error);
    assert.equal(status.selectedModel, 'Veo 3.1 - Fast Leaving Dec 5');
    assert.deepEqual(await page.evaluate(() => fixture.searches), references.map(ref => ref.fileName));
    assert.equal(await page.getByLabel('Search', { exact: true }).inputValue(), '');
    assert.equal(await page.locator('#agent').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.evaluate(() => fixture.generated), 0);
    assert.deepEqual(await page.evaluate(() => fixture.selections), { Mode: 'Video', 'Video type': 'Ingredients', 'Aspect ratio': '9:16', 'Output count': 'x1' });
    assert.equal(await page.locator('#settings').count(), 0);
  } finally { await page.close(); }
});

test('multiline quoted QID prompt is observed and completed once, with matching references', async () => {
  const { page, requests, config, status } = await fixture({ references: [{ mediaId: 'subject', fileName: 'subject.jpg' }] });
  try {
    assert.equal(status.stage, 'ready', status.error);
    assert.deepEqual(await page.evaluate(() => GucFlowVideoNative.submit('job')), { ok: true });
    await page.waitForFunction(() => GucFlowVideoNative.status('job').stage === 'done');
    const result = await page.evaluate(() => GucFlowVideoNative.status('job'));
    assert.equal(result.submitted, true);
    assert.equal(result.videoUrl, 'https://flow-content.google/video/fixture-result');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].prompt, config.prompt);
    assert.deepEqual(requests[0].references, ['subject']);
    assert.ok((await page.evaluate(() => GucFlowVideoNative.submit('job'))).error);
    assert.equal(await page.evaluate(() => fixture.generated), 1);
  } finally { await page.close(); }
});

test('flow-auto retains the current video model without selecting an arbitrary menu entry', async () => {
  const { page, status } = await fixture({ model: 'flow-auto' });
  try {
    assert.equal(status.stage, 'ready', status.error);
    assert.equal(status.selectedModel, 'Omni 1.2 Flash');
    assert.equal(await page.locator('#models').count(), 0);
  } finally { await page.close(); }
});

test('unavailable model fails before generation', async () => {
  const { page, status } = await fixture({ model: 'not-available' });
  try {
    assert.equal(status.code, 'FLOW_VIDEO_MODEL_UNAVAILABLE');
    assert.equal(status.clicked, false);
    assert.equal(await page.evaluate(() => fixture.generated), 0);
  } finally { await page.close(); }
});

test('wrong reference chip fails before generation', async () => {
  const { page, status } = await fixture({ references: [{ mediaId: 'subject', fileName: 'subject.jpg' }], wrongAsset: true });
  try {
    assert.equal(status.code, 'FLOW_REFERENCE_MISMATCH');
    assert.equal(status.clicked, false);
    assert.equal(await page.evaluate(() => fixture.generated), 0);
  } finally { await page.close(); }
});
