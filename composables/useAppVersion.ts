import pkg from '~/package.json'

export function useAppVersion() {
  const version = pkg.version
  const formattedVersion = () => `v${version}`
  const versionWithLabel = () => `SignFile ${formattedVersion()}`
  return { version, formattedVersion, versionWithLabel }
}
