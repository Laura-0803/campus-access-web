// Executes the unmodified React component and API client against real HTTP services.
// Component renderer is not a browser/visual test; only assertion summaries are persisted.
import fs from 'node:fs';import path from 'node:path';import Module,{createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
const root=process.cwd(),req=createRequire(path.join(root,'campus-access-web/package.json')),cfg=JSON.parse(fs.readFileSync('.p2-local/runtime.json','utf8'));
const reactPath=req.resolve('react'),resolve=Module._resolveFilename;Module._resolveFilename=function(name,...rest){if(name==='react')return reactPath;return resolve.call(this,name,...rest);};
const React=req('react'),Renderer=createRequire(path.join(root,'.p2-local/ui-test/package.json'))('react-test-renderer'),{MemoryRouter}=req('react-router-dom');
const {createServer}=await import(pathToFileURL(path.join(path.dirname(req.resolve('vite/package.json')),'dist/node/index.js')).href);const vite=await createServer({configFile:path.join(root,'campus-access-web/vite.config.js'),root:path.join(root,'campus-access-web'),server:{middlewareMode:true},appType:'custom'});
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};globalThis.window={dispatchEvent:()=>true};globalThis.CustomEvent=class{constructor(type,detail){this.type=type;this.detail=detail;}};
const actualFetch=globalThis.fetch;globalThis.fetch=(url,options)=>actualFetch(typeof url==='string'&&url.startsWith('/api')?'http://127.0.0.1:19800'+url:url,options);
const results=[],output='docs/p2-evidence/react-components-'+Date.now()+'.json';function check(name,ok){results.push({name,pass:!!ok});fs.writeFileSync(output,JSON.stringify({type:'unmodified React component + real HTTP, not browser visual',results},null,2));if(!ok)throw Error(name);}
try{
const {default:Login}=await vite.ssrLoadModule('/src/pages/LoginPage.jsx');let tree,session;
await Renderer.act(async()=>{tree=Renderer.create(React.createElement(MemoryRouter,null,React.createElement(Login,{onLogin:s=>session=s})));});
const inputs=tree.root.findAllByType('input');check('login-rendered',inputs.length>=2);
await Renderer.act(async()=>inputs[0].props.onChange({target:{value:'SYN-STUDENT'}}));
await Renderer.act(async()=>tree.root.findAllByType('input')[1].props.onChange({target:{value:cfg.demoPassword}}));
await Renderer.act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
check('original-login-handler-real-gateway',session?.user.role==='student'&&!!storage.get('campus_token'));
const {api}=await vite.ssrLoadModule('/src/api/client.js');const appointments=await api.appointments();check('original-api-client-legacy-session',Array.isArray(appointments)&&appointments.some(a=>a.hostId==='SYN-P-student'));
await api.logout();let rejected=false;try{await api.appointments();}catch{rejected=true;}check('logout-clears-expired-session',rejected&&!storage.has('campus_token'));
await Renderer.act(async()=>{tree.unmount();tree=Renderer.create(React.createElement(MemoryRouter,null,React.createElement(Login,{onLogin:()=>{}})));});
const buttons=tree.root.findAllByType('button');const forgot=buttons.find(b=>b.children.some(x=>typeof x==='string'&&x.includes('忘记密码')));check('reset-entry-present',!!forgot);await Renderer.act(async()=>forgot.props.onClick());
check('reset-panel-rendered',tree.root.findAllByType('input').length===5);
const mysql=req('mysql2/promise'),db=await mysql.createConnection({host:cfg.host,port:cfg.port,user:cfg.username,password:cfg.password,database:cfg.database});await db.query("DELETE FROM verification_codes WHERE phone IN (?,?)",[cfg.allowedPhones[0],cfg.allowedPhones[10]]);await db.end();
async function input(index,value){await Renderer.act(async()=>tree.root.findAllByType('input')[index].props.onChange({target:{value}}));}
async function clickText(text){const b=tree.root.findAllByType('button').find(b=>b.children.some(x=>typeof x==='string'&&x.includes(text)));if(!b)throw Error('Missing control');await Renderer.act(async()=>b.props.onClick());}
await input(0,'SYN-STUDENT');await input(1,cfg.allowedPhones[0]);await clickText('获取验证码');
let preview=tree.root.findAll(n=>typeof n.type==='function'&&n.type.name==='CaptchaPreview');check('reset-demo-preview-rendered',preview.length===1);
await input(2,preview[0].props.code);await input(3,cfg.demoPassword);await input(4,cfg.demoPassword);await Renderer.act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
check('reset-original-form-real-http',tree.root.findAllByType('input').length===2&&JSON.stringify(tree.toJSON()).includes('密码已重置'));
await clickText('访客注册');
await input(0,'合成页面访客');await input(1,cfg.allowedPhones[10]);await input(2,'990000200001010010');await input(3,'合成测试单位');await clickText('获取验证码');preview=tree.root.findAll(n=>typeof n.type==='function'&&n.type.name==='CaptchaPreview');check('register-demo-preview-rendered',preview.length===1);
await input(4,preview[0].props.code);await input(5,cfg.demoPassword);await input(6,cfg.demoPassword);await Renderer.act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));check('register-original-form-real-http',tree.root.findAllByType('input').length===2&&JSON.stringify(tree.toJSON()).includes('注册成功'));
await clickText('忘记密码');await input(0,'SYN-STUDENT');await input(1,cfg.allowedPhones[0]);
globalThis.fetch=(url,options)=>actualFetch(typeof url==='string'&&url.startsWith('/api')?'http://127.0.0.1:19812'+url:url,options);await clickText('获取验证码');
check('normal-mode-503-visible-without-page-change',JSON.stringify(tree.toJSON()).includes('短信通道未配置')&&tree.root.findAll(n=>typeof n.type==='function'&&n.type.name==='CaptchaPreview').length===0);
console.log(JSON.stringify({evidence:output,assertions:results.length,pass:true}));
}catch(e){console.error(e.message);process.exitCode=1;}finally{await vite.close();}
