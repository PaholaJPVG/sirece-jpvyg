const fs = require('fs')
const bundle = fs.readFileSync('dist/assets/index-CHlhbi7K.js', 'utf8')

const checks = [
  ['Chincha (debe false)',                    !bundle.includes('Chincha')],
  ['Garcia Lopez (debe false)',               !bundle.includes('Garc\xeda L\xf3pez, Juan Carlos')],
  ['Perez Quispe (debe false)',               !bundle.includes('P\xe9rez Quispe')],
  ['842 estudiantes literal (debe false)',    !bundle.includes('842 est') && !bundle.includes('"842"')],
  ['34 faltas (debe false)',                  !bundle.includes('"34"')],
  ['Arequipa Peru (debe true)',               bundle.includes('Arequipa')],
  ['Sin incidencias (debe true)',             bundle.includes('Sin incidencias registradas')],
  ['AppConfigProvider (debe true)',           bundle.includes('AppConfigProvider') || bundle.includes('sirece:app-config')],
]

let ok = true
checks.forEach(([label, pass]) => {
  const icon = pass ? '\u2705' : '\u274C'
  console.log(icon + '  ' + label)
  if (!pass) ok = false
})
console.log(ok ? '\nTodo correcto.' : '\nHay fallos. Revisar.')
process.exit(ok ? 0 : 1)
