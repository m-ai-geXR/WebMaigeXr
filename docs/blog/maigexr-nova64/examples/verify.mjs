// Offline teaching check. Mocks API calls; does not render or contact a service.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./hello-nova64.js', import.meta.url), 'utf8');
assert.doesNotMatch(source, /^\s*export\s/m);

function simulate(fps) {
  let allocations = 0;
  let rotation = 0;
  let labels = 0;
  const nova64 = {
    scene: {
      setClearColor() {},
      createCube(size, color, position) {
        assert.equal(size, 2);
        assert.equal(color, 0xff3366);
        assert.deepEqual(Array.from(position), [0, 0, 0]);
        allocations++;
        return 42;
      },
      rotateMesh(id, x, y, z) {
        assert.equal(id, 42);
        assert.equal(x, 0);
        assert.equal(z, 0);
        rotation += y;
      },
    },
    camera: { setCameraPosition() {}, setCameraTarget() {} },
    light: { setAmbientLight() {}, setLightDirection() {} },
    draw: {
      rgba8(r, g, b, a) {
        assert.deepEqual([r, g, b, a], [255, 255, 255, 255]);
        return 0xffffffff;
      },
      print(text, x, y, color, scale) {
        assert.deepEqual([text, x, y, color, scale], ['HELLO NOVA64', 8, 8, 0xffffffff, 1]);
        labels++;
      },
    },
  };
  const context = vm.createContext({ nova64 });
  vm.runInContext(source, context, { timeout: 1000 });
  vm.runInContext(`
    init();
    for (let frame = 0; frame < ${fps}; frame++) {
      update(1 / ${fps});
      draw();
    }
  `, context, { timeout: 1000 });
  assert.equal(allocations, 1);
  assert.equal(labels, fps);
  assert.ok(Math.abs(rotation - 1.2) < 1e-10);
  return rotation;
}

assert.ok(Math.abs(simulate(30) - simulate(120)) < 1e-10);
console.log('PASS: lifecycle, one cube allocation, HUD calls, and rotation at 30/120 simulated FPS. Graphics were not rendered.');
