const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 현재 모바일 앱 디렉토리와 모노레포 루트 디렉토리
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. 모노레포의 모든 패키지 디렉토리를 watch 대상에 추가
config.watchFolders = [monorepoRoot];

// 2. Metro가 모노레포 루트 및 앱의 node_modules에서 패키지를 찾도록 지정
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. 심볼릭 링크 패키지 충돌 방지
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
