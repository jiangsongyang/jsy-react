import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'

import { getBaseRollupPlugins, getPackageJSON, resolvePkgPath } from './utils'

const { name, module, peerDependencies } = getPackageJSON('react-dom')
const pkgPath = resolvePkgPath(name)
const pkgDistPath = resolvePkgPath(name, true)

export default [
  // react-dom package
  {
    input: `${pkgPath}/${module}`,
    output: [
      {
        name: 'index',
        file: `${pkgDistPath}/index.js`,
        format: 'umd',
        sourcemap: true,
      },
      {
        name: 'client',
        file: `${pkgDistPath}/client.js`,
        format: 'umd',
        sourcemap: true,
      },
    ],
    external: [...Object.keys(peerDependencies)],
    plugins: [
      ...getBaseRollupPlugins(),
      alias({
        entries: {
          'hostConfig': `${pkgPath}/src/hostConfig.ts`,
        },
      }),
      generatePackageJson({
        inputFolder: pkgPath,
        outputFolder: pkgDistPath,
        baseContents: ({ name, version, description }) => ({
          name,
          version,
          description,
          peerDependencies: {
            react: version,
          },
          main: 'index.js',
        }),
      }),
    ],
  },
  // react-test-utils package
  {
    input: `${pkgPath}/test-utils.ts`,
    output: [
      {
        file: `${pkgDistPath}/test-utils.js`,
        name: 'test-utils.js',
        format: 'umd',
      },
    ],
    external: ['react-dom', 'react'],
    plugins: getBaseRollupPlugins(),
  },
]
