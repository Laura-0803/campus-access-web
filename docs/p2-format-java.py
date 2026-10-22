"""Whitespace-only formatting for the newly created backend; never formats P0/P1."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'backend'
for p in root.rglob('*.java'):
 if 'target' in p.parts:continue
 text=p.read_text(encoding='utf-8');lines=[];line='';indent=0;paren=0;state=None;escape=False;i=0
 def flush():
  global line
  if line.strip():lines.append('  '*max(0,indent)+line.strip())
  line=''
 while i<len(text):
  c=text[i];n=text[i+1] if i+1<len(text) else ''
  if state in ['"',"'"]:
   line+=c
   if escape:escape=False
   elif c=='\\':escape=True
   elif c==state:state=None
  elif state=='//':
   if c=='\n':flush();state=None
   else:line+=c
  elif state=='/*':
   line+=c
   if c=='*' and n=='/':line+='/';i+=1;state=None
  elif c in ['"',"'"]:state=c;line+=c
  elif c=='/' and n in ['/','*']:state='// ' .strip() if n=='/' else '/*';line+=c+n;i+=1
  elif c=='(':paren+=1;line+=c
  elif c==')':paren-=1;line+=c
  elif c=='{':line+=' {';flush();indent+=1
  elif c=='}':flush();indent-=1;line+='}';flush()
  elif c==';':line+=c;flush() if paren==0 else None
  elif c.isspace():
   if line and not line.endswith(' '):line+=' '
  else:line+=c
  i+=1
 flush();p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Formatted formal backend Java sources only')
