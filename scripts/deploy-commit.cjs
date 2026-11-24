const { execSync } = require('child_process');
const path = require('path');

const gitExe = path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe');

function run(cmd) {
  console.log(`> ${cmd}`);
  const out = execSync(`"${gitExe}" ${cmd}`, { encoding: 'utf-8', stdio: 'inherit' });
}

try {
  run('add .');
  run('commit -m "Mejoras SIRECE: firma institucional y buscador global funcional con modal rapido"');
  run('push origin main');
  console.log('Deploy push exitoso!');
} catch (e) {
  console.error('Error durante commit/push:', e.message);
  process.exit(1);
}
