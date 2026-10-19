import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"
import { createServer } from "vite"

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const temporary = await mkdtemp(join(tmpdir(), "mosaic-package-"))
const npm = process.platform === "win32" ? "npm.cmd" : "npm"
let server
let browser
try {
  const packed = JSON.parse(execFileSync(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", temporary], {
    cwd: repository, encoding: "utf8",
  }))[0]
  assert.ok(packed.files.every(({ path }) => !/^(src|cjs|test)\//.test(path)))
  assert.ok(packed.files.some(({ path }) => path === "dist/types/index.d.ts"))
  await writeFile(join(temporary, "package.json"), JSON.stringify({ private: true, type: "module" }))
  execFileSync(npm, ["install", "--ignore-scripts", "--offline", "--no-audit", "--no-fund", "--package-lock=false", join(temporary, packed.filename)], {
    cwd: temporary, stdio: "pipe",
  })
  execFileSync(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { Mosaic, $ } from 'mosaic';
    import { Mosaic as Min } from 'mosaic/dist/mosaic.min.js';
    assert.equal(Mosaic, $);
    assert.equal(typeof Min, 'function');
  `], { cwd: temporary, stdio: "pipe" })
  const contracts = (await readFile(join(repository, "test/typechecks/contracts.ts"), "utf8"))
    .replaceAll("../../src/index.js", "mosaic")
  await writeFile(join(temporary, "consumer.ts"), contracts)
  for (const resolution of ["Bundler", "NodeNext"]) {
    await writeFile(join(temporary, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        strict: true, noEmit: true, target: "ES2022", types: [],
        module: resolution === "Bundler" ? "ESNext" : "NodeNext",
        moduleResolution: resolution, lib: ["ES2022", "DOM", "DOM.Iterable"],
      }, include: ["consumer.ts"],
    }))
    execFileSync(process.execPath, [join(repository, "node_modules/typescript/bin/tsc"), "--project", join(temporary, "tsconfig.json")], {
      cwd: temporary, stdio: "pipe",
    })
  }
  await writeFile(join(temporary, "index.html"), '<script type="module" src="/consumer.js"></script>')
  await writeFile(join(temporary, "consumer.js"), `
    import { Mosaic, $ } from 'mosaic';
    import { Mosaic as Min } from 'mosaic/dist/mosaic.min.js';
    const check = (condition) => { if (!condition) throw new Error('Consumer assertion failed') };
    check(Mosaic === $);
    for (const mount of [Mosaic, Min]) {
      const root = document.createElement('div');
      root.innerHTML = '<input type="text" value="DOM"><input type="checkbox" checked><output class="layout"></output>';
      document.body.append(root);
      const output = root.querySelector('output');
      const controller = mount(root, {
        state: { value: 'configured', enabled: false },
        actions: { change: (state, value) => ({ ...state, value }), enable: (state, enabled) => ({ ...state, enabled }) },
        elements: [
          { select: 'input[type=text]', sync: 'value' },
          { select: 'input[type=checkbox]', sync: 'enabled' },
          { select: 'output', text: ({state}) => state.value,
            attribute: ({state}) => ({'data-value':state.value}),
            class: ({state}) => ({active:state.value.length > 0}) },
        ],
      });
      check(output.textContent === 'DOM');
      const checkbox = root.querySelector('input[type=checkbox]');
      check(controller.getState().enabled === true);
      checkbox.click();
      check(controller.getState().enabled === false);
      await controller.dispatch('enable', true);
      check(checkbox.checked === true);
      await controller.dispatch('change', 'updated');
      check(output.textContent === 'updated');
      check(output.getAttribute('data-value') === 'updated');
      check(output.classList.contains('layout') && output.classList.contains('active'));
      check(root.querySelector('input').value === 'updated');
      controller.destroy();
      root.remove();
    }
    window.packagePassed = true;
  `)
  server = await createServer({
    configFile: false, root: temporary,
    server: { host: "127.0.0.1", port: 0 },
  })
  await server.listen()
  browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(String(error)))
  const address = server.httpServer.address()
  await page.goto(`http://127.0.0.1:${address.port}`)
  await page.waitForFunction(() => window.packagePassed === true)
  assert.deepEqual(errors, [])
  console.log("Packed consumer passed: ESM imports, Bundler/NodeNext declarations, browser bindings, and minified entry.")
} finally {
  await browser?.close()
  await server?.close()
  await rm(temporary, { recursive: true, force: true })
}
