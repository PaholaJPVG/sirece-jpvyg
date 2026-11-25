const { execSync } = require('child_process');
const path = require('path');

const git = path.join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'cmd', 'git.exe');

execSync(`"${git}" add .`, { stdio: 'inherit' });
execSync(`"${git}" commit -m "Fix: sincronizacion de sesion activa en tiempo real (Header, Sidebar y persistencia sirece_sesion)"`, { stdio: 'inherit' });
execSync(`"${git}" push origin main`, { stdio: 'inherit' });

console.log('Push exitoso!');
