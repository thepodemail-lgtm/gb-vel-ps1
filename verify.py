from playwright.sync_api import sync_playwright
import json, os, time

URL = 'https://thepodemail-lgtm.github.io/gb-vel-ps1/'
shots = '/workspace/ps1/shots'
os.makedirs(shots, exist_ok=True)

errors = []
logs = []

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        channel='chrome',
        args=[
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
            '--no-sandbox',
        ],
    )
    page = browser.new_page(viewport={'width': 960, 'height': 720})
    page.on('console', lambda msg: (logs.append(f'[{msg.type}] {msg.text}'), errors.append(msg.text) if msg.type == 'error' else None))
    page.on('pageerror', lambda err: errors.append(str(err)))

    page.goto(URL, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(1500)
    page.screenshot(path=f'{shots}/01-title.png')

    page.keyboard.press('Enter')
    page.wait_for_timeout(900)
    page.screenshot(path=f'{shots}/02-play.png')

    for key in ['KeyW', 'KeyW', 'KeyA', 'KeyD', 'KeyS']:
        page.keyboard.down(key)
        page.wait_for_timeout(400)
        page.keyboard.up(key)

    page.keyboard.press('KeyZ')
    page.wait_for_timeout(250)
    page.keyboard.press('KeyZ')
    page.wait_for_timeout(400)
    page.keyboard.down('KeyW')
    page.wait_for_timeout(1400)
    page.keyboard.up('KeyW')
    page.keyboard.press('KeyJ')
    page.wait_for_timeout(700)
    page.screenshot(path=f'{shots}/03-walk-attack.png')

    page.keyboard.down('KeyX')
    page.wait_for_timeout(400)
    page.keyboard.up('KeyX')

    canvas_ok = page.evaluate('''() => {
      const c = document.getElementById('game');
      if (!c) return { ok: false, reason: 'no canvas' };
      return {
        ok: typeof THREE !== 'undefined',
        w: c.width,
        h: c.height,
        three: typeof THREE !== 'undefined',
        titleHidden: getComputedStyle(document.getElementById('title-overlay')).display === 'none',
        hud: (document.getElementById('hud') && document.getElementById('hud').textContent) || '',
      };
    }''')

    browser.close()

report = {
    'url': URL,
    'errors': errors,
    'canvasOk': canvas_ok,
    'logCount': len(logs),
    'sampleLogs': logs[:40],
    'shots': [f'{shots}/01-title.png', f'{shots}/02-play.png', f'{shots}/03-walk-attack.png'],
}
open('/workspace/ps1/verify-report.json', 'w').write(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
raise SystemExit(2 if errors else 0)
