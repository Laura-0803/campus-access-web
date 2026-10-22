from pathlib import Path
p=Path(__file__).resolve().parents[1]/'backend/legacy-adapter/server.mjs'
s=p.read_text(encoding='utf-8')
s=s.replace("if(JSON.stringify(old.find(r=>r.id===row.id))===JSON.stringify(row))continue;", "if(JSON.stringify(old.find(r=>r.id===row.id))===JSON.stringify(row)&&old.findIndex(r=>r.id===row.id)===index)continue;")
needle="app.use('/api',async(req,res,next)=>"
if 'let requestLane=' not in s:
 s=s.replace(needle,"let requestLane=Promise.resolve();\napp.use('/api',(req,res,next)=>{const previous=requestLane;let release;requestLane=new Promise(resolve=>release=resolve);previous.then(()=>{if(res.destroyed){release();return;}let done=false;const unlock=()=>{if(!done){done=true;release();}};res.once('finish',unlock);res.once('close',unlock);next();});});\n"+needle)
p.write_text(s,encoding='utf-8')
print('Isolated request ordering and per-row display order updates applied')
