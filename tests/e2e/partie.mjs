// Partie complète dans un vrai navigateur (Chromium), jouée à la souris comme un joueur :
// titre -> les 30 niveaux résolus par glisser-déposer et touchers -> écran de victoire et étoiles à chaque niveau ->
// un indice coûte une étoile -> sauvegarde -> rechargement -> progression retrouvée -> ancien format repris ->
// sauvegarde abîmée mise de côté. Puis 3 niveaux au doigt sur iPhone SE.
// Lancer : npm run partie
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { mkdirSync } from 'node:fs';

const PORT = await new Promise(res => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
// servi sous /kevlumen/ comme sur GitHub Pages : vérifie que les chemins relatifs du build tiennent
const URL = `http://127.0.0.1:${PORT}/kevlumen/index.html`;
const OUT = process.env.SMOKE_SHOTS || 'test-results';
const KEY = 'kevlumen.sauvegarde';
mkdirSync(OUT, { recursive: true });
const server = spawn(process.execPath, ['tools/serve.mjs', 'dist'], { stdio: 'ignore', env: { ...process.env, PORT: String(PORT), BASE_PATH: '/kevlumen/' } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 100; i++) {
  const ok = await new Promise(res => { const c = connect(PORT, '127.0.0.1', () => { c.end(); res(true); }); c.on('error', () => res(false)); });
  if (ok) break; await sleep(100);
}
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${msg}`); if (!ok) fails.push(msg); };

/** Résout le niveau affiché avec de vrais gestes : glisser chaque pièce de la réserve vers sa case, puis toucher pour tourner. */
async function solve(page, touch, cdp) {
  const info = await page.evaluate(() => ({ sol: __kl.L.sol, solRot: __kl.L.solRot || [], lay: __kl.lay }));
  const { lay } = info; const cc = (x, y) => [lay.ox + (x + .5) * lay.cs, lay.oy + (y + .5) * lay.cs];
  const lift = touch ? lay.cs * .7 : 0;
  async function drag(x0, y0, x1, y1) {
    if (touch) {
      const tp = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      await tp('touchStart', x0, y0); for (let k = 1; k <= 8; k++) await tp('touchMove', x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8); await tp('touchEnd');
    } else { await page.mouse.move(x0, y0); await page.mouse.down(); for (let k = 1; k <= 8; k++) await page.mouse.move(x0 + (x1 - x0) * k / 8, y0 + (y1 - y0) * k / 8); await page.mouse.up(); }
    await sleep(60);
  }
  async function tap(x, y) { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await sleep(60); }
  const orient = ([x, y]) => page.evaluate(([x, y]) => { const g = __kl.grid[y * __kl.L.w + x]; return g ? g.o : null; }, [x, y]);
  for (const s of info.sol) {
    const k = s.t === 'flt' ? 'flt' + s.c : s.t;
    const si = (await page.evaluate(() => __trayKeys())).indexOf(k);
    const slot = (await page.evaluate(() => __kl.lay.slots))[si];
    const [tx, ty] = cc(s.x, s.y); await drag(slot.x, slot.y, tx, ty + lift);
    for (let r = 0; r < 4; r++) { const o = await orient([s.x, s.y]); if (o === null || s.t === 'flt' || o === s.o) break; await tap(tx, ty); }
  }
  for (const s of info.solRot) { const [tx, ty] = cc(s.x, s.y); for (let r = 0; r < 4; r++) { if (await orient([s.x, s.y]) === s.o) break; await tap(tx, ty); } }
  await page.waitForFunction(() => __kl.won, null, { timeout: 8000 }).catch(() => {});
  return page.evaluate(() => __kl.won);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const save = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);

  await page.goto(URL);
  check(/^v\d+\.\d+\.\d+$/.test(await page.locator('#ver').innerText()), 'numéro de version sur l\'écran titre');
  await page.waitForFunction(() => window.__klArt !== undefined, null, { timeout: 15000 });
  check(await page.evaluate(() => window.__klArt) === 7, 'les 7 visuels peints sont chargés');
  check((await page.locator('#title').evaluate(el => getComputedStyle(el).backgroundImage)).match(/titre[-\w]*\.webp/) !== null, 'affiche peinte derrière l\'écran titre');
  await page.screenshot({ path: `${OUT}/partie-0-titre.png` });
  await page.click('#bPlay');
  await page.waitForFunction(() => __kl.L && __kl.lay.slots.length > 0);
  const t0 = Date.now(); const ratés = [];
  for (let i = 0; i < 30; i++) {
    const lv = await page.evaluate(() => __kl.L.name);
    if (i === 1) { await page.click('#bHint'); }
    const ok = await solve(page, false);
    if (!ok) { ratés.push(i + 1); if (i < 29) await page.evaluate(n => __kl.startLevel(n), i + 1); continue; }
    await page.waitForSelector('#win:not(.hide)', { timeout: 5000 });
    const stars = await page.locator('#winS i.on').count();
    if (i === 1) check(stars === 2, `niveau 2 avec un indice : 2 étoiles (${stars})`);
    else if (stars !== 3) ratés.push(`${i + 1} (${stars} étoiles)`);
    if (i === 0) await page.screenshot({ path: `${OUT}/partie-1-victoire.png` });
    if (i === 23) await page.screenshot({ path: `${OUT}/partie-1b-aurore.png` });
    if (i === 29) { check((await page.locator('#winI').innerText()).includes('terminé'), 'dernier niveau : message de fin'); await page.screenshot({ path: `${OUT}/partie-2-fin.png` }); break; }
    await page.click('#bNext');
    await page.waitForFunction(n => __kl.L && __kl.L.name !== n, lv);
  }
  check(ratés.length === 0, `30 niveaux résolus au glisser-déposer, 3 étoiles sans indice (${Math.round((Date.now() - t0) / 1000)} s)${ratés.length ? ' ; ratés : ' + ratés.join(', ') : ''}`);
  let d = await save();
  check(d?.version === 2 && d?.settings?.sound === true, 'sauvegarde écrite, version 2, réglages compris');
  check(Object.keys(d?.done || {}).length === 30 && d.done[1] === 2 && d.done[0] === 3, 'les 30 niveaux et leurs étoiles sont sauvegardés');

  await page.click('#bWinMenu');
  // réglage du son : coupé en partie, gardé après rechargement
  await page.locator('.lb').first().click();
  await page.click('#bSnd');
  check((await save())?.settings?.sound === false, 'son coupé : réglage sauvegardé');
  await page.click('#bMenu');
  await page.reload();
  await page.click('#bLevels');
  const prog = await page.locator('#selProg').innerText();
  check(prog.startsWith('30 / 30') && prog.includes('89'), `après rechargement : progression retrouvée (« ${prog} »)`);
  check(await page.locator('.lb:disabled').count() === 0, 'après rechargement : tous les niveaux ouverts');
  check(await page.locator('#bSnd').getAttribute('aria-pressed') === 'false', 'après rechargement : le son reste coupé');
  await page.screenshot({ path: `${OUT}/partie-3-niveaux.png` });

  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('kevlumen_v1', JSON.stringify({ done: { 0: 3, 1: 2, 2: 1 }, snd: false })); });
  await page.reload();
  await page.click('#bLevels');
  check((await page.locator('#selProg').innerText()).startsWith('3 / 30'), 'ancienne progression (format d\'avant) reprise');
  check(await page.evaluate(() => localStorage.getItem('kevlumen_v1')) === null, 'ancienne clé nettoyée');
  check(await page.locator('.lb:disabled').count() === 30 - 6, 'déblocage recalculé : niveaux 1 à 6 ouverts');

  await page.evaluate(k => localStorage.setItem(k, '{abîmée'), KEY);
  await page.reload();
  await page.click('#bPlay');
  check(await page.evaluate(k => localStorage.getItem(k + '.abimee'), KEY) === '{abîmée', 'sauvegarde abîmée mise de côté, le jeu démarre');
  check(await page.evaluate(() => __kl.L.name) === 'Première lueur', 'repart du niveau 1');
  check(errors.length === 0, `aucune erreur console${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
  // onglet caché : la boucle d'affichage s'arrête, puis repart au retour
  const setHidden = h => page.evaluate(h => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await setHidden(true);
  const t1 = await page.evaluate(() => __kl.T); await sleep(400);
  check(!await page.evaluate(() => __kl.looping) && await page.evaluate(() => __kl.T) === t1, 'onglet caché : boucle en pause');
  await setHidden(false); await sleep(300);
  check(await page.evaluate(() => __kl.looping && __kl.T > 0), 'onglet visible : la boucle repart');

  await page.close();

  // écran très dense (DPR 3) : le canvas est plafonné à 2 pixels physiques par pixel CSS
  const dense = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const dp = await dense.newPage();
  await dp.goto(URL);
  const dpr = await dp.evaluate(() => ({ dpr: __kl.DPR, w: document.getElementById('c').width, css: innerWidth }));
  check(dpr.dpr === 2 && dpr.w === dpr.css * 2, `DPR plafonné à 2 sur un écran à 3 (canvas ${dpr.w} px pour ${dpr.css} px CSS)`);
  await dense.close();

  // au doigt sur petit téléphone
  const ctx = await browser.newContext({ ...devices['iPhone SE'] });
  const ph = await ctx.newPage();
  const perr = []; ph.on('pageerror', e => perr.push(String(e)));
  const cdp = await ctx.newCDPSession(ph);
  await ph.goto(URL);
  await ph.tap('#bPlay');
  await ph.waitForFunction(() => __kl.L && __kl.lay.slots.length > 0);
  const r = [];
  for (const i of [0, 12, 29]) { await ph.evaluate(n => __kl.startLevel(n), i); await sleep(300); if (!await solve(ph, true, cdp)) r.push(i + 1); }
  await ph.screenshot({ path: `${OUT}/partie-4-iphone-se.png` });
  check(r.length === 0, `iPhone SE au doigt : niveaux 1, 13 et 30 résolus${r.length ? ' ; ratés : ' + r.join(', ') : ''}`);
  check(perr.length === 0, 'iPhone SE : aucune erreur');
} finally { await browser.close(); server.kill(); }
console.log(fails.length ? `\n${fails.length} échec(s).` : '\nPartie complète réussie.');
process.exit(fails.length ? 1 : 0);
