import generatePackageJson from 'rollup-plugin-generate-package-json'

import { getBaseRollupPlugins, getPackageJSON, resolvePkgPath } from './utils'

const { name, module } = getPackageJSON('react')
const pkgPath = resolvePkgPath(name)
const pkgDistPath = resolvePkgPath(name, true)

export default [
  // react package
  {
    input: `${pkgPath}/${module}`,
    output: {
      name: 'index.js',
      file: `${pkgDistPath}/index.js`,
      format: 'umd',
      sourcemap: true,
    },
    plugins: [
      ...getBaseRollupPlugins(),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, version, description }) => ({
          name,
          version,
          description,
          main: 'index.js',
        }),
      }),
    ],
  },
  // jsx-runtime package
  {
    input: `${pkgPath}/src/jsx.ts`,
    output: [
      // jsx-runtime
      {
        name: 'jsx-runtime.js',
        file: `${pkgDistPath}/jsx-runtime.js`,
        format: 'umd',
        sourcemap: true,
      },
      // jsx-dev-runtime
      {
        name: 'jsx-dev-runtime.js',
        file: `${pkgDistPath}/jsx-dev-runtime.js`,
        format: 'umd',
        sourcemap: true,
      },
    ],
    plugins: getBaseRollupPlugins(),
  },
]
