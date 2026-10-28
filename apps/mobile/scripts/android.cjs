const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const homeDirectory = os.homedir();
const env = { ...process.env };
const firstDirectory = candidates => candidates.filter(Boolean).find(candidate => fs.existsSync(candidate));
const directories = parent => {
  if (!fs.existsSync(parent)) return [];
  return fs.readdirSync(parent, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => path.join(parent, entry.name));
};
const studioJava = process.platform === 'darwin'
  ? ['/Applications/Android Studio.app/Contents/jbr/Contents/Home']
  : process.platform === 'win32'
    ? [path.join(env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr')]
    : ['/opt/android-studio/jbr', '/usr/local/android-studio/jbr'];

// Recent Android Studio releases bundle Java 25. Android's Prefab/CMake tooling
// used by this project requires a compatible JDK, so prefer a managed 17 or 21.
const managedRoots = [
  ...directories(path.join(homeDirectory, '.gradle', 'jdks')).flatMap(directory => [directory, ...directories(directory)]),
  ...directories('/Library/Java/JavaVirtualMachines'),
  ...directories(path.join(homeDirectory, 'Library', 'Java', 'JavaVirtualMachines')),
  ...studioJava,
];
const javaCandidates = managedRoots.flatMap(directory => [directory, path.join(directory, 'Contents', 'Home')]);
const javaVersion = directory => {
  const release = path.join(directory, 'release');
  return fs.existsSync(release) ? Number(fs.readFileSync(release, 'utf8').match(/JAVA_VERSION="(\d+)/)?.[1]) : 0;
};
env.JAVA_HOME ||= javaCandidates.find(directory => javaVersion(directory) === 17)
  || javaCandidates.find(directory => javaVersion(directory) === 21);
if (!env.JAVA_HOME) {
  console.error('호환되는 JDK 17 또는 21을 찾을 수 없습니다. JDK를 설치하고 JAVA_HOME을 지정해 주세요.');
  process.exit(1);
}
env.ANDROID_HOME ||= env.ANDROID_SDK_ROOT || firstDirectory([
  path.join(homeDirectory, 'Library', 'Android', 'sdk'),
  path.join(env.LOCALAPPDATA || path.join(homeDirectory, 'AppData', 'Local'), 'Android', 'Sdk'),
  path.join(homeDirectory, 'Android', 'Sdk'),
]);
if (!env.ANDROID_HOME) {
  console.error('Android SDK를 찾을 수 없습니다. Android Studio의 초기 SDK 설치를 완료하거나 ANDROID_HOME을 설정해 주세요.');
  process.exit(1);
}
const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') || 'PATH';
env[pathKey] = [env.JAVA_HOME && path.join(env.JAVA_HOME, 'bin'), path.join(env.ANDROID_HOME, 'platform-tools'), env[pathKey]].filter(Boolean).join(path.delimiter);
const expoCLI = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const child = spawn(process.execPath, [expoCLI, 'run:android', ...process.argv.slice(2)], { cwd: projectRoot, env, stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
