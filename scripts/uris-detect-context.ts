import fs from 'fs';
import { execSync } from 'child_process';

/* 1) paths/globs 2) conventional commits 3) coverage/sast/perf 요약  */
const files = execSync('git diff --name-only HEAD~1').toString().split('\n');
const msg = execSync('git log -1 --pretty=%s').toString();
const has = (p:string)=>files.some(f=>f.includes(p));

let context:'frontend'|'backend'|'devops'|'security'|'performance'|'architecture'='backend';

if (files.some(f=>f.endsWith('.tsx'))) context='frontend';
if (files.some(f=>f.includes('k8s/')||f.endsWith('.yaml'))) context='devops';
if (/security|auth|sast/i.test(msg)) context='security';
if (/perf|benchmark|metrics/i.test(msg)) context='performance';
// TODO: architecture 힌트 보강

fs.writeFileSync('.collab-msg-context.json', JSON.stringify({context, files}, null, 2));