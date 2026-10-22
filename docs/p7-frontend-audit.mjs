// Existing Babel only: statically trace mounted React components and shared hooks/forms.
import fs from'node:fs';import path from'node:path';import{createRequire}from'node:module';
const req=createRequire(path.join(process.cwd(),'campus-access-web/package.json')),parser=req('@babel/parser'),traverse=req('@babel/traverse').default;
const nodes=new Map(),byName=new Map(),errors=[];
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(dir,x.name)):/\.(jsx|js)$/.test(x.name)?[path.join(dir,x.name)]:[]);}
function named(p){if(p.isFunctionDeclaration())return p.node.id?.name;if((p.isArrowFunctionExpression()||p.isFunctionExpression())&&p.parentPath.isVariableDeclarator())return p.parentPath.node.id?.name;return null;}
function owner(p,file){let found;for(let a=p.parentPath;a;a=a.parentPath){const n=named(a);if(n)found=file+'#'+n;}return found;}
for(const file of files('campus-access-web/src')){
 let ast;try{ast=parser.parse(fs.readFileSync(file,'utf8'),{sourceType:'module',plugins:['jsx']});}catch(e){errors.push({file,errorType:e.name});continue;}
 traverse(ast,{Function(p){const name=named(p);if(!name||owner(p,file))return;const id=file+'#'+name;nodes.set(id,{file,name,apis:new Set(),calls:new Set()});if(!byName.has(name))byName.set(name,[]);byName.get(name).push(id);}});
 traverse(ast,{MemberExpression(p){const n=nodes.get(owner(p,file));if(n&&p.node.object.name==='api'&&p.node.property.type==='Identifier')n.apis.add(p.node.property.name);},CallExpression(p){const id=owner(p,file),n=nodes.get(id);if(!n)return;const c=p.node.callee;if(c.type==='Identifier')n.calls.add(c.name);},JSXOpeningElement(p){const n=nodes.get(owner(p,file));if(n&&p.node.name.type==='JSXIdentifier')n.calls.add(p.node.name.name);}});
}
const app=fs.readFileSync('campus-access-web/src/App.jsx','utf8'),routes={LoginPage:['/login']};
for(const line of app.split('\n')){const m=line.match(/<Route path="([^"]+)"/);if(m)for(const c of line.matchAll(/<(\w+(?:Page|Dashboard))\b/g))(routes[c[1]]??=[]).push(m[1]);}
const result={};for(const[name,urls]of Object.entries(routes)){
 const seen=new Set();function visit(id){if(seen.has(id))return;seen.add(id);const n=nodes.get(id);if(!n)return;for(const method of n.apis){result[method]??=new Set();for(const u of urls)result[method].add(u);}for(const target of n.calls){const candidates=byName.get(target)||[],local=candidates.filter(x=>nodes.get(x).file===n.file);for(const x of local.length?local:candidates)visit(x);}}
 for(const id of byName.get(name)||[])visit(id);
}
const report={parserVersion:req('@babel/parser/package.json').version,syntaxErrors:errors,functions:nodes.size,mountedComponentRoutes:routes,apiMountedRoutes:Object.fromEntries(Object.entries(result).map(([k,v])=>[k,[...v].sort()])),scope:'static component/hook call graph, not proof of role access or page click tests',pass:errors.length===0};fs.writeFileSync('docs/p7-evidence/frontend-static.json',JSON.stringify(report,null,2));console.log(JSON.stringify({functions:nodes.size,apiMethods:Object.keys(result).length,syntaxErrors:errors.length,pass:report.pass}));if(!report.pass)process.exitCode=1;
