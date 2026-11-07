let cubeId;

function init() {
  nova64.scene.setClearColor(0x090a0f);
  nova64.camera.setCameraPosition(0, 3, 7);
  nova64.camera.setCameraTarget(0, 0, 0);
  nova64.light.setAmbientLight(0xffffff, 0.8);
  nova64.light.setLightDirection(-0.5, -1, -0.3);
  cubeId = nova64.scene.createCube(2, 0xff3366, [0, 0, 0]);
}

function update(dt) {
  nova64.scene.rotateMesh(cubeId, 0, dt * 1.2, 0);
}

function draw() {
  const white = nova64.draw.rgba8(255, 255, 255, 255);
  nova64.draw.print('HELLO NOVA64', 8, 8, white, 1);
}
