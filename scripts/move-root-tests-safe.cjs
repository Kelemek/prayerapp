const fs = require('fs')
const path = require('path')

function walk(dir) {
  const results = []
  const list = fs.readdirSync(dir)
  list.forEach(function(file) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    if (stat && stat.isDirectory()) {
      results.push(...walk(filePath))
    } else {
      results.push(filePath)
    }
  })
  return results
}

const extensions = ['.ts', '.tsx', '.js', '.jsx']

function tryResolveImport(baseDir, spec) {
  const maxUp = 4
  for (let up = 0; up <= maxUp; up++) {
    const tryBase = path.resolve(baseDir, ...Array(up).fill('..'))
    const abs = path.resolve(tryBase, spec)
    for (const ext of extensions) {
      if (fs.existsSync(abs + ext)) return abs + ext
    }
    if (fs.existsSync(abs)) return abs
    for (const ext of extensions) {
      if (fs.existsSync(path.join(abs, 'index' + ext))) return path.join(abs, 'index' + ext)
    }
  }
  return null
}

function makePosix(p) {
  return p.split(path.sep).join('/')
}

function processFile(filePath) {
  if (!filePath.includes('.test.') && !filePath.includes('.spec.')) return
  if (!filePath.startsWith(path.join(__dirname, '..', 'src'))) return
  const dir = path.dirname(filePath)
  if (dir !== path.join(__dirname, '..', 'src')) return
  const base = path.basename(filePath)
  const targetDir = path.join(dir, '__tests__')
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir)
  const targetPath = path.join(targetDir, base)

  let content = fs.readFileSync(filePath, 'utf8')

  // Replace import from '...'
  const importRegex = /(from\s+['"])([.\/][^'\"]+)(['"])/g
  content = content.replace(importRegex, (m, p1, p2, p3) => {
    const resolved = tryResolveImport(dir, p2)
    if (!resolved) {
      console.warn('Could not resolve import', p2, 'in', filePath)
      return m
    }
    const rel = path.relative(targetDir, resolved)
    let out = makePosix(rel)
    if (!out.startsWith('.')) out = './' + out
    const origHasExt = /\.[a-zA-Z0-9]+$/.test(p2)
    if (!origHasExt) {
      out = out.replace(/(\.tsx|\.ts|\.js|\.jsx)$/, '')
    }
    return p1 + out + p3
  })

  // Replace require('...')
  const reqRegex = /(require\(\s*['"])([.\/][^'\"]+)(['"]\s*\))/g
  content = content.replace(reqRegex, (m, p1, p2, p3) => {
    const resolved = tryResolveImport(dir, p2)
    if (!resolved) {
      console.warn('Could not resolve require', p2, 'in', filePath)
      return m
    }
    const rel = path.relative(targetDir, resolved)
    let out = makePosix(rel)
    if (!out.startsWith('.')) out = './' + out
    const origHasExt = /\.[a-zA-Z0-9]+$/.test(p2)
    if (!origHasExt) {
      out = out.replace(/(\.tsx|\.ts|\.js|\.jsx)$/, '')
    }
    return p1 + out + p3
  })

  // Dynamic import(...) patterns
  const dynRegex = /(import\(\s*['"])([.\/][^'\"]+)(['"]\s*\))/g
  content = content.replace(dynRegex, (m, p1, p2, p3) => {
    const resolved = tryResolveImport(dir, p2)
    if (!resolved) {
      console.warn('Could not resolve dynamic import', p2, 'in', filePath)
      return m
    }
    const rel = path.relative(targetDir, resolved)
    let out = makePosix(rel)
    if (!out.startsWith('.')) out = './' + out
    const origHasExt = /\.[a-zA-Z0-9]+$/.test(p2)
    if (!origHasExt) {
      out = out.replace(/(\.tsx|\.ts|\.js|\.jsx)$/, '')
    }
    return p1 + out + p3
  })

  // Update vi.mock(...) and jest.mock(...) module specifiers that are relative
  const mockCallRegex = /((?:vi|jest)\.mock\(\s*['"])([.\/][^'"\)]+)(['"]\s*[,)])/g
  content = content.replace(mockCallRegex, (m, p1, p2, p3) => {
    const resolved = tryResolveImport(dir, p2)
    if (!resolved) {
      console.warn('Could not resolve mock target', p2, 'in', filePath)
      return m
    }
    const rel = path.relative(targetDir, resolved)
    let out = makePosix(rel)
    if (!out.startsWith('.')) out = './' + out
    const origHasExt = /\.[a-zA-Z0-9]+$/.test(p2)
    if (!origHasExt) {
      out = out.replace(/(\.tsx|\.ts|\.js|\.jsx)$/, '')
    }
    return p1 + out + p3
  })

  fs.writeFileSync(targetPath, content, 'utf8')
  fs.unlinkSync(filePath)
  console.log(`Moved: ${filePath} -> ${targetPath}`)
}

const root = path.join(__dirname, '..', 'src')
const files = walk(root)
files.forEach(processFile)
console.log('Root test move complete')
