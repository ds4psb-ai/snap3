import fs from 'fs';

const ctx = JSON.parse(fs.readFileSync('.collab-msg-context.json','utf8'));
const matrix = JSON.parse(fs.readFileSync('ai-collab/universal/routes/matrix.json','utf8'));
const policy = JSON.parse(fs.readFileSync('ai-collab/universal/learning/policy.json','utf8'));

/* 입력: 각 에이전트가 기록한 confidence (0..1) */
const votes = JSON.parse(fs.readFileSync('.collab-msg-votes.json','utf8')); // {gpt5, claudecode, cursor, t2_t3, terminals}

const weights = matrix[ctx.context];
const score = Object.entries(votes).reduce((s,[k,v])=> s + (weights[k]||0)*v, 0);

let decision = score>=policy.consensus.proceed ? 'PROCEED' : score>=policy.consensus.modify_low ? 'MODIFY' : 'REJECT';

fs.writeFileSync('.collab-msg-decision.json', JSON.stringify({score, decision, context: ctx.context}, null, 2));