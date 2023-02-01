import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

import typescript from '@rollup/plugin-typescript'
import cjs from '@rollup/plugin-commonjs'

import replace from '@rollup/plugin-replace'

const pkgPath = resolve(__dirname, '../../packages')
const distPath = resolve(__dirname, '../../dist/node_modules')

export const resolvePkgPath = (pkgName, isDsit) => {
  if (isDsit) {
    return `${distPath}/${pkgName}`
  }
  return `${pkgPath}/${pkgName}`
}

export const getPackageJSON = pkgName => {
  const path = `${resolvePkgPath(pkgName)}/package.json`
  const str = readFileSync(path, 'utf-8')
  return JSON.parse(str)
}

export const getBaseRollupPlugins = (
  alias = {
    __DEV__: true,
  },
  typescriptOption = {}
) => [replace(alias), cjs(), typescript(typescriptOption)]
