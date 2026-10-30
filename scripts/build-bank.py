from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1]
records=[]
for category,count in [('funny',150),('tricky',150),('general',100),('riddle',100)]:
    rows=[s.strip() for s in (root/'content'/f'{category}.txt').read_text().splitlines() if s.strip() and not s.startswith('#')]
    assert len(rows)==count,(category,len(rows),count)
    for row in rows:
        fields=row.split('|')
        assert len(fields) in [3,4],row
        question,truth,decoys=fields[:3]
        aliases=fields[3].split(';') if len(fields)==4 and fields[3] else []
        records.append(dict(id=hashlib.sha256(question.lower().encode()).hexdigest()[:16],category=category,question=question,truth=truth,aliases=aliases,decoys=decoys.split(';')))
assert len({r['question'].lower() for r in records})==500
(root/'questions.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
(root/'questions.mjs').write_text("import bank from './questions.json' with {type:'json'};\nexport default bank;\n")
print('Question bank:',len(records))
