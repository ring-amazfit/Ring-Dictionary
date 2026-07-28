// Node-only ESM loader for tools/profile-io.mjs.
// Maps the bare '@zos/fs' import to our stub. The project sources are forced
// to ESM via package.json "type":"module" (temporarily set during harness),
// so this loader only needs to redirect the bare module specifier.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@zos/fs') {
    return {
      url: new URL('./stub-zos-fs.mjs', import.meta.url).href,
      format: 'module',
      shortCircuit: true,
    }
  }
  if (specifier === '@zos/storage') {
    return {
      url: new URL('./stub-zos-storage.mjs', import.meta.url).href,
      format: 'module',
      shortCircuit: true,
    }
  }
  if (specifier.startsWith('./') && !/\.[a-zA-Z]+$/.test(specifier)) {
    try {
      return await nextResolve(specifier + '.js', context)
    } catch (e) { /* fall through */ }
  }
  return nextResolve(specifier, context)
}
