(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const N of document.querySelectorAll('link[rel="modulepreload"]'))E(N);new MutationObserver(N=>{for(const U of N)if(U.type==="childList")for(const $ of U.addedNodes)$.tagName==="LINK"&&$.rel==="modulepreload"&&E($)}).observe(document,{childList:!0,subtree:!0});function m(N){const U={};return N.integrity&&(U.integrity=N.integrity),N.referrerPolicy&&(U.referrerPolicy=N.referrerPolicy),N.crossOrigin==="use-credentials"?U.credentials="include":N.crossOrigin==="anonymous"?U.credentials="omit":U.credentials="same-origin",U}function E(N){if(N.ep)return;N.ep=!0;const U=m(N);fetch(N.href,U)}})();const va={LogMessage:0,ChangeZone:1,PlayerName:2,NetworkAbility:21,NetworkAOEAbility:22,ActorControl:33},Lr={Damage:29};function Jr(d){if(!d||d.type!==va.LogMessage)return!1;const o=Number(d.fields[0]);return!Number.isNaN(o)&&o===Lr.Damage}const Al={defeat:new Set(["40000005","4000000F","40000010"]),victory:new Set(["40000002","40000003"])};function ur(d){if(typeof d!="string")return null;const o=d.indexOf("|");if(o<=0)return null;const m=d.slice(0,o);if(!/^\d+$/.test(m))return null;const E=d.split("|");if(E.length<2)return null;const N=$r(E[1]);return{type:Number(m),typeStr:m,timestampMs:N,fields:E.slice(2),raw:d}}function $r(d){if(typeof d!="string")return NaN;const o=d.replace(/(\.\d{3})\d+/,"$1"),m=Date.parse(o);return Number.isNaN(m)?NaN:m}function Qr(d){return!d||d.type!==va.ActorControl?null:d.fields[1]??null}function es(d){const o=Qr(d);return o?Al.defeat.has(o)?"defeat":Al.victory.has(o)?"victory":null:null}const jn={Idle:"idle",Combat:"combat",Defeated:"defeat",Victory:"victory"},ts=5e3;class ns{constructor(o=()=>Date.now()){this._now=o,this.reset()}reset(){this.state=jn.Idle,this.startTimeMs=null,this.endTimeMs=null,this.finalElapsedMs=0,this.lastEndMs=null}get running(){return this.state===jn.Combat}elapsedMs(o){if(this.running){const m=o??this._now();return Math.max(0,m-this.startTimeMs)}return this.finalElapsedMs}handleLine(o){if(!o)return null;if(o.type===va.ChangeZone&&this.state!==jn.Idle)return this.reset(),{kind:"zone-reset"};if(this.running){const m=es(o);if(m){const E=this._now();return this.state=m==="defeat"?jn.Defeated:jn.Victory,this.endTimeMs=E,this.finalElapsedMs=Math.max(0,E-this.startTimeMs),this.lastEndMs=E,{kind:"end",result:m,elapsedMs:this.finalElapsedMs}}return null}if(Jr(o)){const m=this._now();return this.lastEndMs!==null&&m-this.lastEndMs<ts?null:(this.startTimeMs=m,this.state=jn.Combat,{kind:"start"})}return null}}function fl(d){const o=Math.max(0,d),m=Math.floor(o/100),E=m%10,N=Math.floor(m/10),U=N%60;return`${Math.floor(N/60)}:${String(U).padStart(2,"0")}.${E}`}class as{constructor({onLogLine:o,onState:m,onMessageCount:E}){this._onLogLine=o,this._onState=m??(()=>{}),this._onMessageCount=E??(()=>{}),this.ws=null,this.url=null,this._shouldRun=!1,this._retryDelayMs=1e3,this._retryTimer=null}connect(o){this.url=o,this._shouldRun=!0,this._open()}disconnect(){if(this._shouldRun=!1,clearTimeout(this._retryTimer),this.ws){this.ws.onclose=null;try{this.ws.close()}catch{}this.ws=null}this._setState("disconnected")}get connected(){return!!this.ws&&this.ws.readyState===WebSocket.OPEN}_open(){if(!this.url||!this._shouldRun)return;this._setState("connecting");let o;try{o=new WebSocket(this.url)}catch(m){console.error("Invalid websocket URL:",m),this._scheduleRetry();return}this.ws=o,o.onopen=()=>{this._retryDelayMs=1e3,this._msgCount=0,this._onMessageCount(0),this._setState("connected");try{o.send(JSON.stringify({call:"subscribe",events:["LogLine"]}))}catch(m){console.error("Failed to send subscribe:",m)}},o.onmessage=m=>this._handleMessage(m.data),o.onerror=()=>{},o.onclose=()=>{this.ws===o&&(this.ws=null,this._setState("disconnected"),this._shouldRun&&this._scheduleRetry())}}_handleMessage(o){this._msgCount=(this._msgCount??0)+1,this._onMessageCount(this._msgCount);let m=null;const E=typeof o=="string"?o:"";try{const N=JSON.parse(E);N&&typeof N.rawLine=="string"?m=N.rawLine:Array.isArray(N.line)&&N.line.length>=2&&(m=N.line.join("|"))}catch{m=E.includes("|")?E:null}m&&this._onLogLine?(this._badMsgs=0,this._onLogLine(m)):(this._badMsgs=(this._badMsgs??0)+1,(this._badMsgs===1||this._badMsgs%500===0)&&console.warn(`[ws] ${this._badMsgs} message(s) without a usable line:`,String(o).slice(0,160)))}_scheduleRetry(){clearTimeout(this._retryTimer),this._setState("reconnecting");const o=this._retryDelayMs;this._retryDelayMs=Math.min(this._retryDelayMs*2,1e4),console.warn(`[ws] reconnecting in ${o}ms`,new Date().toISOString()),this._retryTimer=setTimeout(()=>this._open(),o)}_setState(o){if(this._lastState!==o){const m=this._lastState??"idle";console.info(`[ws] ${m} -> ${o}`,new Date().toISOString()),this._lastState=o,this._onState(o)}}}const ls=/^[0-9a-fA-F]{4,8}$/i,rs=1e3;function ss(){let d=null;return function(m){if(m.type!==va.NetworkAbility&&m.type!==va.NetworkAOEAbility)return null;const E=m.fields;if(E.length!==53)return null;const N=E[E.length-11];if(!ls.test(N))return null;const U=Number.parseInt(N,16);if(d===null||U<=d)return d=U,null;const $=U-d;return d=U,$<=1?null:{kind:$>=rs?"base-reset":"gap",from:d-$,to:U,jump:$,timestampMs:m.timestampMs}}}function os(d){return d&&d.__esModule&&Object.prototype.hasOwnProperty.call(d,"default")?d.default:d}var Qt={},an={},Tt={},qt={},ml;function wn(){if(ml)return qt;ml=1;const d={},{LUA_VERSION_MAJOR:o,LUA_VERSION_MINOR:m,to_luastring:E}=rn(),N=";";qt.LUA_PATH_SEP=N;const U="?";qt.LUA_PATH_MARK=U;const $="!";qt.LUA_EXEC_DIR=$;const ge=o+"."+m;qt.LUA_VDIR=ge;{qt.LUA_DIRSEP="/";const R="./lua/"+ge+"/";qt.LUA_LDIR=R;const Oe=R;qt.LUA_JSDIR=Oe;const me=E(R+"?.lua;"+R+"?/init.lua;./?.lua;./?/init.lua");qt.LUA_PATH_DEFAULT=me;const W=E(Oe+"?.js;"+Oe+"loadall.js;./?.js");qt.LUA_JSPATH_DEFAULT=W}const ie=d.LUA_COMPAT_FLOATSTRING||!1,Se=2147483647,q=-2147483648,Z=d.LUAI_MAXSTACK||1e6,Q=d.LUA_IDSIZE||59,Te=function(ae){return String(ae)},J=function(ae){return String(Number(ae.toPrecision(14)))},Me=function(ae){return ae>=q&&ae<-q?ae:!1},Le="",ye="",Ke=`%${Le}d`,ut="%.14g",Re=function(){return 46},Ue=d.LUAL_BUFFERSIZE||8192,Pe=function(ae){if(ae===0)return[ae,0];var R=new DataView(new ArrayBuffer(8));R.setFloat64(0,ae);var Oe=R.getUint32(0)>>>20&2047;Oe===0&&(R.setFloat64(0,ae*Math.pow(2,64)),Oe=(R.getUint32(0)>>>20&2047)-64);var me=Oe-1022,W=ce(ae,-me);return[W,me]},ce=function(ae,R){for(var Oe=Math.min(3,Math.ceil(Math.abs(R)/1023)),me=ae,W=0;W<Oe;W++)me*=Math.pow(2,Math.floor((R+W)/Oe));return me};return qt.LUAI_MAXSTACK=Z,qt.LUA_COMPAT_FLOATSTRING=ie,qt.LUA_IDSIZE=Q,qt.LUA_INTEGER_FMT=Ke,qt.LUA_INTEGER_FRMLEN=Le,qt.LUA_MAXINTEGER=Se,qt.LUA_MININTEGER=q,qt.LUA_NUMBER_FMT=ut,qt.LUA_NUMBER_FRMLEN=ye,qt.LUAL_BUFFERSIZE=Ue,qt.frexp=Pe,qt.ldexp=ce,qt.lua_getlocaledecpoint=Re,qt.lua_integer2str=Te,qt.lua_number2str=J,qt.lua_numbertointeger=Me,qt}var bl;function rn(){if(bl)return Tt;bl=1;let d;typeof Uint8Array.from=="function"?d=Uint8Array.from.bind(Uint8Array):d=function(we){let K=0,I=we.length,O=new Uint8Array(I);for(;I>K;)O[K]=we[K++];return O};let o;if(typeof new Uint8Array().indexOf=="function")o=function(we,K,I){return we.indexOf(K,I)};else{let we=[].indexOf;if(we.call(new Uint8Array(1),0)!==0)throw Error("missing .indexOf");o=function(K,I,O){return we.call(K,I,O)}}let m;typeof Uint8Array.of=="function"?m=Uint8Array.of.bind(Uint8Array):m=function(){return d(arguments)};const E=function(we){return we instanceof Uint8Array},N=function(we,K){if(we!==K){let I=we.length;if(I!==K.length)return!1;for(let O=0;O<I;O++)if(we[O]!==K[O])return!1}return!0},U="cannot convert invalid utf8 to javascript string",$=function(we,K,I,O){if(!E(we))throw new TypeError("to_jsstring expects a Uint8Array");I===void 0?I=we.length:I=Math.min(we.length,I);let A="";for(let g=K!==void 0?K:0;g<I;){let v=we[g++];if(v<128)A+=String.fromCharCode(v);else if(v<194||v>244){if(!O)throw RangeError(U);A+="�"}else if(v<=223){if(g>=I){if(!O)throw RangeError(U);A+="�";continue}let B=we[g++];if((B&192)!==128){if(!O)throw RangeError(U);A+="�";continue}A+=String.fromCharCode(((v&31)<<6)+(B&63))}else if(v<=239){if(g+1>=I){if(!O)throw RangeError(U);A+="�";continue}let B=we[g++];if((B&192)!==128){if(!O)throw RangeError(U);A+="�";continue}let ue=we[g++];if((ue&192)!==128){if(!O)throw RangeError(U);A+="�";continue}let ot=((v&15)<<12)+((B&63)<<6)+(ue&63);if(ot<=65535)A+=String.fromCharCode(ot);else{ot-=65536;let st=(ot>>10)+55296,Fe=ot%1024+56320;A+=String.fromCharCode(st,Fe)}}else{if(g+2>=I){if(!O)throw RangeError(U);A+="�";continue}let B=we[g++];if((B&192)!==128){if(!O)throw RangeError(U);A+="�";continue}let ue=we[g++];if((ue&192)!==128){if(!O)throw RangeError(U);A+="�";continue}let ot=we[g++];if((ot&192)!==128){if(!O)throw RangeError(U);A+="�";continue}let st=((v&7)<<18)+((B&63)<<12)+((ue&63)<<6)+(ot&63);st-=65536;let Fe=(st>>10)+55296,y=st%1024+56320;A+=String.fromCharCode(Fe,y)}}return A},ge=";,/?:@&=+$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,-_.!~*'()#".split("").reduce(function(we,K){return we[K.charCodeAt(0)]=!0,we},{}),ie=function(we){if(!E(we))throw new TypeError("to_uristring expects a Uint8Array");let K="";for(let I=0;I<we.length;I++){let O=we[I];ge[O]?K+=String.fromCharCode(O):K+="%"+(O<16?"0":"")+O.toString(16)}return K},Se={},q=function(we,K){if(typeof we!="string")throw new TypeError("to_luastring expects a javascript string");if(K){let g=Se[we];if(E(g))return g}let I=we.length,O=Array(I),A=0;for(let g=0;g<I;++g){let v=we.charCodeAt(g);if(v<=127)O[A++]=v;else if(v<=2047)O[A++]=192|v>>6,O[A++]=128|v&63;else{if(v>=55296&&v<=56319&&g+1<I){let B=we.charCodeAt(g+1);B>=56320&&B<=57343&&(g++,v=(v-55296)*1024+B+9216)}v<=65535?(O[A++]=224|v>>12,O[A++]=128|v>>6&63,O[A++]=128|v&63):(O[A++]=240|v>>18,O[A++]=128|v>>12&63,O[A++]=128|v>>6&63,O[A++]=128|v&63)}}return O=d(O),K&&(Se[we]=O),O},Z=function(we){if(!E(we))if(typeof we=="string")we=q(we);else throw new TypeError("expects an array of bytes or javascript string");return we};Tt.luastring_from=d,Tt.luastring_indexOf=o,Tt.luastring_of=m,Tt.is_luastring=E,Tt.luastring_eq=N,Tt.to_jsstring=$,Tt.to_uristring=ie,Tt.to_luastring=q,Tt.from_userstring=Z;const Q=q("\x1BLua"),Te="5",J="3",Me=503,Le="4",ye="Lua "+Te+"."+J,Ke=ye+"."+Le,ut=Ke+"  Copyright (C) 1994-2017 Lua.org, PUC-Rio",Re="R. Ierusalimschy, L. H. de Figueiredo, W. Celes";Tt.LUA_SIGNATURE=Q,Tt.LUA_VERSION_MAJOR=Te,Tt.LUA_VERSION_MINOR=J,Tt.LUA_VERSION_NUM=Me,Tt.LUA_VERSION_RELEASE=Le,Tt.LUA_VERSION=ye,Tt.LUA_RELEASE=Ke,Tt.LUA_COPYRIGHT=ut,Tt.LUA_AUTHORS=Re;const Ue={LUA_OK:0,LUA_YIELD:1,LUA_ERRRUN:2,LUA_ERRSYNTAX:3,LUA_ERRMEM:4,LUA_ERRGCMM:5,LUA_ERRERR:6},Pe={LUA_TNONE:-1,LUA_TNIL:0,LUA_TBOOLEAN:1,LUA_TLIGHTUSERDATA:2,LUA_TNUMBER:3,LUA_TSTRING:4,LUA_TTABLE:5,LUA_TFUNCTION:6,LUA_TUSERDATA:7,LUA_TTHREAD:8,LUA_NUMTAGS:9};Pe.LUA_TSHRSTR=Pe.LUA_TSTRING|0,Pe.LUA_TLNGSTR=Pe.LUA_TSTRING|16,Pe.LUA_TNUMFLT=Pe.LUA_TNUMBER|0,Pe.LUA_TNUMINT=Pe.LUA_TNUMBER|16,Pe.LUA_TLCL=Pe.LUA_TFUNCTION|0,Pe.LUA_TLCF=Pe.LUA_TFUNCTION|16,Pe.LUA_TCCL=Pe.LUA_TFUNCTION|32;const ce=0,ae=1,R=2,Oe=3,me=4,W=5,_e=6,H=7,D=8,Ce=9,ve=10,ze=11,de=12,Ye=13,Je=0,x=1,Y=2,X=20,{LUAI_MAXSTACK:he}=wn(),ee=-he-1e3,ne=function(we){return ee-we},je=1,nt=2,at=nt;class ft{constructor(){this.event=NaN,this.name=null,this.namewhat=null,this.what=null,this.source=null,this.currentline=NaN,this.linedefined=NaN,this.lastlinedefined=NaN,this.nups=NaN,this.nparams=NaN,this.isvararg=NaN,this.istailcall=NaN,this.short_src=null,this.i_ci=null}}const ct=0,ht=1,pt=2,Et=3,bt=4,Ze=1<<ct,St=1<<ht,tt=1<<pt,gt=1<<Et;return Tt.LUA_HOOKCALL=ct,Tt.LUA_HOOKCOUNT=Et,Tt.LUA_HOOKLINE=pt,Tt.LUA_HOOKRET=ht,Tt.LUA_HOOKTAILCALL=bt,Tt.LUA_MASKCALL=Ze,Tt.LUA_MASKCOUNT=gt,Tt.LUA_MASKLINE=tt,Tt.LUA_MASKRET=St,Tt.LUA_MINSTACK=X,Tt.LUA_MULTRET=-1,Tt.LUA_OPADD=ce,Tt.LUA_OPBAND=H,Tt.LUA_OPBNOT=Ye,Tt.LUA_OPBOR=D,Tt.LUA_OPBXOR=Ce,Tt.LUA_OPDIV=W,Tt.LUA_OPEQ=Je,Tt.LUA_OPIDIV=_e,Tt.LUA_OPLE=Y,Tt.LUA_OPLT=x,Tt.LUA_OPMOD=Oe,Tt.LUA_OPMUL=R,Tt.LUA_OPPOW=me,Tt.LUA_OPSHL=ve,Tt.LUA_OPSHR=ze,Tt.LUA_OPSUB=ae,Tt.LUA_OPUNM=de,Tt.LUA_REGISTRYINDEX=ee,Tt.LUA_RIDX_GLOBALS=nt,Tt.LUA_RIDX_LAST=at,Tt.LUA_RIDX_MAINTHREAD=je,Tt.constant_types=Pe,Tt.lua_Debug=ft,Tt.lua_upvalueindex=ne,Tt.thread_status=Ue,Tt}var Tl;function In(){if(Tl)return an;Tl=1;const d=rn(),o="0",m="1",E=1,N="5",U="Fengari "+o+"."+m,$=U+"."+N,ge="B. Giannangeli, Daurnimator",ie=$+"  Copyright (C) 2017-2019 "+ge+`
Based on: `+d.LUA_COPYRIGHT;return an.FENGARI_AUTHORS=ge,an.FENGARI_COPYRIGHT=ie,an.FENGARI_RELEASE=$,an.FENGARI_VERSION=U,an.FENGARI_VERSION_MAJOR=o,an.FENGARI_VERSION_MINOR=m,an.FENGARI_VERSION_NUM=E,an.FENGARI_VERSION_RELEASE=N,an.is_luastring=d.is_luastring,an.luastring_eq=d.luastring_eq,an.luastring_from=d.luastring_from,an.luastring_indexOf=d.luastring_indexOf,an.luastring_of=d.luastring_of,an.to_jsstring=d.to_jsstring,an.to_luastring=d.to_luastring,an.to_uristring=d.to_uristring,an.from_userstring=d.from_userstring,an}var j={},Ge={},na={},El;function yn(){if(El)return na;El=1;const d=function(ge){if(!ge)throw Error("assertion failed")};na.lua_assert=d;const o=function(ge,ie,Se){if(!ie)throw Error(Se)};na.api_check=o;const m=200;na.LUAI_MAXCCALLS=m;const E=32;na.LUA_MINBUFFER=E;const N=function(ge,ie,Se){let q=ie%Se;return q*Se<0&&(q+=Se),q};na.luai_nummod=N;const U=2147483647;na.MAX_INT=U;const $=-2147483648;return na.MIN_INT=$,na}var ln={},en={},aa={},Yt={},_a={},kl;function cr(){if(kl)return _a;kl=1;const{luastring_of:d}=rn(),o=d(0,0,0,0,0,0,0,0,0,0,8,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,22,22,22,22,22,22,22,22,22,22,4,4,4,4,4,4,4,21,21,21,21,21,21,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,5,4,21,21,21,21,21,21,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),m=0,E=1,N=2,U=3,$=4,ge=function(Te){return(o[Te+1]&1<<E)!==0},ie=function(Te){return(o[Te+1]&1<<$)!==0},Se=function(Te){return(o[Te+1]&1<<N)!==0},q=function(Te){return(o[Te+1]&1<<U)!==0},Z=function(Te){return(o[Te+1]&1<<m)!==0},Q=function(Te){return(o[Te+1]&(1<<m|1<<E))!==0};return _a.lisdigit=ge,_a.lislalnum=Q,_a.lislalpha=Z,_a.lisprint=Se,_a.lisspace=q,_a.lisxdigit=ie,_a}var tn={},Rn={},la={},Ol;function ra(){if(Ol)return la;Ol=1;const{is_luastring:d,luastring_eq:o,luastring_from:m,to_luastring:E}=rn(),{lua_assert:N}=yn();class U{constructor(Te,J){this.hash=null,this.realstring=J}getstr(){return this.realstring}tsslen(){return this.realstring.length}}const $=function(Q,Te){return N(Q instanceof U),N(Te instanceof U),Q==Te||o(Q.realstring,Te.realstring)},ge=function(Q){N(d(Q));let Te=Q.length,J="|";for(let Me=0;Me<Te;Me++)J+=Q[Me].toString(16);return J},ie=function(Q){return N(Q instanceof U),Q.hash===null&&(Q.hash=ge(Q.getstr())),Q.hash},Se=function(Q,Te){return N(Te instanceof Uint8Array),new U(Q,Te)},q=function(Q,Te){return Se(Q,m(Te))},Z=function(Q,Te){return Se(Q,E(Te))};return la.luaS_eqlngstr=$,la.luaS_hash=ge,la.luaS_hashlongstr=ie,la.luaS_bless=Se,la.luaS_new=q,la.luaS_newliteral=Z,la.TString=U,la}var vl;function sa(){if(vl)return Rn;vl=1;const{constant_types:{LUA_TBOOLEAN:d,LUA_TCCL:o,LUA_TLCF:m,LUA_TLCL:E,LUA_TLIGHTUSERDATA:N,LUA_TLNGSTR:U,LUA_TNIL:$,LUA_TNUMFLT:ge,LUA_TNUMINT:ie,LUA_TSHRSTR:Se,LUA_TTABLE:q,LUA_TTHREAD:Z,LUA_TUSERDATA:Q},to_luastring:Te}=rn(),{LUA_MAXINTEGER:J}=wn(),{lua_assert:Me}=yn(),Le=pa(),ye=Mn(),{luaS_hashlongstr:Ke,TString:ut}=ra(),Re=ha();let Ue=new WeakMap;const Pe=function(x){let Y=Ue.get(x);return Y||(Y={},Ue.set(x,Y)),Y},ce=function(x,Y){switch(Y.type){case $:return Le.luaG_runerror(x,Te("table index is nil",!0));case ge:if(isNaN(Y.value))return Le.luaG_runerror(x,Te("table index is NaN",!0));case ie:case d:case q:case E:case m:case o:case Q:case Z:return Y.value;case Se:case U:return Ke(Y.tsvalue());case N:{let X=Y.value;switch(typeof X){case"string":return"*"+X;case"number":return"#"+X;case"boolean":return X?"?true":"?false";case"function":return Pe(X);case"object":if(X instanceof Re.lua_State&&X.l_G===x.l_G||X instanceof ae||X instanceof ye.Udata||X instanceof ye.LClosure||X instanceof ye.CClosure)return Pe(X);default:return X}}default:throw new Error("unknown key type: "+Y.type)}};class ae{constructor(Y){this.id=Y.l_G.id_counter++,this.strong=new Map,this.dead_strong=new Map,this.dead_weak=void 0,this.f=void 0,this.l=void 0,this.metatable=null,this.flags=-1}}const R=function(x){x.flags=0},Oe=function(x,Y,X,he){x.dead_strong.clear(),x.dead_weak=void 0;let ee=null,ne={key:X,value:he,p:ee=x.l,n:void 0};x.f||(x.f=ne),ee&&(ee.n=ne),x.strong.set(Y,ne),x.l=ne},me=function(x){return typeof x=="object"?x!==null:typeof x=="function"},W=function(x,Y){let X=x.strong.get(Y);if(X){X.key.setdeadvalue(),X.value=void 0;let he=X.n,ee=X.p;X.p=void 0,ee&&(ee.n=he),he&&(he.p=ee),x.f===X&&(x.f=he),x.l===X&&(x.l=ee),x.strong.delete(Y),me(Y)?(x.dead_weak||(x.dead_weak=new WeakMap),x.dead_weak.set(Y,X)):x.dead_strong.set(Y,X)}},_e=function(x){return new ae(x)},H=function(x,Y){let X=x.strong.get(Y);return X?X.value:ye.luaO_nilobject},D=function(x,Y){return Me(typeof Y=="number"&&(Y|0)===Y),H(x,Y)},Ce=function(x,Y){return Me(Y instanceof ut),H(x,Ke(Y))},ve=function(x,Y,X){return Me(X instanceof ye.TValue),X.ttisnil()||X.ttisfloat()&&isNaN(X.value)?ye.luaO_nilobject:H(Y,ce(x,X))},ze=function(x,Y,X){Me(typeof Y=="number"&&(Y|0)===Y&&X instanceof ye.TValue);let he=Y;if(X.ttisnil()){W(x,he);return}let ee=x.strong.get(he);if(ee)ee.value.setfrom(X);else{let ne=new ye.TValue(ie,Y),je=new ye.TValue(X.type,X.value);Oe(x,he,ne,je)}},de=function(x,Y,X,he){Me(X instanceof ye.TValue);let ee=ce(x,X);if(he.ttisnil()){W(Y,ee);return}let ne=Y.strong.get(ee);if(ne)ne.value.setfrom(he);else{let je,nt=X.value;X.ttisfloat()&&(nt|0)===nt?je=new ye.TValue(ie,nt):je=new ye.TValue(X.type,nt);let at=new ye.TValue(he.type,he.value);Oe(Y,ee,je,at)}},Ye=function(x){let Y=0,X=x.strong.size+1;for(;!D(x,X).ttisnil();){if(Y=X,X>J/2){for(Y=1;!D(x,Y).ttisnil();)Y++;return Y-1}X*=2}for(;X-Y>1;){let he=Math.floor((Y+X)/2);D(x,he).ttisnil()?X=he:Y=he}return Y},Je=function(x,Y,X){let he=x.stack[X],ee;if(he.type===$){if(ee=Y.f,!ee)return!1}else{let ne=ce(x,he);if(ee=Y.strong.get(ne),ee){if(ee=ee.n,!ee)return!1}else{if(ee=Y.dead_weak&&Y.dead_weak.get(ne)||Y.dead_strong.get(ne),!ee)return Le.luaG_runerror(x,Te("invalid key to 'next'"));do if(ee=ee.n,!ee)return!1;while(ee.key.ttisdeadkey())}}return ye.setobj2s(x,X,ee.key),ye.setobj2s(x,X+1,ee.value),!0};return Rn.invalidateTMcache=R,Rn.luaH_get=ve,Rn.luaH_getint=D,Rn.luaH_getn=Ye,Rn.luaH_getstr=Ce,Rn.luaH_setfrom=de,Rn.luaH_setint=ze,Rn.luaH_new=_e,Rn.luaH_next=Je,Rn.Table=ae,Rn}var vn={},$t={},mt={},wl;function xa(){if(wl)return mt;wl=1;const d=["MOVE","LOADK","LOADKX","LOADBOOL","LOADNIL","GETUPVAL","GETTABUP","GETTABLE","SETTABUP","SETUPVAL","SETTABLE","NEWTABLE","SELF","ADD","SUB","MUL","MOD","POW","DIV","IDIV","BAND","BOR","BXOR","SHL","SHR","UNM","BNOT","NOT","LEN","CONCAT","JMP","EQ","LT","LE","TEST","TESTSET","CALL","TAILCALL","RETURN","FORLOOP","FORPREP","TFORCALL","TFORLOOP","SETLIST","CLOSURE","VARARG","EXTRAARG"],o={OP_MOVE:0,OP_LOADK:1,OP_LOADKX:2,OP_LOADBOOL:3,OP_LOADNIL:4,OP_GETUPVAL:5,OP_GETTABUP:6,OP_GETTABLE:7,OP_SETTABUP:8,OP_SETUPVAL:9,OP_SETTABLE:10,OP_NEWTABLE:11,OP_SELF:12,OP_ADD:13,OP_SUB:14,OP_MUL:15,OP_MOD:16,OP_POW:17,OP_DIV:18,OP_IDIV:19,OP_BAND:20,OP_BOR:21,OP_BXOR:22,OP_SHL:23,OP_SHR:24,OP_UNM:25,OP_BNOT:26,OP_NOT:27,OP_LEN:28,OP_CONCAT:29,OP_JMP:30,OP_EQ:31,OP_LT:32,OP_LE:33,OP_TEST:34,OP_TESTSET:35,OP_CALL:36,OP_TAILCALL:37,OP_RETURN:38,OP_FORLOOP:39,OP_FORPREP:40,OP_TFORCALL:41,OP_TFORLOOP:42,OP_SETLIST:43,OP_CLOSURE:44,OP_VARARG:45,OP_EXTRAARG:46},m=0,E=1,N=2,U=3,$=0,ge=1,ie=2,Se=3,q=[64|N<<4|m<<2|$,64|U<<4|m<<2|ge,64|m<<4|m<<2|ge,64|E<<4|E<<2|$,64|E<<4|m<<2|$,64|E<<4|m<<2|$,64|E<<4|U<<2|$,64|N<<4|U<<2|$,0|U<<4|U<<2|$,0|E<<4|m<<2|$,0|U<<4|U<<2|$,64|E<<4|E<<2|$,64|N<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|U<<4|U<<2|$,64|N<<4|m<<2|$,64|N<<4|m<<2|$,64|N<<4|m<<2|$,64|N<<4|m<<2|$,64|N<<4|N<<2|$,0|N<<4|m<<2|ie,128|U<<4|U<<2|$,128|U<<4|U<<2|$,128|U<<4|U<<2|$,128|m<<4|E<<2|$,192|N<<4|E<<2|$,64|E<<4|E<<2|$,64|E<<4|E<<2|$,0|E<<4|m<<2|$,64|N<<4|m<<2|ie,64|N<<4|m<<2|ie,0|m<<4|E<<2|$,64|N<<4|m<<2|ie,0|E<<4|E<<2|$,64|E<<4|m<<2|ge,64|E<<4|m<<2|$,0|E<<4|E<<2|Se],Z=function(g){return q[g]&3},Q=function(g){return q[g]>>4&3},Te=function(g){return q[g]>>2&3},J=function(g){return q[g]&64},Me=function(g){return q[g]&128},Le=9,ye=9,Ke=Le+ye,ut=8,Re=Le+ye+ut,Ue=6,Pe=0,ce=Pe+Ue,ae=ce+ut,R=ae+Le,Oe=ae,me=ce,W=(1<<Ke)-1,_e=W>>1,H=(1<<Re)-1,D=(1<<ut)-1,Ce=(1<<ye)-1,ve=(1<<Le)-1,ze=1<<ye-1,de=ze-1,Ye=D,Je=function(g){return g&ze},x=function(g){return g&~ze},Y=function(g){return g|ze},X=function(g,v){return~(-1<<g)<<v},he=function(g,v){return~X(g,v)},ee=function(g){return g.opcode},ne=function(g,v){return g.code=g.code&he(Ue,Pe)|v<<Pe&X(Ue,Pe),we(g)},je=function(g,v,B,ue){return g.code=g.code&he(ue,B)|v<<B&X(ue,B),we(g)},nt=function(g){return g.A},at=function(g,v){return je(g,v,ce,ut)},ft=function(g){return g.B},ct=function(g,v){return je(g,v,R,ye)},ht=function(g){return g.C},pt=function(g,v){return je(g,v,ae,Le)},Et=function(g){return g.Bx},bt=function(g,v){return je(g,v,Oe,Ke)},Ze=function(g){return g.Ax},St=function(g,v){return je(g,v,me,Re)},tt=function(g){return g.sBx},gt=function(g,v){return bt(g,v+_e)},we=function(g){if(typeof g=="number")return{code:g,opcode:g>>Pe&X(Ue,0),A:g>>ce&X(ut,0),B:g>>R&X(ye,0),C:g>>ae&X(Le,0),Bx:g>>Oe&X(Ke,0),Ax:g>>me&X(Re,0),sBx:(g>>Oe&X(Ke,0))-_e};{let v=g.code;return g.opcode=v>>Pe&X(Ue,0),g.A=v>>ce&X(ut,0),g.B=v>>R&X(ye,0),g.C=v>>ae&X(Le,0),g.Bx=v>>Oe&X(Ke,0),g.Ax=v>>me&X(Re,0),g.sBx=(v>>Oe&X(Ke,0))-_e,g}},K=function(g,v,B,ue){return we(g<<Pe|v<<ce|B<<R|ue<<ae)},I=function(g,v,B){return we(g<<Pe|v<<ce|B<<Oe)},O=function(g,v){return we(g<<Pe|v<<me)},A=50;return mt.BITRK=ze,mt.CREATE_ABC=K,mt.CREATE_ABx=I,mt.CREATE_Ax=O,mt.GET_OPCODE=ee,mt.GETARG_A=nt,mt.GETARG_B=ft,mt.GETARG_C=ht,mt.GETARG_Bx=Et,mt.GETARG_Ax=Ze,mt.GETARG_sBx=tt,mt.INDEXK=x,mt.ISK=Je,mt.LFIELDS_PER_FLUSH=A,mt.MAXARG_A=D,mt.MAXARG_Ax=H,mt.MAXARG_B=Ce,mt.MAXARG_Bx=W,mt.MAXARG_C=ve,mt.MAXARG_sBx=_e,mt.MAXINDEXRK=de,mt.NO_REG=Ye,mt.OpArgK=U,mt.OpArgN=m,mt.OpArgR=N,mt.OpArgU=E,mt.OpCodes=d,mt.OpCodesI=o,mt.POS_A=ce,mt.POS_Ax=me,mt.POS_B=R,mt.POS_Bx=Oe,mt.POS_C=ae,mt.POS_OP=Pe,mt.RKASK=Y,mt.SETARG_A=at,mt.SETARG_Ax=St,mt.SETARG_B=ct,mt.SETARG_Bx=bt,mt.SETARG_C=pt,mt.SETARG_sBx=gt,mt.SET_OPCODE=ne,mt.SIZE_A=ut,mt.SIZE_Ax=Re,mt.SIZE_B=ye,mt.SIZE_Bx=Ke,mt.SIZE_C=Le,mt.SIZE_OP=Ue,mt.fullins=we,mt.getBMode=Q,mt.getCMode=Te,mt.getOpMode=Z,mt.iABC=$,mt.iABx=ge,mt.iAsBx=ie,mt.iAx=Se,mt.testAMode=J,mt.testTMode=Me,mt}var yl;function Ra(){if(yl)return $t;yl=1;const{LUA_MASKLINE:d,LUA_MASKCOUNT:o,LUA_MULTRET:m,constant_types:{LUA_TBOOLEAN:E,LUA_TLCF:N,LUA_TLIGHTUSERDATA:U,LUA_TLNGSTR:$,LUA_TNIL:ge,LUA_TNUMBER:ie,LUA_TNUMFLT:Se,LUA_TNUMINT:q,LUA_TSHRSTR:Z,LUA_TTABLE:Q,LUA_TUSERDATA:Te},to_luastring:J}=rn(),{INDEXK:Me,ISK:Le,LFIELDS_PER_FLUSH:ye,OpCodesI:{OP_ADD:Ke,OP_BAND:ut,OP_BNOT:Re,OP_BOR:Ue,OP_BXOR:Pe,OP_CALL:ce,OP_CLOSURE:ae,OP_CONCAT:R,OP_DIV:Oe,OP_EQ:me,OP_EXTRAARG:W,OP_FORLOOP:_e,OP_FORPREP:H,OP_GETTABLE:D,OP_GETTABUP:Ce,OP_GETUPVAL:ve,OP_IDIV:ze,OP_JMP:de,OP_LE:Ye,OP_LEN:Je,OP_LOADBOOL:x,OP_LOADK:Y,OP_LOADKX:X,OP_LOADNIL:he,OP_LT:ee,OP_MOD:ne,OP_MOVE:je,OP_MUL:nt,OP_NEWTABLE:at,OP_NOT:ft,OP_POW:ct,OP_RETURN:ht,OP_SELF:pt,OP_SETLIST:Et,OP_SETTABLE:bt,OP_SETTABUP:Ze,OP_SETUPVAL:St,OP_SHL:tt,OP_SHR:gt,OP_SUB:we,OP_TAILCALL:K,OP_TEST:I,OP_TESTSET:O,OP_TFORCALL:A,OP_TFORLOOP:g,OP_UNM:v,OP_VARARG:B}}=xa(),{LUA_MAXINTEGER:ue,LUA_MININTEGER:ot,lua_numbertointeger:st}=wn(),{lua_assert:Fe,luai_nummod:y}=yn(),V=Mn(),Ae=Ma(),De=ha(),{luaS_bless:qe,luaS_eqlngstr:_,luaS_hashlongstr:te}=ra(),P=Yn(),se=Ia(),Ne=sa(),it=pa(),Qe=function(f){let G=f.ci,be=G.l_base,pe=G.l_code[G.l_savedpc-1],Xe=pe.opcode;switch(Xe){case Ke:case we:case nt:case Oe:case ze:case ut:case Ue:case Pe:case tt:case gt:case ne:case ct:case v:case Re:case Je:case Ce:case D:case pt:{V.setobjs2s(f,be+pe.A,f.top-1),delete f.stack[--f.top];break}case Ye:case ee:case me:{let ke=!f.stack[f.top-1].l_isfalse();delete f.stack[--f.top],G.callstatus&De.CIST_LEQ&&(Fe(Xe===Ye),G.callstatus^=De.CIST_LEQ,ke=!ke),Fe(G.l_code[G.l_savedpc].opcode===de),ke!==!!pe.A&&G.l_savedpc++;break}case R:{let ke=f.top-1,Ie=pe.B,Mt=ke-1-(be+Ie);V.setobjs2s(f,ke-2,ke),Mt>1&&(f.top=ke-1,Bt(f,Mt)),V.setobjs2s(f,G.l_base+pe.A,f.top-1),P.adjust_top(f,G.top);break}case A:{Fe(G.l_code[G.l_savedpc].opcode===g),P.adjust_top(f,G.top);break}case ce:{pe.C-1>=0&&P.adjust_top(f,G.top);break}}},Rt=function(f,G,be){return G+be.A},kt=function(f,G,be){return G+be.B},yt=function(f,G,be,pe){return Le(pe.B)?be[Me(pe.B)]:f.stack[G+pe.B]},vt=function(f,G,be,pe){return Le(pe.C)?be[Me(pe.C)]:f.stack[G+pe.C]},Wt=function(f){let G=f.ci;G.callstatus|=De.CIST_FRESH;e:for(;;){Fe(G===f.ci);let be=G.func.value,pe=be.p.k,Xe=G.l_base,ke=G.l_code[G.l_savedpc++];f.hookmask&(d|o)&&it.luaG_traceexec(f);let Ie=Rt(f,Xe,ke);switch(ke.opcode){case je:{V.setobjs2s(f,Ie,kt(f,Xe,ke));break}case Y:{let le=pe[ke.Bx];V.setobj2s(f,Ie,le);break}case X:{Fe(G.l_code[G.l_savedpc].opcode===W);let le=pe[G.l_code[G.l_savedpc++].Ax];V.setobj2s(f,Ie,le);break}case x:{f.stack[Ie].setbvalue(ke.B!==0),ke.C!==0&&G.l_savedpc++;break}case he:{for(let le=0;le<=ke.B;le++)f.stack[Ie+le].setnilvalue();break}case ve:{let le=ke.B;V.setobj2s(f,Ie,be.upvals[le]);break}case Ce:{let le=be.upvals[ke.B],Be=vt(f,Xe,pe,ke);sn(f,le,Be,Ie);break}case D:{let le=f.stack[kt(f,Xe,ke)],Be=vt(f,Xe,pe,ke);sn(f,le,Be,Ie);break}case Ze:{let le=be.upvals[ke.A],Be=yt(f,Xe,pe,ke),$e=vt(f,Xe,pe,ke);jt(f,le,Be,$e);break}case St:{be.upvals[ke.B].setfrom(f.stack[Ie]);break}case bt:{let le=f.stack[Ie],Be=yt(f,Xe,pe,ke),$e=vt(f,Xe,pe,ke);jt(f,le,Be,$e);break}case at:{f.stack[Ie].sethvalue(Ne.luaH_new(f));break}case pt:{let le=kt(f,Xe,ke),Be=vt(f,Xe,pe,ke);V.setobjs2s(f,Ie+1,le),sn(f,f.stack[le],Be,Ie);break}case Ke:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;le.ttisinteger()&&Be.ttisinteger()?f.stack[Ie].setivalue(le.value+Be.value|0):($e=T(le))!==!1&&(Ot=T(Be))!==!1?f.stack[Ie].setfltvalue($e+Ot):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_ADD);break}case we:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;le.ttisinteger()&&Be.ttisinteger()?f.stack[Ie].setivalue(le.value-Be.value|0):($e=T(le))!==!1&&(Ot=T(Be))!==!1?f.stack[Ie].setfltvalue($e-Ot):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_SUB);break}case nt:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;le.ttisinteger()&&Be.ttisinteger()?f.stack[Ie].setivalue(oe(le.value,Be.value)):($e=T(le))!==!1&&(Ot=T(Be))!==!1?f.stack[Ie].setfltvalue($e*Ot):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_MUL);break}case ne:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;le.ttisinteger()&&Be.ttisinteger()?f.stack[Ie].setivalue(At(f,le.value,Be.value)):($e=T(le))!==!1&&(Ot=T(Be))!==!1?f.stack[Ie].setfltvalue(y(f,$e,Ot)):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_MOD);break}case ct:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;($e=T(le))!==!1&&(Ot=T(Be))!==!1?f.stack[Ie].setfltvalue(Math.pow($e,Ot)):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_POW);break}case Oe:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;($e=T(le))!==!1&&(Ot=T(Be))!==!1?f.stack[Ie].setfltvalue($e/Ot):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_DIV);break}case ze:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;le.ttisinteger()&&Be.ttisinteger()?f.stack[Ie].setivalue(He(f,le.value,Be.value)):($e=T(le))!==!1&&(Ot=T(Be))!==!1?f.stack[Ie].setfltvalue(Math.floor($e/Ot)):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_IDIV);break}case ut:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;($e=F(le))!==!1&&(Ot=F(Be))!==!1?f.stack[Ie].setivalue($e&Ot):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_BAND);break}case Ue:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;($e=F(le))!==!1&&(Ot=F(Be))!==!1?f.stack[Ie].setivalue($e|Ot):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_BOR);break}case Pe:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;($e=F(le))!==!1&&(Ot=F(Be))!==!1?f.stack[Ie].setivalue($e^Ot):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_BXOR);break}case tt:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;($e=F(le))!==!1&&(Ot=F(Be))!==!1?f.stack[Ie].setivalue(n($e,Ot)):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_SHL);break}case gt:{let le=yt(f,Xe,pe,ke),Be=vt(f,Xe,pe,ke),$e,Ot;($e=F(le))!==!1&&(Ot=F(Be))!==!1?f.stack[Ie].setivalue(n($e,-Ot)):se.luaT_trybinTM(f,le,Be,f.stack[Ie],se.TMS.TM_SHR);break}case v:{let le=f.stack[kt(f,Xe,ke)],Be;le.ttisinteger()?f.stack[Ie].setivalue(-le.value|0):(Be=T(le))!==!1?f.stack[Ie].setfltvalue(-Be):se.luaT_trybinTM(f,le,le,f.stack[Ie],se.TMS.TM_UNM);break}case Re:{let le=f.stack[kt(f,Xe,ke)];le.ttisinteger()?f.stack[Ie].setivalue(~le.value):se.luaT_trybinTM(f,le,le,f.stack[Ie],se.TMS.TM_BNOT);break}case ft:{let le=f.stack[kt(f,Xe,ke)];f.stack[Ie].setbvalue(le.l_isfalse());break}case Je:{fe(f,f.stack[Ie],f.stack[kt(f,Xe,ke)]);break}case R:{let le=ke.B,Be=ke.C;f.top=Xe+Be+1,Bt(f,Be-le+1);let $e=Xe+le;V.setobjs2s(f,Ie,$e),P.adjust_top(f,G.top);break}case de:{Gt(f,G,ke,0);break}case me:{Ht(f,yt(f,Xe,pe,ke),vt(f,Xe,pe,ke))!==ke.A?G.l_savedpc++:Nt(f,G);break}case ee:{Dt(f,yt(f,Xe,pe,ke),vt(f,Xe,pe,ke))!==ke.A?G.l_savedpc++:Nt(f,G);break}case Ye:{Vt(f,yt(f,Xe,pe,ke),vt(f,Xe,pe,ke))!==ke.A?G.l_savedpc++:Nt(f,G);break}case I:{(ke.C?f.stack[Ie].l_isfalse():!f.stack[Ie].l_isfalse())?G.l_savedpc++:Nt(f,G);break}case O:{let le=kt(f,Xe,ke),Be=f.stack[le];(ke.C?Be.l_isfalse():!Be.l_isfalse())?G.l_savedpc++:(V.setobjs2s(f,Ie,le),Nt(f,G));break}case ce:{let le=ke.B,Be=ke.C-1;if(le!==0&&P.adjust_top(f,Ie+le),P.luaD_precall(f,Ie,Be))Be>=0&&P.adjust_top(f,G.top);else{G=f.ci;continue e}break}case K:{let le=ke.B;if(le!==0&&P.adjust_top(f,Ie+le),!P.luaD_precall(f,Ie,m)){let Be=f.ci,$e=Be.previous,Ot=Be.func,nn=Be.funcOff,on=$e.funcOff,gn=Be.l_base+Ot.value.p.numparams;be.p.p.length>0&&Ae.luaF_close(f,$e.l_base);for(let Sn=0;nn+Sn<gn;Sn++)V.setobjs2s(f,on+Sn,nn+Sn);$e.l_base=on+(Be.l_base-nn),$e.top=on+(f.top-nn),P.adjust_top(f,$e.top),$e.l_code=Be.l_code,$e.l_savedpc=Be.l_savedpc,$e.callstatus|=De.CIST_TAIL,$e.next=null,G=f.ci=$e,Fe(f.top===$e.l_base+f.stack[on].value.p.maxstacksize);continue e}break}case ht:{be.p.p.length>0&&Ae.luaF_close(f,Xe);let le=P.luaD_poscall(f,G,Ie,ke.B!==0?ke.B-1:f.top-Ie);if(G.callstatus&De.CIST_FRESH)return;G=f.ci,le&&P.adjust_top(f,G.top),Fe(G.callstatus&De.CIST_LUA),Fe(G.l_code[G.l_savedpc-1].opcode===ce);continue e}case _e:{if(f.stack[Ie].ttisinteger()){let le=f.stack[Ie+2].value,Be=f.stack[Ie].value+le|0,$e=f.stack[Ie+1].value;(0<le?Be<=$e:$e<=Be)&&(G.l_savedpc+=ke.sBx,f.stack[Ie].chgivalue(Be),f.stack[Ie+3].setivalue(Be))}else{let le=f.stack[Ie+2].value,Be=f.stack[Ie].value+le,$e=f.stack[Ie+1].value;(0<le?Be<=$e:$e<=Be)&&(G.l_savedpc+=ke.sBx,f.stack[Ie].chgfltvalue(Be),f.stack[Ie+3].setfltvalue(Be))}break}case H:{let le=f.stack[Ie],Be=f.stack[Ie+1],$e=f.stack[Ie+2],Ot;if(le.ttisinteger()&&$e.ttisinteger()&&(Ot=Kt(Be,$e.value))){let nn=Ot.stopnow?0:le.value;Be.value=Ot.ilimit,le.value=nn-$e.value|0}else{let nn,on,gn;(nn=T(Be))===!1&&it.luaG_runerror(f,J("'for' limit must be a number",!0)),f.stack[Ie+1].setfltvalue(nn),(on=T($e))===!1&&it.luaG_runerror(f,J("'for' step must be a number",!0)),f.stack[Ie+2].setfltvalue(on),(gn=T(le))===!1&&it.luaG_runerror(f,J("'for' initial value must be a number",!0)),f.stack[Ie].setfltvalue(gn-on)}G.l_savedpc+=ke.sBx;break}case A:{let le=Ie+3;V.setobjs2s(f,le+2,Ie+2),V.setobjs2s(f,le+1,Ie+1),V.setobjs2s(f,le,Ie),P.adjust_top(f,le+3),P.luaD_call(f,le,ke.C),P.adjust_top(f,G.top),ke=G.l_code[G.l_savedpc++],Ie=Rt(f,Xe,ke),Fe(ke.opcode===g)}case g:{f.stack[Ie+1].ttisnil()||(V.setobjs2s(f,Ie,Ie+1),G.l_savedpc+=ke.sBx);break}case Et:{let le=ke.B,Be=ke.C;le===0&&(le=f.top-Ie-1),Be===0&&(Fe(G.l_code[G.l_savedpc].opcode===W),Be=G.l_code[G.l_savedpc++].Ax);let $e=f.stack[Ie].value,Ot=(Be-1)*ye+le;for(;le>0;le--)Ne.luaH_setint($e,Ot--,f.stack[Ie+le]);P.adjust_top(f,G.top);break}case ae:{let le=be.p.p[ke.Bx],Be=u(le,be.upvals,f.stack,Xe);Be===null?s(f,le,be.upvals,Xe,Ie):f.stack[Ie].setclLvalue(Be);break}case B:{let le=ke.B-1,Be=Xe-G.funcOff-be.p.numparams-1,$e;for(Be<0&&(Be=0),le<0&&(le=Be,P.luaD_checkstack(f,Be),P.adjust_top(f,Ie+Be)),$e=0;$e<le&&$e<Be;$e++)V.setobjs2s(f,Ie+$e,Xe-Be+$e);for(;$e<le;$e++)f.stack[Ie+$e].setnilvalue();break}case W:throw Error("invalid opcode")}}},Gt=function(f,G,be,pe){let Xe=be.A;Xe!==0&&Ae.luaF_close(f,G.l_base+Xe-1),G.l_savedpc+=be.sBx+pe},Nt=function(f,G){Gt(f,G,G.l_code[G.l_savedpc],1)},Dt=function(f,G,be){if(G.ttisnumber()&&be.ttisnumber())return Ee(G,be)?1:0;if(G.ttisstring()&&be.ttisstring())return b(G.tsvalue(),be.tsvalue())<0?1:0;{let pe=se.luaT_callorderTM(f,G,be,se.TMS.TM_LT);return pe===null&&it.luaG_ordererror(f,G,be),pe?1:0}},Vt=function(f,G,be){let pe;return G.ttisnumber()&&be.ttisnumber()?We(G,be)?1:0:G.ttisstring()&&be.ttisstring()?b(G.tsvalue(),be.tsvalue())<=0?1:0:(pe=se.luaT_callorderTM(f,G,be,se.TMS.TM_LE),pe!==null?pe?1:0:(f.ci.callstatus|=De.CIST_LEQ,pe=se.luaT_callorderTM(f,be,G,se.TMS.TM_LT),f.ci.callstatus^=De.CIST_LEQ,pe===null&&it.luaG_ordererror(f,G,be),pe?0:1))},Ht=function(f,G,be){if(G.ttype()!==be.ttype())return G.ttnov()!==be.ttnov()||G.ttnov()!==ie?0:G.value===be.value?1:0;let pe;switch(G.ttype()){case ge:return 1;case E:return G.value==be.value?1:0;case U:case q:case Se:case N:return G.value===be.value?1:0;case Z:case $:return _(G.tsvalue(),be.tsvalue())?1:0;case Te:case Q:if(G.value===be.value)return 1;if(f===null)return 0;pe=se.fasttm(f,G.value.metatable,se.TMS.TM_EQ),pe===null&&(pe=se.fasttm(f,be.value.metatable,se.TMS.TM_EQ));break;default:return G.value===be.value?1:0}if(pe===null)return 0;let Xe=new V.TValue;return se.luaT_callTM(f,pe,G,be,Xe,1),Xe.l_isfalse()?0:1},Lt=function(f,G){return Ht(null,f,G)},Kt=function(f,G){let be=!1,pe=Xt(f,G<0?2:1);if(pe===!1){let Xe=T(f);if(Xe===!1)return!1;0<Xe?(pe=ue,G<0&&(be=!0)):(pe=ot,G>=0&&(be=!0))}return{stopnow:be,ilimit:pe}},Xt=function(f,G){if(f.ttisfloat()){let be=f.value,pe=Math.floor(be);if(be!==pe){if(G===0)return!1;G>1&&(pe+=1)}return st(pe)}else{if(f.ttisinteger())return f.value;if(re(f)){let be=new V.TValue;if(V.luaO_str2num(f.svalue(),be)===f.vslen()+1)return Xt(be,G)}}return!1},F=function(f){return f.ttisinteger()?f.value:Xt(f,0)},T=function(f){if(f.ttnov()===ie)return f.value;if(re(f)){let G=new V.TValue;if(V.luaO_str2num(f.svalue(),G)===f.vslen()+1)return G.value}return!1},Ee=function(f,G){return f.value<G.value},We=function(f,G){return f.value<=G.value},b=function(f,G){let be=te(f),pe=te(G);return be===pe?0:be<pe?-1:1},fe=function(f,G,be){let pe;switch(be.ttype()){case Q:{let Xe=be.value;if(pe=se.fasttm(f,Xe.metatable,se.TMS.TM_LEN),pe!==null)break;G.setivalue(Ne.luaH_getn(Xe));return}case Z:case $:G.setivalue(be.vslen());return;default:{pe=se.luaT_gettmbyobj(f,be,se.TMS.TM_LEN),pe.ttisnil()&&it.luaG_typeerror(f,be,J("get length of",!0));break}}se.luaT_callTM(f,pe,be,be,G,1)},oe=Math.imul||function(f,G){let be=f>>>16&65535,pe=f&65535,Xe=G>>>16&65535,ke=G&65535;return pe*ke+(be*ke+pe*Xe<<16>>>0)|0},He=function(f,G,be){return be===0&&it.luaG_runerror(f,J("attempt to divide by zero")),Math.floor(G/be)|0},At=function(f,G,be){return be===0&&it.luaG_runerror(f,J("attempt to perform 'n%%0'")),G-Math.floor(G/be)*be|0},l=32,n=function(f,G){return G<0?G<=-l?0:f>>>-G:G>=l?0:f<<G},u=function(f,G,be,pe){let Xe=f.cache;if(Xe!==null){let ke=f.upvalues,Ie=ke.length;for(let Mt=0;Mt<Ie;Mt++){let le=ke[Mt].instack?be[pe+ke[Mt].idx]:G[ke[Mt].idx];if(Xe.upvals[Mt]!==le)return null}}return Xe},s=function(f,G,be,pe,Xe){let ke=G.upvalues.length,Ie=G.upvalues,Mt=new V.LClosure(f,ke);Mt.p=G,f.stack[Xe].setclLvalue(Mt);for(let le=0;le<ke;le++)Ie[le].instack?Mt.upvals[le]=Ae.luaF_findupval(f,pe+Ie[le].idx):Mt.upvals[le]=be[Ie[le].idx];G.cache=Mt},C=function(f){return f.ttisnumber()},re=function(f){return f.ttisstring()},Ve=function(f,G){let be=f.stack[G];return be.ttisstring()?!0:C(be)?(V.luaO_tostring(f,be),!0):!1},dt=function(f){return f.ttisstring()&&f.vslen()===0},Pt=function(f,G,be,pe){let Xe=0;do{let ke=f.stack[G-be],Ie=ke.vslen(),Mt=ke.svalue();pe.set(Mt,Xe),Xe+=Ie}while(--be>0)},Bt=function(f,G){Fe(G>=2);do{let be=f.top,pe=2;if(!(f.stack[be-2].ttisstring()||C(f.stack[be-2]))||!Ve(f,be-1))se.luaT_trybinTM(f,f.stack[be-2],f.stack[be-1],f.stack[be-2],se.TMS.TM_CONCAT);else if(dt(f.stack[be-1]))Ve(f,be-2);else if(dt(f.stack[be-2]))V.setobjs2s(f,be-2,be-1);else{let Xe=f.stack[be-1].vslen();for(pe=1;pe<G&&Ve(f,be-pe-1);pe++){let Mt=f.stack[be-pe-1].vslen();Xe+=Mt}let ke=new Uint8Array(Xe);Pt(f,be,pe,ke);let Ie=qe(f,ke);V.setsvalue2s(f,be-pe,Ie)}for(G-=pe-1;f.top>be-(pe-1);)delete f.stack[--f.top]}while(G>1)},Ft=2e3,sn=function(f,G,be,pe){for(let Xe=0;Xe<Ft;Xe++){let ke;if(!G.ttistable())ke=se.luaT_gettmbyobj(f,G,se.TMS.TM_INDEX),ke.ttisnil()&&it.luaG_typeerror(f,G,J("index",!0));else{let Ie=Ne.luaH_get(f,G.value,be);if(Ie.ttisnil()){if(ke=se.fasttm(f,G.value.metatable,se.TMS.TM_INDEX),ke===null){f.stack[pe].setnilvalue();return}}else{V.setobj2s(f,pe,Ie);return}}if(ke.ttisfunction()){se.luaT_callTM(f,ke,G,be,f.stack[pe],1);return}G=ke}it.luaG_runerror(f,J("'__index' chain too long; possible loop",!0))},jt=function(f,G,be,pe){for(let Xe=0;Xe<Ft;Xe++){let ke;if(G.ttistable()){let Ie=G.value;if(!Ne.luaH_get(f,Ie,be).ttisnil()||(ke=se.fasttm(f,Ie.metatable,se.TMS.TM_NEWINDEX))===null){Ne.luaH_setfrom(f,Ie,be,pe),Ne.invalidateTMcache(Ie);return}}else(ke=se.luaT_gettmbyobj(f,G,se.TMS.TM_NEWINDEX)).ttisnil()&&it.luaG_typeerror(f,G,J("index",!0));if(ke.ttisfunction()){se.luaT_callTM(f,ke,G,be,pe,0);return}G=ke}it.luaG_runerror(f,J("'__newindex' chain too long; possible loop",!0))};return $t.cvt2str=C,$t.cvt2num=re,$t.luaV_gettable=sn,$t.luaV_concat=Bt,$t.luaV_div=He,$t.luaV_equalobj=Ht,$t.luaV_execute=Wt,$t.luaV_finishOp=Qe,$t.luaV_imul=oe,$t.luaV_lessequal=Vt,$t.luaV_lessthan=Dt,$t.luaV_mod=At,$t.luaV_objlen=fe,$t.luaV_rawequalobj=Lt,$t.luaV_shiftl=n,$t.luaV_tointeger=Xt,$t.settable=jt,$t.tointeger=F,$t.tonumber=T,$t}var Sl;function Ia(){if(Sl)return vn;Sl=1;const{constant_types:{LUA_TTABLE:d,LUA_TUSERDATA:o},to_luastring:m}=rn(),{lua_assert:E}=yn(),N=Mn(),U=Yn(),$=ha(),{luaS_bless:ge,luaS_new:ie}=ra(),Se=sa(),q=pa(),Z=Ra(),Q=["no value","nil","boolean","userdata","number","string","table","function","userdata","thread","proto"].map(R=>m(R)),Te=function(R){return Q[R+1]},J={TM_INDEX:0,TM_NEWINDEX:1,TM_GC:2,TM_MODE:3,TM_LEN:4,TM_EQ:5,TM_ADD:6,TM_SUB:7,TM_MUL:8,TM_MOD:9,TM_POW:10,TM_DIV:11,TM_IDIV:12,TM_BAND:13,TM_BOR:14,TM_BXOR:15,TM_SHL:16,TM_SHR:17,TM_UNM:18,TM_BNOT:19,TM_LT:20,TM_LE:21,TM_CONCAT:22,TM_CALL:23,TM_N:24},Me=function(R){R.l_G.tmname[J.TM_INDEX]=new ie(R,m("__index",!0)),R.l_G.tmname[J.TM_NEWINDEX]=new ie(R,m("__newindex",!0)),R.l_G.tmname[J.TM_GC]=new ie(R,m("__gc",!0)),R.l_G.tmname[J.TM_MODE]=new ie(R,m("__mode",!0)),R.l_G.tmname[J.TM_LEN]=new ie(R,m("__len",!0)),R.l_G.tmname[J.TM_EQ]=new ie(R,m("__eq",!0)),R.l_G.tmname[J.TM_ADD]=new ie(R,m("__add",!0)),R.l_G.tmname[J.TM_SUB]=new ie(R,m("__sub",!0)),R.l_G.tmname[J.TM_MUL]=new ie(R,m("__mul",!0)),R.l_G.tmname[J.TM_MOD]=new ie(R,m("__mod",!0)),R.l_G.tmname[J.TM_POW]=new ie(R,m("__pow",!0)),R.l_G.tmname[J.TM_DIV]=new ie(R,m("__div",!0)),R.l_G.tmname[J.TM_IDIV]=new ie(R,m("__idiv",!0)),R.l_G.tmname[J.TM_BAND]=new ie(R,m("__band",!0)),R.l_G.tmname[J.TM_BOR]=new ie(R,m("__bor",!0)),R.l_G.tmname[J.TM_BXOR]=new ie(R,m("__bxor",!0)),R.l_G.tmname[J.TM_SHL]=new ie(R,m("__shl",!0)),R.l_G.tmname[J.TM_SHR]=new ie(R,m("__shr",!0)),R.l_G.tmname[J.TM_UNM]=new ie(R,m("__unm",!0)),R.l_G.tmname[J.TM_BNOT]=new ie(R,m("__bnot",!0)),R.l_G.tmname[J.TM_LT]=new ie(R,m("__lt",!0)),R.l_G.tmname[J.TM_LE]=new ie(R,m("__le",!0)),R.l_G.tmname[J.TM_CONCAT]=new ie(R,m("__concat",!0)),R.l_G.tmname[J.TM_CALL]=new ie(R,m("__call",!0))},Le=m("__name",!0),ye=function(R,Oe){let me;if(Oe.ttistable()&&(me=Oe.value.metatable)!==null||Oe.ttisfulluserdata()&&(me=Oe.value.metatable)!==null){let W=Se.luaH_getstr(me,ge(R,Le));if(W.ttisstring())return W.svalue()}return Te(Oe.ttnov())},Ke=function(R,Oe,me,W,_e,H){let D=R.top;if(N.pushobj2s(R,Oe),N.pushobj2s(R,me),N.pushobj2s(R,W),H||N.pushobj2s(R,_e),R.ci.callstatus&$.CIST_LUA?U.luaD_call(R,D,H):U.luaD_callnoyield(R,D,H),H){let Ce=R.stack[R.top-1];delete R.stack[--R.top],_e.setfrom(Ce)}},ut=function(R,Oe,me,W,_e){let H=ae(R,Oe,_e);return H.ttisnil()&&(H=ae(R,me,_e)),H.ttisnil()?!1:(Ke(R,H,Oe,me,W,1),!0)},Re=function(R,Oe,me,W,_e){if(!ut(R,Oe,me,W,_e))switch(_e){case J.TM_CONCAT:return q.luaG_concaterror(R,Oe,me);case J.TM_BAND:case J.TM_BOR:case J.TM_BXOR:case J.TM_SHL:case J.TM_SHR:case J.TM_BNOT:{let H=Z.tonumber(Oe),D=Z.tonumber(me);return H!==!1&&D!==!1?q.luaG_tointerror(R,Oe,me):q.luaG_opinterror(R,Oe,me,m("perform bitwise operation on",!0))}default:return q.luaG_opinterror(R,Oe,me,m("perform arithmetic on",!0))}},Ue=function(R,Oe,me,W){let _e=new N.TValue;return ut(R,Oe,me,_e,W)?!_e.l_isfalse():null},Pe=function(R,Oe,me){return Oe===null||Oe.flags&1<<me?null:ce(Oe,me,R.l_G.tmname[me])},ce=function(R,Oe,me){const W=Se.luaH_getstr(R,me);return E(Oe<=J.TM_EQ),W.ttisnil()?(R.flags|=1<<Oe,null):W},ae=function(R,Oe,me){let W;switch(Oe.ttnov()){case d:case o:W=Oe.value.metatable;break;default:W=R.l_G.mt[Oe.ttnov()]}return W?Se.luaH_getstr(W,R.l_G.tmname[me]):N.luaO_nilobject};return vn.fasttm=Pe,vn.TMS=J,vn.luaT_callTM=Ke,vn.luaT_callbinTM=ut,vn.luaT_trybinTM=Re,vn.luaT_callorderTM=Ue,vn.luaT_gettm=ce,vn.luaT_gettmbyobj=ae,vn.luaT_init=Me,vn.luaT_objtypename=ye,vn.ttypename=Te,vn}var Nl;function ha(){if(Nl)return tn;Nl=1;const{LUA_MINSTACK:d,LUA_RIDX_GLOBALS:o,LUA_RIDX_MAINTHREAD:m,constant_types:{LUA_NUMTAGS:E,LUA_TNIL:N,LUA_TTABLE:U,LUA_TTHREAD:$},thread_status:{LUA_OK:ge}}=rn(),ie=Mn(),Se=Yn(),q=Xa(),Z=sa(),Q=Ia(),Te=5,J=2*d;class Me{constructor(){this.func=null,this.funcOff=NaN,this.top=NaN,this.previous=null,this.next=null,this.l_base=NaN,this.l_code=null,this.l_savedpc=NaN,this.c_k=null,this.c_old_errfunc=null,this.c_ctx=null,this.nresults=NaN,this.callstatus=NaN}}class Le{constructor(H){this.id=H.id_counter++,this.base_ci=new Me,this.top=NaN,this.stack_last=NaN,this.oldpc=NaN,this.l_G=H,this.stack=null,this.ci=null,this.errorJmp=null,this.nCcalls=0,this.hook=null,this.hookmask=0,this.basehookcount=0,this.allowhook=1,this.hookcount=this.basehookcount,this.nny=1,this.status=ge,this.errfunc=0}}class ye{constructor(){this.id_counter=1,this.ids=new WeakMap,this.mainthread=null,this.l_registry=new ie.TValue(N,null),this.panic=null,this.atnativeerror=null,this.version=null,this.tmname=new Array(Q.TMS.TM_N),this.mt=new Array(E)}}const Ke=function(_e){let H=new Me;return _e.ci.next=H,H.previous=_e.ci,H.next=null,_e.ci=H,H},ut=function(_e){let H=_e.ci;H.next=null},Re=function(_e,H){_e.stack=new Array(J),_e.top=0,_e.stack_last=J-Te;let D=_e.base_ci;D.next=D.previous=null,D.callstatus=0,D.funcOff=_e.top,D.func=_e.stack[_e.top],_e.stack[_e.top++]=new ie.TValue(N,null),D.top=_e.top+d,_e.ci=D},Ue=function(_e){_e.ci=_e.base_ci,ut(_e),_e.stack=null},Pe=function(_e,H){let D=Z.luaH_new(_e);H.l_registry.sethvalue(D),Z.luaH_setint(D,m,new ie.TValue($,_e)),Z.luaH_setint(D,o,new ie.TValue(U,Z.luaH_new(_e)))},ce=function(_e){let H=_e.l_G;Re(_e),Pe(_e,H),Q.luaT_init(_e),H.version=q.lua_version(null)},ae=function(_e){let H=_e.l_G,D=new Le(H);return _e.stack[_e.top]=new ie.TValue($,D),q.api_incr_top(_e),D.hookmask=_e.hookmask,D.basehookcount=_e.basehookcount,D.hook=_e.hook,D.hookcount=D.basehookcount,Re(D),D},R=function(_e,H){Ue(H)},Oe=function(){let _e=new ye,H=new Le(_e);return _e.mainthread=H,Se.luaD_rawrunprotected(H,ce,null)!==ge&&(H=null),H},me=function(_e){Ue(_e)},W=function(_e){_e=_e.l_G.mainthread,me(_e)};return tn.lua_State=Le,tn.CallInfo=Me,tn.CIST_OAH=1,tn.CIST_LUA=2,tn.CIST_HOOKED=4,tn.CIST_FRESH=8,tn.CIST_YPCALL=16,tn.CIST_TAIL=32,tn.CIST_HOOKYIELD=64,tn.CIST_LEQ=128,tn.CIST_FIN=256,tn.EXTRA_STACK=Te,tn.lua_close=W,tn.lua_newstate=Oe,tn.lua_newthread=ae,tn.luaE_extendCI=Ke,tn.luaE_freeCI=ut,tn.luaE_freethread=R,tn}var xl;function Mn(){if(xl)return Yt;xl=1;const{LUA_OPADD:d,LUA_OPBAND:o,LUA_OPBNOT:m,LUA_OPBOR:E,LUA_OPBXOR:N,LUA_OPDIV:U,LUA_OPIDIV:$,LUA_OPMOD:ge,LUA_OPMUL:ie,LUA_OPPOW:Se,LUA_OPSHL:q,LUA_OPSHR:Z,LUA_OPSUB:Q,LUA_OPUNM:Te,constant_types:{LUA_NUMTAGS:J,LUA_TBOOLEAN:Me,LUA_TCCL:Le,LUA_TFUNCTION:ye,LUA_TLCF:Ke,LUA_TLCL:ut,LUA_TLIGHTUSERDATA:Re,LUA_TLNGSTR:Ue,LUA_TNIL:Pe,LUA_TNUMBER:ce,LUA_TNUMFLT:ae,LUA_TNUMINT:R,LUA_TSHRSTR:Oe,LUA_TSTRING:me,LUA_TTABLE:W,LUA_TTHREAD:_e,LUA_TUSERDATA:H},from_userstring:D,luastring_indexOf:Ce,luastring_of:ve,to_jsstring:ze,to_luastring:de}=rn(),{lisdigit:Ye,lisprint:Je,lisspace:x,lisxdigit:Y}=cr(),X=pa(),he=Yn(),ee=ha(),{luaS_bless:ne,luaS_new:je}=ra(),nt=sa(),{LUA_COMPAT_FLOATSTRING:at,ldexp:ft,lua_integer2str:ct,lua_number2str:ht}=wn(),pt=Ra(),{MAX_INT:Et,luai_nummod:bt,lua_assert:Ze}=yn(),St=Ia(),tt=J,gt=J+1;class we{constructor(T,Ee){this.type=T,this.value=Ee}ttype(){return this.type&63}ttnov(){return this.type&15}checktag(T){return this.type===T}checktype(T){return this.ttnov()===T}ttisnumber(){return this.checktype(ce)}ttisfloat(){return this.checktag(ae)}ttisinteger(){return this.checktag(R)}ttisnil(){return this.checktag(Pe)}ttisboolean(){return this.checktag(Me)}ttislightuserdata(){return this.checktag(Re)}ttisstring(){return this.checktype(me)}ttisshrstring(){return this.checktag(Oe)}ttislngstring(){return this.checktag(Ue)}ttistable(){return this.checktag(W)}ttisfunction(){return this.checktype(ye)}ttisclosure(){return(this.type&31)===ye}ttisCclosure(){return this.checktag(Le)}ttisLclosure(){return this.checktag(ut)}ttislcf(){return this.checktag(Ke)}ttisfulluserdata(){return this.checktag(H)}ttisthread(){return this.checktag(_e)}ttisdeadkey(){return this.checktag(gt)}l_isfalse(){return this.ttisnil()||this.ttisboolean()&&this.value===!1}setfltvalue(T){this.type=ae,this.value=T}chgfltvalue(T){Ze(this.type==ae),this.value=T}setivalue(T){this.type=R,this.value=T}chgivalue(T){Ze(this.type==R),this.value=T}setnilvalue(){this.type=Pe,this.value=null}setfvalue(T){this.type=Ke,this.value=T}setpvalue(T){this.type=Re,this.value=T}setbvalue(T){this.type=Me,this.value=T}setsvalue(T){this.type=Ue,this.value=T}setuvalue(T){this.type=H,this.value=T}setthvalue(T){this.type=_e,this.value=T}setclLvalue(T){this.type=ut,this.value=T}setclCvalue(T){this.type=Le,this.value=T}sethvalue(T){this.type=W,this.value=T}setdeadvalue(){this.type=gt,this.value=null}setfrom(T){this.type=T.type,this.value=T.value}tsvalue(){return Ze(this.ttisstring()),this.value}svalue(){return this.tsvalue().getstr()}vslen(){return this.tsvalue().tsslen()}jsstring(T,Ee){return ze(this.svalue(),T,Ee,!0)}}const K=function(F,T){F.stack[F.top++]=new we(T.type,T.value)},I=function(F,T){F.stack[F.top++]=new we(Ue,T)},O=function(F,T,Ee){F.stack[T].setfrom(F.stack[Ee])},A=function(F,T,Ee){F.stack[T].setfrom(Ee)},g=function(F,T,Ee){F.stack[T].setsvalue(Ee)},v=new we(Pe,null);Object.freeze(v),Yt.luaO_nilobject=v;class B{constructor(T,Ee){this.id=T.l_G.id_counter++,this.p=null,this.nupvalues=Ee,this.upvals=new Array(Ee)}}class ue{constructor(T,Ee,We){for(this.id=T.l_G.id_counter++,this.f=Ee,this.nupvalues=We,this.upvalue=new Array(We);We--;)this.upvalue[We]=new we(Pe,null)}}class ot{constructor(T,Ee){this.id=T.l_G.id_counter++,this.metatable=null,this.uservalue=new we(Pe,null),this.len=Ee,this.data=Object.create(null)}}class st{constructor(){this.varname=null,this.startpc=NaN,this.endpc=NaN}}const Fe=de("..."),y=de('[string "'),V=de('"]'),Ae=function(F,T){let Ee=F.length,We;if(F[0]===61)Ee<T?(We=new Uint8Array(Ee-1),We.set(F.subarray(1))):(We=new Uint8Array(T),We.set(F.subarray(1,T+1)));else if(F[0]===64)Ee<=T?(We=new Uint8Array(Ee-1),We.set(F.subarray(1))):(We=new Uint8Array(T),We.set(Fe),T-=Fe.length,We.set(F.subarray(Ee-T),Fe.length));else{We=new Uint8Array(T);let b=Ce(F,10);We.set(y);let fe=y.length;T-=y.length+Fe.length+V.length,Ee<T&&b===-1?(We.set(F,fe),fe+=F.length):(b!==-1&&(Ee=b),Ee>T&&(Ee=T),We.set(F.subarray(0,Ee),fe),fe+=Ee,We.set(Fe,fe),fe+=Fe.length),We.set(V,fe),fe+=V.length,We=We.subarray(0,fe)}return We},De=function(F){return Ye(F)?F-48:(F&223)-55},qe=8,_=function(F,T){let Ee=1;if(Ze(T<=1114111),T<128)F[qe-1]=T;else{let We=63;do F[qe-Ee++]=128|T&63,T>>=6,We>>=1;while(T>We);F[qe-Ee]=~We<<1|T}return Ee},te=30,P=function(F){let T=0,Ee=0,We=0,b=0,fe=0,oe,He=!1;for(;x(F[T]);)T++;if(((oe=F[T]===45)||F[T]===43)&&T++,!(F[T]===48&&(F[T+1]===120||F[T+1]===88)))return null;for(T+=2;;T++)if(F[T]===46){if(He)break;He=!0}else if(Y(F[T]))We===0&&F[T]===48?b++:++We<=te?Ee=Ee*16+De(F[T]):fe++,He&&fe--;else break;if(b+We===0)return null;if(fe*=4,F[T]===112||F[T]===80){let At=0,l;if(T++,((l=F[T]===45)||F[T]===43)&&T++,!Ye(F[T]))return null;for(;Ye(F[T]);)At=At*10+F[T++]-48;l&&(At=-At),fe+=At}return oe&&(Ee=-Ee),{n:ft(Ee,fe),i:T}},se=function(F){try{F=ze(F)}catch{return null}let T=/^[\t\v\f \n\r]*[+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]*)(?:[eE][+-]?[0-9]+)?/.exec(F);if(!T)return null;let Ee=parseFloat(T[0]);return isNaN(Ee)?null:{n:Ee,i:T[0].length}},Ne=function(F,T){let Ee=T==="x"?P(F):se(F);if(Ee===null)return null;for(;x(F[Ee.i]);)Ee.i++;return Ee.i===F.length||F[Ee.i]===0?Ee:null},it=[46,120,88,110,78],Qe={46:".",120:"x",88:"x",110:"n",78:"n"},Rt=function(F){let T=F.length,Ee=0;for(let fe=0;fe<T;fe++){let oe=F[fe];if(it.indexOf(oe)!==-1){Ee=oe;break}}let We=Qe[Ee];return We==="n"?null:Ne(F,We)},kt=Math.floor(Et/10),yt=Et%10,vt=function(F){let T=0,Ee=0,We=!0,b;for(;x(F[T]);)T++;if(((b=F[T]===45)||F[T]===43)&&T++,F[T]===48&&(F[T+1]===120||F[T+1]===88))for(T+=2;T<F.length&&Y(F[T]);T++)Ee=Ee*16+De(F[T])|0,We=!1;else for(;T<F.length&&Ye(F[T]);T++){let fe=F[T]-48;if(Ee>=kt&&(Ee>kt||fe>yt+b))return null;Ee=Ee*10+fe|0,We=!1}for(;T<F.length&&x(F[T]);)T++;return We||T!==F.length&&F[T]!==0?null:{n:(b?-Ee:Ee)|0,i:T}},Wt=function(F,T){let Ee=vt(F);return Ee!==null?(T.setivalue(Ee.n),Ee.i+1):(Ee=Rt(F),Ee!==null?(T.setfltvalue(Ee.n),Ee.i+1):0)},Gt=function(F,T){let Ee;if(T.ttisinteger())Ee=de(ct(T.value));else{let We=ht(T.value);!at&&/^[-0123456789]+$/.test(We)&&(We+=".0"),Ee=de(We)}T.setsvalue(ne(F,Ee))},Nt=function(F,T){he.luaD_inctop(F),g(F,F.top-1,je(F,T))},Dt=function(F,T,Ee){let We=0,b=0,fe=0,oe;for(;oe=Ce(T,37,b),oe!=-1;){switch(Nt(F,T.subarray(b,oe)),T[oe+1]){case 115:{let He=Ee[fe++];if(He===null)He=de("(null)",!0);else{He=D(He);let At=Ce(He,0);At!==-1&&(He=He.subarray(0,At))}Nt(F,He);break}case 99:{let He=Ee[fe++];Je(He)?Nt(F,ve(He)):Vt(F,de("<\\%d>",!0),He);break}case 100:case 73:he.luaD_inctop(F),F.stack[F.top-1].setivalue(Ee[fe++]),Gt(F,F.stack[F.top-1]);break;case 102:he.luaD_inctop(F),F.stack[F.top-1].setfltvalue(Ee[fe++]),Gt(F,F.stack[F.top-1]);break;case 112:{let He=Ee[fe++];if(He instanceof ee.lua_State||He instanceof nt.Table||He instanceof ot||He instanceof B||He instanceof ue)Nt(F,de("0x"+He.id.toString(16)));else switch(typeof He){case"undefined":Nt(F,de("undefined"));break;case"number":Nt(F,de("Number("+He+")"));break;case"string":Nt(F,de("String("+JSON.stringify(He)+")"));break;case"boolean":Nt(F,de(He?"Boolean(true)":"Boolean(false)"));break;case"object":if(He===null){Nt(F,de("null"));break}case"function":{let At=F.l_G.ids.get(He);At||(At=F.l_G.id_counter++,F.l_G.ids.set(He,At)),Nt(F,de("0x"+At.toString(16)));break}default:Nt(F,de("<id NYI>"))}break}case 85:{let He=new Uint8Array(qe),At=_(He,Ee[fe++]);Nt(F,He.subarray(qe-At));break}case 37:Nt(F,de("%",!0));break;default:X.luaG_runerror(F,de("invalid option '%%%c' to 'lua_pushfstring'"),T[oe+1])}We+=2,b=oe+2}return he.luaD_checkstack(F,1),Nt(F,T.subarray(b)),We>0&&pt.luaV_concat(F,We+1),F.stack[F.top-1].svalue()},Vt=function(F,T,...Ee){return Dt(F,T,Ee)},Ht=function(F){let T=0;if(F<8)return F;for(;F>=128;)F=F+15>>4,T+=4;for(;F>=16;)F=F+1>>1,T++;return T+1<<3|F-8},Lt=function(F,T,Ee,We){switch(T){case d:return Ee+We|0;case Q:return Ee-We|0;case ie:return pt.luaV_imul(Ee,We);case ge:return pt.luaV_mod(F,Ee,We);case $:return pt.luaV_div(F,Ee,We);case o:return Ee&We;case E:return Ee|We;case N:return Ee^We;case q:return pt.luaV_shiftl(Ee,We);case Z:return pt.luaV_shiftl(Ee,-We);case Te:return 0-Ee|0;case m:return-1^Ee;default:Ze(0)}},Kt=function(F,T,Ee,We){switch(T){case d:return Ee+We;case Q:return Ee-We;case ie:return Ee*We;case U:return Ee/We;case Se:return Math.pow(Ee,We);case $:return Math.floor(Ee/We);case Te:return-Ee;case ge:return bt(F,Ee,We);default:Ze(0)}},Xt=function(F,T,Ee,We,b){let fe=typeof b=="number"?F.stack[b]:b;switch(T){case o:case E:case N:case q:case Z:case m:{let oe,He;if((oe=pt.tointeger(Ee))!==!1&&(He=pt.tointeger(We))!==!1){fe.setivalue(Lt(F,T,oe,He));return}else break}case U:case Se:{let oe,He;if((oe=pt.tonumber(Ee))!==!1&&(He=pt.tonumber(We))!==!1){fe.setfltvalue(Kt(F,T,oe,He));return}else break}default:{let oe,He;if(Ee.ttisinteger()&&We.ttisinteger()){fe.setivalue(Lt(F,T,Ee.value,We.value));return}else if((oe=pt.tonumber(Ee))!==!1&&(He=pt.tonumber(We))!==!1){fe.setfltvalue(Kt(F,T,oe,He));return}else break}}Ze(F!==null),St.luaT_trybinTM(F,Ee,We,b,T-d+St.TMS.TM_ADD)};return Yt.CClosure=ue,Yt.LClosure=B,Yt.LUA_TDEADKEY=gt,Yt.LUA_TPROTO=tt,Yt.LocVar=st,Yt.TValue=we,Yt.Udata=ot,Yt.UTF8BUFFSZ=qe,Yt.luaO_arith=Xt,Yt.luaO_chunkid=Ae,Yt.luaO_hexavalue=De,Yt.luaO_int2fb=Ht,Yt.luaO_pushfstring=Vt,Yt.luaO_pushvfstring=Dt,Yt.luaO_str2num=Wt,Yt.luaO_tostring=Gt,Yt.luaO_utf8esc=_,Yt.numarith=Kt,Yt.pushobj2s=K,Yt.pushsvalue2s=I,Yt.setobjs2s=O,Yt.setobj2s=A,Yt.setsvalue2s=g,Yt}var Rl;function Ma(){if(Rl)return aa;Rl=1;const{constant_types:{LUA_TNIL:d}}=rn(),o=Mn();class m{constructor(Se){this.id=Se.l_G.id_counter++,this.k=[],this.p=[],this.code=[],this.cache=null,this.lineinfo=[],this.upvalues=[],this.numparams=0,this.is_vararg=!1,this.maxstacksize=0,this.locvars=[],this.linedefined=0,this.lastlinedefined=0,this.source=null}}const E=function(ie,Se){return new o.LClosure(ie,Se)},N=function(ie,Se){return ie.stack[Se]},U=function(ie,Se){for(let q=Se;q<ie.top;q++){let Z=ie.stack[q];ie.stack[q]=new o.TValue(Z.type,Z.value)}},$=function(ie,Se){for(let q=0;q<Se.nupvalues;q++)Se.upvals[q]=new o.TValue(d,null)},ge=function(ie,Se,q){for(let Z=0;Z<ie.locvars.length&&ie.locvars[Z].startpc<=q;Z++)if(q<ie.locvars[Z].endpc&&(Se--,Se===0))return ie.locvars[Z].varname.getstr();return null};return aa.MAXUPVAL=255,aa.Proto=m,aa.luaF_findupval=N,aa.luaF_close=U,aa.luaF_getlocalname=ge,aa.luaF_initupvals=$,aa.luaF_newLclosure=E,aa}var ka={},xt={},En={},Kn={},Il;function Ha(){if(Il)return Kn;Il=1;const{lua_assert:d}=yn();class o{constructor(){this.buffer=null,this.n=0}}const m=function(q){return q.buffer.subarray(0,q.n)},E=function(q,Z){q.n-=Z},N=function(q){q.n=0},U=function(q,Z,Q){let Te=new Uint8Array(Q);Z.buffer&&Te.set(Z.buffer),Z.buffer=Te};class ${constructor(Z,Q,Te){this.L=Z,d(typeof Q=="function","ZIO requires a reader"),this.reader=Q,this.data=Te,this.n=0,this.buffer=null,this.off=0}zgetc(){return this.n-- >0?this.buffer[this.off++]:ie(this)}}const ge=-1,ie=function(q){let Z=q.reader(q.L,q.data);if(Z===null)return ge;d(Z instanceof Uint8Array,"Should only load binary of array of bytes");let Q=Z.length;return Q===0?ge:(q.buffer=Z,q.off=0,q.n=Q-1,q.buffer[q.off++])},Se=function(q,Z,Q,Te){for(;Te;){if(q.n===0){if(ie(q)===ge)return Te;q.n++,q.off--}let J=Te<=q.n?Te:q.n;for(let Me=0;Me<J;Me++)Z[Q++]=q.buffer[q.off++];q.n-=J,q.n===0&&(q.buffer=null),Te-=J}return 0};return Kn.EOZ=ge,Kn.luaZ_buffer=m,Kn.luaZ_buffremove=E,Kn.luaZ_fill=ie,Kn.luaZ_read=Se,Kn.luaZ_resetbuffer=N,Kn.luaZ_resizebuffer=U,Kn.MBuffer=o,Kn.ZIO=$,Kn}var Ml;function _l(){if(Ml)return En;Ml=1;const{constant_types:{LUA_TBOOLEAN:d,LUA_TLNGSTR:o},thread_status:{LUA_ERRSYNTAX:m},to_luastring:E}=rn(),{LUA_MINBUFFER:N,MAX_INT:U,lua_assert:$}=yn(),ge=pa(),ie=Yn(),{lisdigit:Se,lislalnum:q,lislalpha:Z,lisspace:Q,lisxdigit:Te}=cr(),J=Mn(),{luaS_bless:Me,luaS_hash:Le,luaS_hashlongstr:ye,luaS_new:Ke}=ra(),ut=sa(),{EOZ:Re,luaZ_buffer:Ue,luaZ_buffremove:Pe,luaZ_resetbuffer:ce,luaZ_resizebuffer:ae}=Ha(),R=257,Oe=E("_ENV",!0),me=R,W=R+1,_e=R+2,H=R+3,D=R+4,Ce=R+5,ve=R+6,ze=R+7,de=R+8,Ye=R+9,Je=R+10,x=R+11,Y=R+12,X=R+13,he=R+14,ee=R+15,ne=R+16,je=R+17,nt=R+18,at=R+19,ft=R+20,ct=R+21,ht=R+22,pt=R+23,Et=R+24,bt=R+25,Ze=R+26,St=R+27,tt=R+28,gt=R+29,we=R+30,K=R+31,I=R+32,O=R+33,A=R+34,g=R+35,v=R+36,B={TK_AND:me,TK_BREAK:W,TK_DO:_e,TK_ELSE:H,TK_ELSEIF:D,TK_END:Ce,TK_FALSE:ve,TK_FOR:ze,TK_FUNCTION:de,TK_GOTO:Ye,TK_IF:Je,TK_IN:x,TK_LOCAL:Y,TK_NIL:X,TK_NOT:he,TK_OR:ee,TK_REPEAT:ne,TK_RETURN:je,TK_THEN:nt,TK_TRUE:at,TK_UNTIL:ft,TK_WHILE:ct,TK_IDIV:ht,TK_CONCAT:pt,TK_DOTS:Et,TK_EQ:bt,TK_GE:Ze,TK_LE:St,TK_NE:tt,TK_SHL:gt,TK_SHR:we,TK_DBCOLON:K,TK_EOS:I,TK_FLT:O,TK_INT:A,TK_NAME:g,TK_STRING:v},ue=["and","break","do","else","elseif","end","false","for","function","goto","if","in","local","nil","not","or","repeat","return","then","true","until","while","//","..","...","==",">=","<=","~=","<<",">>","::","<eof>","<number>","<integer>","<name>","<string>"].map((b,fe)=>E(b));class ot{constructor(){this.r=NaN,this.i=NaN,this.ts=null}}class st{constructor(){this.token=NaN,this.seminfo=new ot}}class Fe{constructor(){this.current=NaN,this.linenumber=NaN,this.lastline=NaN,this.t=new st,this.lookahead=new st,this.fs=null,this.L=null,this.z=null,this.buff=null,this.h=null,this.dyd=null,this.source=null,this.envn=null}}const y=function(b,fe){let oe=b.buff;if(oe.n+1>oe.buffer.length){oe.buffer.length>=U/2&&kt(b,E("lexical element too long",!0),0);let He=oe.buffer.length*2;ae(b.L,oe,He)}oe.buffer[oe.n++]=fe<0?255+fe+1:fe},V=function(b,fe){if(fe<R)return J.luaO_pushfstring(b.L,E("'%c'",!0),fe);{let oe=ue[fe-R];return fe<I?J.luaO_pushfstring(b.L,E("'%s'",!0),oe):oe}},Ae=function(b){return b.current===10||b.current===13},De=function(b){b.current=b.z.zgetc()},qe=function(b){y(b,b.current),De(b)},_=new J.TValue(d,!0),te=function(b,fe){let oe=b.L,He=Ke(oe,fe),At=b.h.strong.get(ye(He));if(At)He=At.key.tsvalue();else{let l=new J.TValue(o,He);ut.luaH_setfrom(oe,b.h,l,_)}return He},P=function(b){let fe=b.current;$(Ae(b)),De(b),Ae(b)&&b.current!==fe&&De(b),++b.linenumber>=U&&kt(b,E("chunk has too many lines",!0),0)},se=function(b,fe,oe,He,At){fe.t={token:0,seminfo:new ot},fe.L=b,fe.current=At,fe.lookahead={token:I,seminfo:new ot},fe.z=oe,fe.fs=null,fe.linenumber=1,fe.lastline=1,fe.source=He,fe.envn=Me(b,Oe),ae(b,fe.buff,N)},Ne=function(b,fe){return b.current===fe?(De(b),!0):!1},it=function(b,fe){return b.current===fe[0].charCodeAt(0)||b.current===fe[1].charCodeAt(0)?(qe(b),!0):!1},Qe=function(b,fe){let oe="Ee",He=b.current;for($(Se(b.current)),qe(b),He===48&&it(b,"xX")&&(oe="Pp");;)if(it(b,oe)&&it(b,"-+"),Te(b.current))qe(b);else if(b.current===46)qe(b);else break;let At=new J.TValue;return J.luaO_str2num(Ue(b.buff),At)===0&&kt(b,E("malformed number",!0),O),At.ttisinteger()?(fe.i=At.value,A):($(At.ttisfloat()),fe.r=At.value,O)},Rt=function(b,fe){switch(fe){case g:case v:case O:case A:return J.luaO_pushfstring(b.L,E("'%s'",!0),Ue(b.buff));default:return V(b,fe)}},kt=function(b,fe,oe){fe=ge.luaG_addinfo(b.L,fe,b.source,b.linenumber),oe&&J.luaO_pushfstring(b.L,E("%s near %s"),fe,Rt(b,oe)),ie.luaD_throw(b.L,m)},yt=function(b,fe){kt(b,fe,b.t.token)},vt=function(b){let fe=0,oe=b.current;for($(oe===91||oe===93),qe(b);b.current===61;)qe(b),fe++;return b.current===oe?fe:-fe-1},Wt=function(b,fe,oe){let He=b.linenumber;qe(b),Ae(b)&&P(b);let At=!1;for(;!At;)switch(b.current){case Re:{let n=`unfinished long ${fe?"string":"comment"} (starting at line ${He})`;kt(b,E(n),I);break}case 93:{vt(b)===oe&&(qe(b),At=!0);break}case 10:case 13:{y(b,10),P(b),fe||ce(b.buff);break}default:fe?qe(b):De(b)}fe&&(fe.ts=te(b,b.buff.buffer.subarray(2+oe,b.buff.n-(2+oe))))},Gt=function(b,fe,oe){fe||(b.current!==Re&&qe(b),kt(b,oe,v))},Nt=function(b){return qe(b),Gt(b,Te(b.current),E("hexadecimal digit expected",!0)),J.luaO_hexavalue(b.current)},Dt=function(b){let fe=Nt(b);return fe=(fe<<4)+Nt(b),Pe(b.buff,2),fe},Vt=function(b){let fe=4;qe(b),Gt(b,b.current===123,E("missing '{'",!0));let oe=Nt(b);for(qe(b);Te(b.current);)fe++,oe=(oe<<4)+J.luaO_hexavalue(b.current),Gt(b,oe<=1114111,E("UTF-8 value too large",!0)),qe(b);return Gt(b,b.current===125,E("missing '}'",!0)),De(b),Pe(b.buff,fe),oe},Ht=function(b){let fe=new Uint8Array(J.UTF8BUFFSZ),oe=J.luaO_utf8esc(fe,Vt(b));for(;oe>0;oe--)y(b,fe[J.UTF8BUFFSZ-oe])},Lt=function(b){let fe=0,oe;for(oe=0;oe<3&&Se(b.current);oe++)fe=10*fe+b.current-48,qe(b);return Gt(b,fe<=255,E("decimal escape too large",!0)),Pe(b.buff,oe),fe},Kt=function(b,fe,oe){for(qe(b);b.current!==fe;)switch(b.current){case Re:kt(b,E("unfinished string",!0),I);break;case 10:case 13:kt(b,E("unfinished string",!0),v);break;case 92:{qe(b);let He,At;switch(b.current){case 97:At=7,He="read_save";break;case 98:At=8,He="read_save";break;case 102:At=12,He="read_save";break;case 110:At=10,He="read_save";break;case 114:At=13,He="read_save";break;case 116:At=9,He="read_save";break;case 118:At=11,He="read_save";break;case 120:At=Dt(b),He="read_save";break;case 117:Ht(b),He="no_save";break;case 10:case 13:P(b),At=10,He="only_save";break;case 92:case 34:case 39:At=b.current,He="read_save";break;case Re:He="no_save";break;case 122:{for(Pe(b.buff,1),De(b);Q(b.current);)Ae(b)?P(b):De(b);He="no_save";break}default:{Gt(b,Se(b.current),E("invalid escape sequence",!0)),At=Lt(b),He="only_save";break}}He==="read_save"&&De(b),(He==="read_save"||He==="only_save")&&(Pe(b.buff,1),y(b,At));break}default:qe(b)}qe(b),oe.ts=te(b,b.buff.buffer.subarray(1,b.buff.n-1))},Xt=Object.create(null);ue.forEach((b,fe)=>Xt[Le(b)]=fe);const F=function(b){let fe=Xt[ye(b)];return fe!==void 0&&fe<=22},T=function(b,fe){for(ce(b.buff);;)switch($(typeof b.current=="number"),b.current){case 10:case 13:{P(b);break}case 32:case 12:case 9:case 11:{De(b);break}case 45:{if(De(b),b.current!==45)return 45;if(De(b),b.current===91){let oe=vt(b);if(ce(b.buff),oe>=0){Wt(b,null,oe),ce(b.buff);break}}for(;!Ae(b)&&b.current!==Re;)De(b);break}case 91:{let oe=vt(b);return oe>=0?(Wt(b,fe,oe),v):(oe!==-1&&kt(b,E("invalid long string delimiter",!0),v),91)}case 61:return De(b),Ne(b,61)?bt:61;case 60:return De(b),Ne(b,61)?St:Ne(b,60)?gt:60;case 62:return De(b),Ne(b,61)?Ze:Ne(b,62)?we:62;case 47:return De(b),Ne(b,47)?ht:47;case 126:return De(b),Ne(b,61)?tt:126;case 58:return De(b),Ne(b,58)?K:58;case 34:case 39:return Kt(b,b.current,fe),v;case 46:return qe(b),Ne(b,46)?Ne(b,46)?Et:pt:Se(b.current)?Qe(b,fe):46;case 48:case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return Qe(b,fe);case Re:return I;default:if(Z(b.current)){do qe(b);while(q(b.current));let oe=te(b,Ue(b.buff));fe.ts=oe;let He=Xt[ye(oe)];return He!==void 0&&He<=22?He+R:g}else{let oe=b.current;return De(b),oe}}},Ee=function(b){b.lastline=b.linenumber,b.lookahead.token!==I?(b.t.token=b.lookahead.token,b.t.seminfo.i=b.lookahead.seminfo.i,b.t.seminfo.r=b.lookahead.seminfo.r,b.t.seminfo.ts=b.lookahead.seminfo.ts,b.lookahead.token=I):b.t.token=T(b,b.t.seminfo)},We=function(b){return $(b.lookahead.token===I),b.lookahead.token=T(b,b.lookahead.seminfo),b.lookahead.token};return En.FIRST_RESERVED=R,En.LUA_ENV=Oe,En.LexState=Fe,En.RESERVED=B,En.isreserved=F,En.luaX_lookahead=We,En.luaX_newstring=te,En.luaX_next=Ee,En.luaX_setinput=se,En.luaX_syntaxerror=yt,En.luaX_token2str=V,En.luaX_tokens=ue,En}var Ul;function is(){if(Ul)return xt;Ul=1;const{LUA_MULTRET:d,LUA_OPADD:o,LUA_OPBAND:m,LUA_OPBNOT:E,LUA_OPBOR:N,LUA_OPBXOR:U,LUA_OPDIV:$,LUA_OPIDIV:ge,LUA_OPMOD:ie,LUA_OPSHL:Se,LUA_OPSHR:q,LUA_OPUNM:Z,constant_types:{LUA_TBOOLEAN:Q,LUA_TLIGHTUSERDATA:Te,LUA_TLNGSTR:J,LUA_TNIL:Me,LUA_TNUMFLT:Le,LUA_TNUMINT:ye,LUA_TTABLE:Ke},to_luastring:ut}=rn(),{lua_assert:Re}=yn(),Ue=_l(),Pe=Mn(),ce=xa(),ae=fr(),R=sa(),Oe=Ra(),me=ce.OpCodesI,W=Pe.TValue,_e=255,H=-1,D={OPR_ADD:0,OPR_SUB:1,OPR_MUL:2,OPR_MOD:3,OPR_POW:4,OPR_DIV:5,OPR_IDIV:6,OPR_BAND:7,OPR_BOR:8,OPR_BXOR:9,OPR_SHL:10,OPR_SHR:11,OPR_CONCAT:12,OPR_EQ:13,OPR_LT:14,OPR_LE:15,OPR_NE:16,OPR_GT:17,OPR_GE:18,OPR_AND:19,OPR_OR:20,OPR_NOBINOPR:21},Ce={OPR_MINUS:0,OPR_BNOT:1,OPR_NOT:2,OPR_LEN:3,OPR_NOUNOPR:4},ve=function(l){return l.t!==l.f},ze=function(l,n){let u=ae.expkind;if(ve(l))return!1;switch(l.k){case u.VKINT:return n?new W(ye,l.u.ival):!0;case u.VKFLT:return n?new W(Le,l.u.nval):!0;default:return!1}},de=function(l,n,u){let s,C=n+u-1;if(l.pc>l.lasttarget&&(s=l.f.code[l.pc-1],s.opcode===me.OP_LOADNIL)){let re=s.A,Ve=re+s.B;if(re<=n&&n<=Ve+1||n<=re&&re<=C+1){re<n&&(n=re),Ve>C&&(C=Ve),ce.SETARG_A(s,n),ce.SETARG_B(s,C-n);return}}tt(l,me.OP_LOADNIL,n,u-1,0)},Ye=function(l,n){return l.f.code[n.u.info]},Je=function(l,n){let u=l.f.code[n].sBx;return u===H?H:n+1+u},x=function(l,n,u){let s=l.f.code[n],C=u-(n+1);Re(u!==H),Math.abs(C)>ce.MAXARG_sBx&&Ue.luaX_syntaxerror(l.ls,ut("control structure too long",!0)),ce.SETARG_sBx(s,C)},Y=function(l,n,u){if(u===H)return n;if(n===H)n=u;else{let s=n,C=Je(l,s);for(;C!==H;)s=C,C=Je(l,s);x(l,s,u)}return n},X=function(l){let n=l.jpc;l.jpc=H;let u=we(l,me.OP_JMP,0,H);return u=Y(l,u,n),u},he=function(l,n){return bt(l,X(l),n)},ee=function(l,n,u){tt(l,me.OP_RETURN,n,u+1,0)},ne=function(l,n,u,s,C){return tt(l,n,u,s,C),X(l)},je=function(l){return l.lasttarget=l.pc,l.pc},nt=function(l,n){return n>=1&&ce.testTMode(l.f.code[n-1].opcode)?n-1:n},at=function(l,n){return l.f.code[nt(l,n)]},ft=function(l,n,u){let s=nt(l,n),C=l.f.code[s];return C.opcode!==me.OP_TESTSET?!1:(u!==ce.NO_REG&&u!==C.B?ce.SETARG_A(C,u):l.f.code[s]=ce.CREATE_ABC(me.OP_TEST,C.B,0,C.C),!0)},ct=function(l,n){for(;n!==H;n=Je(l,n))ft(l,n,ce.NO_REG)},ht=function(l,n,u,s,C){for(;n!==H;){let re=Je(l,n);ft(l,n,s)?x(l,n,u):x(l,n,C),n=re}},pt=function(l){ht(l,l.jpc,l.pc,ce.NO_REG,l.pc),l.jpc=H},Et=function(l,n){je(l),l.jpc=Y(l,l.jpc,n)},bt=function(l,n,u){u===l.pc?Et(l,n):(Re(u<l.pc),ht(l,n,u,ce.NO_REG,u))},Ze=function(l,n,u){for(u++;n!==H;n=Je(l,n)){let s=l.f.code[n];Re(s.opcode===me.OP_JMP&&(s.A===0||s.A>=u)),ce.SETARG_A(s,u)}},St=function(l,n){let u=l.f;return pt(l),u.code[l.pc]=n,u.lineinfo[l.pc]=l.ls.lastline,l.pc++},tt=function(l,n,u,s,C){return Re(ce.getOpMode(n)===ce.iABC),Re(ce.getBMode(n)!==ce.OpArgN||s===0),Re(ce.getCMode(n)!==ce.OpArgN||C===0),Re(u<=ce.MAXARG_A&&s<=ce.MAXARG_B&&C<=ce.MAXARG_C),St(l,ce.CREATE_ABC(n,u,s,C))},gt=function(l,n,u,s){return Re(ce.getOpMode(n)===ce.iABx||ce.getOpMode(n)===ce.iAsBx),Re(ce.getCMode(n)===ce.OpArgN),Re(u<=ce.MAXARG_A&&s<=ce.MAXARG_Bx),St(l,ce.CREATE_ABx(n,u,s))},we=function(l,n,u,s){return gt(l,n,u,s+ce.MAXARG_sBx)},K=function(l,n){return Re(n<=ce.MAXARG_Ax),St(l,ce.CREATE_Ax(me.OP_EXTRAARG,n))},I=function(l,n,u){if(u<=ce.MAXARG_Bx)return gt(l,me.OP_LOADK,n,u);{let s=gt(l,me.OP_LOADKX,n,0);return K(l,u),s}},O=function(l,n){let u=l.freereg+n;u>l.f.maxstacksize&&(u>=_e&&Ue.luaX_syntaxerror(l.ls,ut("function or expression needs too many registers",!0)),l.f.maxstacksize=u)},A=function(l,n){O(l,n),l.freereg+=n},g=function(l,n){!ce.ISK(n)&&n>=l.nactvar&&(l.freereg--,Re(n===l.freereg))},v=function(l,n){n.k===ae.expkind.VNONRELOC&&g(l,n.u.info)},B=function(l,n,u){let s=n.k===ae.expkind.VNONRELOC?n.u.info:-1,C=u.k===ae.expkind.VNONRELOC?u.u.info:-1;s>C?(g(l,s),g(l,C)):(g(l,C),g(l,s))},ue=function(l,n,u){let s=l.f,C=R.luaH_get(l.L,l.ls.h,n);if(C.ttisinteger()){let Ve=C.value;if(Ve<l.nk&&s.k[Ve].ttype()===u.ttype()&&s.k[Ve].value===u.value)return Ve}let re=l.nk;return R.luaH_setfrom(l.L,l.ls.h,n,new Pe.TValue(ye,re)),s.k[re]=u,l.nk++,re},ot=function(l,n){let u=new W(J,n);return ue(l,u,u)},st=function(l,n){let u=new W(Te,n),s=new W(ye,n);return ue(l,u,s)},Fe=function(l,n){let u=new W(Le,n);return ue(l,u,u)},y=function(l,n){let u=new W(Q,n);return ue(l,u,u)},V=function(l){let n=new W(Me,null),u=new W(Ke,l.ls.h);return ue(l,u,n)},Ae=function(l,n,u){let s=ae.expkind;if(n.k===s.VCALL)ce.SETARG_C(Ye(l,n),u+1);else if(n.k===s.VVARARG){let C=Ye(l,n);ce.SETARG_B(C,u+1),ce.SETARG_A(C,l.freereg),A(l,1)}else Re(u===d)},De=function(l,n){Ae(l,n,d)},qe=function(l,n){let u=ae.expkind;n.k===u.VCALL?(Re(Ye(l,n).C===2),n.k=u.VNONRELOC,n.u.info=Ye(l,n).A):n.k===u.VVARARG&&(ce.SETARG_B(Ye(l,n),2),n.k=u.VRELOCABLE)},_=function(l,n){let u=ae.expkind;switch(n.k){case u.VLOCAL:{n.k=u.VNONRELOC;break}case u.VUPVAL:{n.u.info=tt(l,me.OP_GETUPVAL,0,n.u.info,0),n.k=u.VRELOCABLE;break}case u.VINDEXED:{let s;g(l,n.u.ind.idx),n.u.ind.vt===u.VLOCAL?(g(l,n.u.ind.t),s=me.OP_GETTABLE):(Re(n.u.ind.vt===u.VUPVAL),s=me.OP_GETTABUP),n.u.info=tt(l,s,0,n.u.ind.t,n.u.ind.idx),n.k=u.VRELOCABLE;break}case u.VVARARG:case u.VCALL:{qe(l,n);break}}},te=function(l,n,u,s){return je(l),tt(l,me.OP_LOADBOOL,n,u,s)},P=function(l,n,u){let s=ae.expkind;switch(_(l,n),n.k){case s.VNIL:{de(l,u,1);break}case s.VFALSE:case s.VTRUE:{tt(l,me.OP_LOADBOOL,u,n.k===s.VTRUE,0);break}case s.VK:{I(l,u,n.u.info);break}case s.VKFLT:{I(l,u,Fe(l,n.u.nval));break}case s.VKINT:{I(l,u,st(l,n.u.ival));break}case s.VRELOCABLE:{let C=Ye(l,n);ce.SETARG_A(C,u);break}case s.VNONRELOC:{u!==n.u.info&&tt(l,me.OP_MOVE,u,n.u.info,0);break}default:{Re(n.k===s.VJMP);return}}n.u.info=u,n.k=s.VNONRELOC},se=function(l,n){n.k!==ae.expkind.VNONRELOC&&(A(l,1),P(l,n,l.freereg-1))},Ne=function(l,n){for(;n!==H;n=Je(l,n))if(at(l,n).opcode!==me.OP_TESTSET)return!0;return!1},it=function(l,n,u){let s=ae.expkind;if(P(l,n,u),n.k===s.VJMP&&(n.t=Y(l,n.t,n.u.info)),ve(n)){let C,re=H,Ve=H;if(Ne(l,n.t)||Ne(l,n.f)){let dt=n.k===s.VJMP?H:X(l);re=te(l,u,0,1),Ve=te(l,u,1,0),Et(l,dt)}C=je(l),ht(l,n.f,C,u,re),ht(l,n.t,C,u,Ve)}n.f=n.t=H,n.u.info=u,n.k=s.VNONRELOC},Qe=function(l,n){_(l,n),v(l,n),A(l,1),it(l,n,l.freereg-1)},Rt=function(l,n){if(_(l,n),n.k===ae.expkind.VNONRELOC){if(!ve(n))return n.u.info;if(n.u.info>=l.nactvar)return it(l,n,n.u.info),n.u.info}return Qe(l,n),n.u.info},kt=function(l,n){(n.k!==ae.expkind.VUPVAL||ve(n))&&Rt(l,n)},yt=function(l,n){ve(n)?Rt(l,n):_(l,n)},vt=function(l,n){let u=ae.expkind,s=!1;switch(yt(l,n),n.k){case u.VTRUE:n.u.info=y(l,!0),s=!0;break;case u.VFALSE:n.u.info=y(l,!1),s=!0;break;case u.VNIL:n.u.info=V(l),s=!0;break;case u.VKINT:n.u.info=st(l,n.u.ival),s=!0;break;case u.VKFLT:n.u.info=Fe(l,n.u.nval),s=!0;break;case u.VK:s=!0;break}return s&&(n.k=u.VK,n.u.info<=ce.MAXINDEXRK)?ce.RKASK(n.u.info):Rt(l,n)},Wt=function(l,n,u){let s=ae.expkind;switch(n.k){case s.VLOCAL:{v(l,u),it(l,u,n.u.info);return}case s.VUPVAL:{let C=Rt(l,u);tt(l,me.OP_SETUPVAL,C,n.u.info,0);break}case s.VINDEXED:{let C=n.u.ind.vt===s.VLOCAL?me.OP_SETTABLE:me.OP_SETTABUP,re=vt(l,u);tt(l,C,n.u.ind.t,n.u.ind.idx,re);break}}v(l,u)},Gt=function(l,n,u){Rt(l,n);let s=n.u.info;v(l,n),n.u.info=l.freereg,n.k=ae.expkind.VNONRELOC,A(l,2),tt(l,me.OP_SELF,n.u.info,s,vt(l,u)),v(l,u)},Nt=function(l,n){let u=at(l,n.u.info);Re(ce.testTMode(u.opcode)&&u.opcode!==me.OP_TESTSET&&u.opcode!==me.OP_TEST),ce.SETARG_A(u,!u.A)},Dt=function(l,n,u){if(n.k===ae.expkind.VRELOCABLE){let s=Ye(l,n);if(s.opcode===me.OP_NOT)return l.pc--,ne(l,me.OP_TEST,s.B,0,!u)}return se(l,n),v(l,n),ne(l,me.OP_TESTSET,ce.NO_REG,n.u.info,u)},Vt=function(l,n){let u=ae.expkind,s;switch(_(l,n),n.k){case u.VJMP:{Nt(l,n),s=n.u.info;break}case u.VK:case u.VKFLT:case u.VKINT:case u.VTRUE:{s=H;break}default:{s=Dt(l,n,0);break}}n.f=Y(l,n.f,s),Et(l,n.t),n.t=H},Ht=function(l,n){let u=ae.expkind,s;switch(_(l,n),n.k){case u.VJMP:{s=n.u.info;break}case u.VNIL:case u.VFALSE:{s=H;break}default:{s=Dt(l,n,1);break}}n.t=Y(l,n.t,s),Et(l,n.f),n.f=H},Lt=function(l,n){let u=ae.expkind;switch(_(l,n),n.k){case u.VNIL:case u.VFALSE:{n.k=u.VTRUE;break}case u.VK:case u.VKFLT:case u.VKINT:case u.VTRUE:{n.k=u.VFALSE;break}case u.VJMP:{Nt(l,n);break}case u.VRELOCABLE:case u.VNONRELOC:{se(l,n),v(l,n),n.u.info=tt(l,me.OP_NOT,0,n.u.info,0),n.k=u.VRELOCABLE;break}}{let s=n.f;n.f=n.t,n.t=s}ct(l,n.f),ct(l,n.t)},Kt=function(l,n,u){let s=ae.expkind;Re(!ve(n)&&(ae.vkisinreg(n.k)||n.k===s.VUPVAL)),n.u.ind.t=n.u.info,n.u.ind.idx=vt(l,u),n.u.ind.vt=n.k===s.VUPVAL?s.VUPVAL:s.VLOCAL,n.k=s.VINDEXED},Xt=function(l,n,u){switch(l){case m:case N:case U:case Se:case q:case E:return Oe.tointeger(n)!==!1&&Oe.tointeger(u)!==!1;case $:case ge:case ie:return u.value!==0;default:return 1}},F=function(l,n,u){let s=ae.expkind,C,re;if(!(C=ze(n,!0))||!(re=ze(u,!0))||!Xt(l,C,re))return 0;let Ve=new W;if(Pe.luaO_arith(null,l,C,re,Ve),Ve.ttisinteger())n.k=s.VKINT,n.u.ival=Ve.value;else{let dt=Ve.value;if(isNaN(dt)||dt===0)return!1;n.k=s.VKFLT,n.u.nval=dt}return!0},T=function(l,n,u,s){let C=Rt(l,u);v(l,u),u.u.info=tt(l,n,0,C,0),u.k=ae.expkind.VRELOCABLE,He(l,s)},Ee=function(l,n,u,s,C){let re=vt(l,s),Ve=vt(l,u);B(l,u,s),u.u.info=tt(l,n,0,Ve,re),u.k=ae.expkind.VRELOCABLE,He(l,C)},We=function(l,n,u,s){let C=ae.expkind,re;u.k===C.VK?re=ce.RKASK(u.u.info):(Re(u.k===C.VNONRELOC),re=u.u.info);let Ve=vt(l,s);switch(B(l,u,s),n){case D.OPR_NE:{u.u.info=ne(l,me.OP_EQ,0,re,Ve);break}case D.OPR_GT:case D.OPR_GE:{let dt=n-D.OPR_NE+me.OP_EQ;u.u.info=ne(l,dt,1,Ve,re);break}default:{let dt=n-D.OPR_EQ+me.OP_EQ;u.u.info=ne(l,dt,1,re,Ve);break}}u.k=C.VJMP},b=function(l,n,u,s){let C=new ae.expdesc;switch(C.k=ae.expkind.VKINT,C.u.ival=C.u.nval=C.u.info=0,C.t=H,C.f=H,n){case Ce.OPR_MINUS:case Ce.OPR_BNOT:if(F(n+Z,u,C))break;case Ce.OPR_LEN:T(l,n+me.OP_UNM,u,s);break;case Ce.OPR_NOT:Lt(l,u);break}},fe=function(l,n,u){switch(n){case D.OPR_AND:{Vt(l,u);break}case D.OPR_OR:{Ht(l,u);break}case D.OPR_CONCAT:{Qe(l,u);break}case D.OPR_ADD:case D.OPR_SUB:case D.OPR_MUL:case D.OPR_DIV:case D.OPR_IDIV:case D.OPR_MOD:case D.OPR_POW:case D.OPR_BAND:case D.OPR_BOR:case D.OPR_BXOR:case D.OPR_SHL:case D.OPR_SHR:{ze(u,!1)||vt(l,u);break}default:{vt(l,u);break}}},oe=function(l,n,u,s,C){let re=ae.expkind;switch(n){case D.OPR_AND:{Re(u.t===H),_(l,s),s.f=Y(l,s.f,u.f),u.to(s);break}case D.OPR_OR:{Re(u.f===H),_(l,s),s.t=Y(l,s.t,u.t),u.to(s);break}case D.OPR_CONCAT:{yt(l,s);let Ve=Ye(l,s);s.k===re.VRELOCABLE&&Ve.opcode===me.OP_CONCAT?(Re(u.u.info===Ve.B-1),v(l,u),ce.SETARG_B(Ve,u.u.info),u.k=re.VRELOCABLE,u.u.info=s.u.info):(Qe(l,s),Ee(l,me.OP_CONCAT,u,s,C));break}case D.OPR_ADD:case D.OPR_SUB:case D.OPR_MUL:case D.OPR_DIV:case D.OPR_IDIV:case D.OPR_MOD:case D.OPR_POW:case D.OPR_BAND:case D.OPR_BOR:case D.OPR_BXOR:case D.OPR_SHL:case D.OPR_SHR:{F(n+o,u,s)||Ee(l,n+me.OP_ADD,u,s,C);break}case D.OPR_EQ:case D.OPR_LT:case D.OPR_LE:case D.OPR_NE:case D.OPR_GT:case D.OPR_GE:{We(l,n,u,s);break}}return u},He=function(l,n){l.f.lineinfo[l.pc-1]=n},At=function(l,n,u,s){let C=(u-1)/ce.LFIELDS_PER_FLUSH+1,re=s===d?0:s;Re(s!==0&&s<=ce.LFIELDS_PER_FLUSH),C<=ce.MAXARG_C?tt(l,me.OP_SETLIST,n,re,C):C<=ce.MAXARG_Ax?(tt(l,me.OP_SETLIST,n,re,0),K(l,C)):Ue.luaX_syntaxerror(l.ls,ut("constructor too long",!0)),l.freereg=n+1};return xt.BinOpr=D,xt.NO_JUMP=H,xt.UnOpr=Ce,xt.getinstruction=Ye,xt.luaK_checkstack=O,xt.luaK_code=St,xt.luaK_codeABC=tt,xt.luaK_codeABx=gt,xt.luaK_codeAsBx=we,xt.luaK_codek=I,xt.luaK_concat=Y,xt.luaK_dischargevars=_,xt.luaK_exp2RK=vt,xt.luaK_exp2anyreg=Rt,xt.luaK_exp2anyregup=kt,xt.luaK_exp2nextreg=Qe,xt.luaK_exp2val=yt,xt.luaK_fixline=He,xt.luaK_getlabel=je,xt.luaK_goiffalse=Ht,xt.luaK_goiftrue=Vt,xt.luaK_indexed=Kt,xt.luaK_infix=fe,xt.luaK_intK=st,xt.luaK_jump=X,xt.luaK_jumpto=he,xt.luaK_nil=de,xt.luaK_numberK=Fe,xt.luaK_patchclose=Ze,xt.luaK_patchlist=bt,xt.luaK_patchtohere=Et,xt.luaK_posfix=oe,xt.luaK_prefix=b,xt.luaK_reserveregs=A,xt.luaK_ret=ee,xt.luaK_self=Gt,xt.luaK_setlist=At,xt.luaK_setmultret=De,xt.luaK_setoneret=qe,xt.luaK_setreturns=Ae,xt.luaK_storevar=Wt,xt.luaK_stringK=ot,xt}var Cl;function fr(){if(Cl)return ka;Cl=1;const{LUA_MULTRET:d,to_luastring:o}=rn(),{BinOpr:{OPR_ADD:m,OPR_AND:E,OPR_BAND:N,OPR_BOR:U,OPR_BXOR:$,OPR_CONCAT:ge,OPR_DIV:ie,OPR_EQ:Se,OPR_GE:q,OPR_GT:Z,OPR_IDIV:Q,OPR_LE:Te,OPR_LT:J,OPR_MOD:Me,OPR_MUL:Le,OPR_NE:ye,OPR_NOBINOPR:Ke,OPR_OR:ut,OPR_POW:Re,OPR_SHL:Ue,OPR_SHR:Pe,OPR_SUB:ce},UnOpr:{OPR_BNOT:ae,OPR_LEN:R,OPR_MINUS:Oe,OPR_NOT:me,OPR_NOUNOPR:W},NO_JUMP:_e,getinstruction:H,luaK_checkstack:D,luaK_codeABC:Ce,luaK_codeABx:ve,luaK_codeAsBx:ze,luaK_codek:de,luaK_concat:Ye,luaK_dischargevars:Je,luaK_exp2RK:x,luaK_exp2anyreg:Y,luaK_exp2anyregup:X,luaK_exp2nextreg:he,luaK_exp2val:ee,luaK_fixline:ne,luaK_getlabel:je,luaK_goiffalse:nt,luaK_goiftrue:at,luaK_indexed:ft,luaK_infix:ct,luaK_intK:ht,luaK_jump:pt,luaK_jumpto:Et,luaK_nil:bt,luaK_patchclose:Ze,luaK_patchlist:St,luaK_patchtohere:tt,luaK_posfix:gt,luaK_prefix:we,luaK_reserveregs:K,luaK_ret:I,luaK_self:O,luaK_setlist:A,luaK_setmultret:g,luaK_setoneret:v,luaK_setreturns:B,luaK_storevar:ue,luaK_stringK:ot}=is(),st=Yn(),Fe=Ma(),y=_l(),{LUAI_MAXCCALLS:V,MAX_INT:Ae,lua_assert:De}=yn(),qe=Mn(),{OpCodesI:{OP_CALL:_,OP_CLOSURE:te,OP_FORLOOP:P,OP_FORPREP:se,OP_GETUPVAL:Ne,OP_MOVE:it,OP_NEWTABLE:Qe,OP_SETTABLE:Rt,OP_TAILCALL:kt,OP_TFORCALL:yt,OP_TFORLOOP:vt,OP_VARARG:Wt},LFIELDS_PER_FLUSH:Gt,SETARG_B:Nt,SETARG_C:Dt,SET_OPCODE:Vt}=xa(),{luaS_eqlngstr:Ht,luaS_new:Lt,luaS_newliteral:Kt}=ra(),Xt=sa(),F=Fe.Proto,T=y.RESERVED,Ee=200,We=function(a){return a===oe.VCALL||a===oe.VVARARG},b=function(a,h){return Ht(a,h)};class fe{constructor(){this.previous=null,this.firstlabel=NaN,this.firstgoto=NaN,this.nactvar=NaN,this.upval=NaN,this.isloop=NaN}}const oe={VVOID:0,VNIL:1,VTRUE:2,VFALSE:3,VK:4,VKFLT:5,VKINT:6,VNONRELOC:7,VLOCAL:8,VUPVAL:9,VINDEXED:10,VJMP:11,VRELOCABLE:12,VCALL:13,VVARARG:14},He=function(a){return oe.VLOCAL<=a&&a<=oe.VINDEXED},At=function(a){return a===oe.VNONRELOC||a===oe.VLOCAL};class l{constructor(){this.k=NaN,this.u={ival:NaN,nval:NaN,info:NaN,ind:{idx:NaN,t:NaN,vt:NaN}},this.t=NaN,this.f=NaN}to(h){this.k=h.k,this.u=h.u,this.t=h.t,this.f=h.f}}class n{constructor(){this.f=null,this.prev=null,this.ls=null,this.bl=null,this.pc=NaN,this.lasttarget=NaN,this.jpc=NaN,this.nk=NaN,this.np=NaN,this.firstlocal=NaN,this.nlocvars=NaN,this.nactvar=NaN,this.nups=NaN,this.freereg=NaN}}class u{constructor(){this.idx=NaN}}class s{constructor(){this.name=null,this.pc=NaN,this.line=NaN,this.nactvar=NaN}}class C{constructor(){this.arr=[],this.n=NaN,this.size=NaN}}class re{constructor(){this.actvar={arr:[],n:NaN,size:NaN},this.gt=new C,this.label=new C}}const Ve=function(a,h){a.t.token=0,y.luaX_syntaxerror(a,h)},dt=function(a,h){y.luaX_syntaxerror(a,qe.luaO_pushfstring(a.L,o("%s expected",!0),y.luaX_token2str(a,h)))},Pt=function(a,h,S){let L=a.ls.L,xe=a.f.linedefined,et=xe===0?o("main function",!0):qe.luaO_pushfstring(L,o("function at line %d",!0),xe),wt=qe.luaO_pushfstring(L,o("too many %s (limit is %d) in %s",!0),S,h,et);y.luaX_syntaxerror(a.ls,wt)},Bt=function(a,h,S,L){h>S&&Pt(a,S,L)},Ft=function(a,h){return a.t.token===h?(y.luaX_next(a),!0):!1},sn=function(a,h){a.t.token!==h&&dt(a,h)},jt=function(a,h){sn(a,h),y.luaX_next(a)},f=function(a,h,S){h||y.luaX_syntaxerror(a,S)},G=function(a,h,S,L){Ft(a,h)||(L===a.linenumber?dt(a,h):y.luaX_syntaxerror(a,qe.luaO_pushfstring(a.L,o("%s expected (to close %s at line %d)"),y.luaX_token2str(a,h),y.luaX_token2str(a,S),L)))},be=function(a){sn(a,T.TK_NAME);let h=a.t.seminfo.ts;return y.luaX_next(a),h},pe=function(a,h,S){a.f=a.t=_e,a.k=h,a.u.info=S},Xe=function(a,h,S){pe(h,oe.VK,ot(a.fs,S))},ke=function(a,h){Xe(a,h,be(a))},Ie=function(a,h){let S=a.fs,L=S.f;return L.locvars[S.nlocvars]=new qe.LocVar,L.locvars[S.nlocvars].varname=h,S.nlocvars++},Mt=function(a,h){let S=a.fs,L=a.dyd,xe=Ie(a,h);Bt(S,L.actvar.n+1-S.firstlocal,Ee,o("local variables",!0)),L.actvar.arr[L.actvar.n]=new u,L.actvar.arr[L.actvar.n].idx=xe,L.actvar.n++},le=function(a,h){Mt(a,y.luaX_newstring(a,o(h,!0)))},Be=function(a,h){let S=a.ls.dyd.actvar.arr[a.firstlocal+h].idx;return De(S<a.nlocvars),a.f.locvars[S]},$e=function(a,h){let S=a.fs;for(S.nactvar=S.nactvar+h;h;h--)Be(S,S.nactvar-h).startpc=S.pc},Ot=function(a,h){for(a.ls.dyd.actvar.n-=a.nactvar-h;a.nactvar>h;)Be(a,--a.nactvar).endpc=a.pc},nn=function(a,h){let S=a.f.upvalues;for(let L=0;L<a.nups;L++)if(b(S[L].name,h))return L;return-1},on=function(a,h,S){let L=a.f;return Bt(a,a.nups+1,Fe.MAXUPVAL,o("upvalues",!0)),L.upvalues[a.nups]={instack:S.k===oe.VLOCAL,idx:S.u.info,name:h},a.nups++},gn=function(a,h){for(let S=a.nactvar-1;S>=0;S--)if(b(h,Be(a,S).varname))return S;return-1},Sn=function(a,h){let S=a.bl;for(;S.nactvar>h;)S=S.previous;S.upval=1},un=function(a,h,S,L){if(a===null)pe(S,oe.VVOID,0);else{let xe=gn(a,h);if(xe>=0)pe(S,oe.VLOCAL,xe),L||Sn(a,xe);else{let et=nn(a,h);if(et<0){if(un(a.prev,h,S,0),S.k===oe.VVOID)return;et=on(a,h,S)}pe(S,oe.VUPVAL,et)}}},Fn=function(a,h){let S=be(a),L=a.fs;if(un(L,S,h,1),h.k===oe.VVOID){let xe=new l;un(L,a.envn,h,1),De(h.k!==oe.VVOID),Xe(a,xe,S),ft(L,h,xe)}},Zn=function(a,h,S,L){let xe=a.fs,et=h-S;if(We(L.k))et++,et<0&&(et=0),B(xe,L,et),et>1&&K(xe,et-1);else if(L.k!==oe.VVOID&&he(xe,L),et>0){let wt=xe.freereg;K(xe,et),bt(xe,wt,et)}S>h&&(a.fs.freereg-=S-h)},On=function(a){let h=a.L;++h.nCcalls,Bt(a.fs,h.nCcalls,V,o("JS levels",!0))},Gn=function(a){return a.L.nCcalls--},Vn=function(a,h,S){let L=a.fs,xe=a.dyd.gt,et=xe.arr[h];if(De(b(et.name,S.name)),et.nactvar<S.nactvar){let wt=Be(L,et.nactvar).varname,Tn=qe.luaO_pushfstring(a.L,o("<goto %s> at line %d jumps into the scope of local '%s'"),et.name.getstr(),et.line,wt.getstr());Ve(a,Tn)}St(L,et.pc,S.pc);for(let wt=h;wt<xe.n-1;wt++)xe.arr[wt]=xe.arr[wt+1];xe.n--},oa=function(a,h){let S=a.fs.bl,L=a.dyd,xe=L.gt.arr[h];for(let et=S.firstlabel;et<L.label.n;et++){let wt=L.label.arr[et];if(b(wt.name,xe.name))return xe.nactvar>wt.nactvar&&(S.upval||L.label.n>S.firstlabel)&&Ze(a.fs,xe.pc,wt.nactvar),Vn(a,h,wt),!0}return!1},An=function(a,h,S,L,xe){let et=h.n;return h.arr[et]=new s,h.arr[et].name=S,h.arr[et].line=L,h.arr[et].nactvar=a.fs.nactvar,h.arr[et].pc=xe,h.n=et+1,et},Ln=function(a,h){let S=a.dyd.gt,L=a.fs.bl.firstgoto;for(;L<S.n;)b(S.arr[L].name,h.name)?Vn(a,L,h):L++},ga=function(a,h){let S=h.firstgoto,L=a.ls.dyd.gt;for(;S<L.n;){let xe=L.arr[S];xe.nactvar>h.nactvar&&(h.upval&&Ze(a,xe.pc,h.nactvar),xe.nactvar=h.nactvar),oa(a.ls,S)||S++}},fn=function(a,h,S){h.isloop=S,h.nactvar=a.nactvar,h.firstlabel=a.ls.dyd.label.n,h.firstgoto=a.ls.dyd.gt.n,h.upval=0,h.previous=a.bl,a.bl=h,De(a.freereg===a.nactvar)},ia=function(a){let h=Kt(a.L,"break"),S=An(a,a.dyd.label,h,0,a.fs.pc);Ln(a,a.dyd.label.arr[S])},Jn=function(a,h){let S=y.isreserved(h.name)?"<%s> at line %d not inside a loop":"no visible label '%s' for <goto> at line %d";S=qe.luaO_pushfstring(a.L,o(S),h.name.getstr(),h.line),Ve(a,S)},$n=function(a){let h=a.L,S=new F(h),L=a.fs,xe=L.f;return xe.p[L.np++]=S,S},Aa=function(a,h){let S=a.fs.prev;pe(h,oe.VRELOCABLE,ve(S,te,0,S.np-1)),he(S,h)},ua=function(a,h,S){h.prev=a.fs,h.ls=a,a.fs=h,h.pc=0,h.lasttarget=0,h.jpc=_e,h.freereg=0,h.nk=0,h.np=0,h.nups=0,h.nlocvars=0,h.nactvar=0,h.firstlocal=a.dyd.actvar.n,h.bl=null;let L=h.f;L.source=a.source,L.maxstacksize=2,fn(h,S,!1)},_n=function(a){let h=a.bl,S=a.ls;if(h.previous&&h.upval){let L=pt(a);Ze(a,L,h.nactvar),tt(a,L)}h.isloop&&ia(S),a.bl=h.previous,Ot(a,h.nactvar),De(h.nactvar===a.nactvar),a.freereg=a.nactvar,S.dyd.label.n=h.firstlabel,h.previous?ga(a,h):h.firstgoto<S.dyd.gt.n&&Jn(S,S.dyd.gt.arr[h.firstgoto])},Hn=function(a){let h=a.fs;I(h,0,0),_n(h),De(h.bl===null),a.fs=h.prev},Nn=function(a,h){switch(a.t.token){case T.TK_ELSE:case T.TK_ELSEIF:case T.TK_END:case T.TK_EOS:return!0;case T.TK_UNTIL:return h;default:return!1}},Cn=function(a){for(;!Nn(a,1);){if(a.t.token===T.TK_RETURN){za(a);return}za(a)}},Qn=function(a,h){let S=a.fs,L=new l;X(S,h),y.luaX_next(a),ke(a,L),ft(S,h,L)},dn=function(a,h){y.luaX_next(a),r(a,h),ee(a.fs,h),jt(a,93)};class Pn{constructor(){this.v=new l,this.t=new l,this.nh=NaN,this.na=NaN,this.tostore=NaN}}const xn=function(a,h){let S=a.fs,L=a.fs.freereg,xe=new l,et=new l;a.t.token===T.TK_NAME?(Bt(S,h.nh,Ae,o("items in a constructor",!0)),ke(a,xe)):dn(a,xe),h.nh++,jt(a,61);let wt=x(S,xe);r(a,et),Ce(S,Rt,h.t.u.info,wt,x(S,et)),S.freereg=L},ma=function(a,h){h.v.k!==oe.VVOID&&(he(a,h.v),h.v.k=oe.VVOID,h.tostore===Gt&&(A(a,h.t.u.info,h.na,h.tostore),h.tostore=0))},Dn=function(a,h){h.tostore!==0&&(We(h.v.k)?(g(a,h.v),A(a,h.t.u.info,h.na,d),h.na--):(h.v.k!==oe.VVOID&&he(a,h.v),A(a,h.t.u.info,h.na,h.tostore)))},mn=function(a,h){r(a,h.v),Bt(a.fs,h.na,Ae,o("items in a constructor",!0)),h.na++,h.tostore++},ca=function(a,h){switch(a.t.token){case T.TK_NAME:{y.luaX_lookahead(a)!==61?mn(a,h):xn(a,h);break}case 91:{xn(a,h);break}default:{mn(a,h);break}}},ea=function(a,h){let S=a.fs,L=a.linenumber,xe=Ce(S,Qe,0,0,0),et=new Pn;et.na=et.nh=et.tostore=0,et.t=h,pe(h,oe.VRELOCABLE,xe),pe(et.v,oe.VVOID,0),he(a.fs,h),jt(a,123);do{if(De(et.v.k===oe.VVOID||et.tostore>0),a.t.token===125)break;ma(S,et),ca(a,et)}while(Ft(a,44)||Ft(a,59));G(a,125,123,L),Dn(S,et),Nt(S.f.code[xe],qe.luaO_int2fb(et.na)),Dt(S.f.code[xe],qe.luaO_int2fb(et.nh))},ba=function(a){let h=a.fs,S=h.f,L=0;if(S.is_vararg=!1,a.t.token!==41)do switch(a.t.token){case T.TK_NAME:{Mt(a,be(a)),L++;break}case T.TK_DOTS:{y.luaX_next(a),S.is_vararg=!0;break}default:y.luaX_syntaxerror(a,o("<name> or '...' expected",!0))}while(!S.is_vararg&&Ft(a,44));$e(a,L),S.numparams=h.nactvar,K(h,h.nactvar)},Bn=function(a,h,S,L){let xe=new n,et=new fe;xe.f=$n(a),xe.f.linedefined=L,ua(a,xe,et),jt(a,40),S&&(le(a,"self"),$e(a,1)),ba(a),jt(a,41),Cn(a),xe.f.lastlinedefined=a.linenumber,G(a,T.TK_END,T.TK_FUNCTION,L),Aa(a,h),Hn(a)},bn=function(a,h){let S=1;for(r(a,h);Ft(a,44);)he(a.fs,h),r(a,h),S++;return S},fa=function(a,h,S){let L=a.fs,xe=new l;switch(a.t.token){case 40:{y.luaX_next(a),a.t.token===41?xe.k=oe.VVOID:(bn(a,xe),g(L,xe)),G(a,41,40,S);break}case 123:{ea(a,xe);break}case T.TK_STRING:{Xe(a,xe,a.t.seminfo.ts),y.luaX_next(a);break}default:y.luaX_syntaxerror(a,o("function arguments expected",!0))}De(h.k===oe.VNONRELOC);let et,wt=h.u.info;We(xe.k)?et=d:(xe.k!==oe.VVOID&&he(L,xe),et=L.freereg-(wt+1)),pe(h,oe.VCALL,Ce(L,_,wt,et+1,2)),ne(L,S),L.freereg=wt+1},Ta=function(a,h){switch(a.t.token){case 40:{let S=a.linenumber;y.luaX_next(a),r(a,h),G(a,41,40,S),Je(a.fs,h);return}case T.TK_NAME:{Fn(a,h);return}default:y.luaX_syntaxerror(a,o("unexpected symbol",!0))}},Xn=function(a,h){let S=a.fs,L=a.linenumber;for(Ta(a,h);;)switch(a.t.token){case 46:{Qn(a,h);break}case 91:{let xe=new l;X(S,h),dn(a,xe),ft(S,h,xe);break}case 58:{let xe=new l;y.luaX_next(a),ke(a,xe),O(S,h,xe),fa(a,h,L);break}case 40:case T.TK_STRING:case 123:{he(S,h),fa(a,h,L);break}default:return}},Ea=function(a,h){switch(a.t.token){case T.TK_FLT:{pe(h,oe.VKFLT,0),h.u.nval=a.t.seminfo.r;break}case T.TK_INT:{pe(h,oe.VKINT,0),h.u.ival=a.t.seminfo.i;break}case T.TK_STRING:{Xe(a,h,a.t.seminfo.ts);break}case T.TK_NIL:{pe(h,oe.VNIL,0);break}case T.TK_TRUE:{pe(h,oe.VTRUE,0);break}case T.TK_FALSE:{pe(h,oe.VFALSE,0);break}case T.TK_DOTS:{let S=a.fs;f(a,S.f.is_vararg,o("cannot use '...' outside a vararg function",!0)),pe(h,oe.VVARARG,Ce(S,Wt,0,1,0));break}case 123:{ea(a,h);return}case T.TK_FUNCTION:{y.luaX_next(a),Bn(a,h,0,a.linenumber);return}default:{Xn(a,h);return}}y.luaX_next(a)},p=function(a){switch(a){case T.TK_NOT:return me;case 45:return Oe;case 126:return ae;case 35:return R;default:return W}},w=function(a){switch(a){case 43:return m;case 45:return ce;case 42:return Le;case 37:return Me;case 94:return Re;case 47:return ie;case T.TK_IDIV:return Q;case 38:return N;case 124:return U;case 126:return $;case T.TK_SHL:return Ue;case T.TK_SHR:return Pe;case T.TK_CONCAT:return ge;case T.TK_NE:return ye;case T.TK_EQ:return Se;case 60:return J;case T.TK_LE:return Te;case 62:return Z;case T.TK_GE:return q;case T.TK_AND:return E;case T.TK_OR:return ut;default:return Ke}},e=[{left:10,right:10},{left:10,right:10},{left:11,right:11},{left:11,right:11},{left:14,right:13},{left:11,right:11},{left:11,right:11},{left:6,right:6},{left:4,right:4},{left:5,right:5},{left:7,right:7},{left:7,right:7},{left:9,right:8},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:2,right:2},{left:1,right:1}],i=12,t=function(a,h,S){On(a);let L=p(a.t.token);if(L!==W){let et=a.linenumber;y.luaX_next(a),t(a,h,i),we(a.fs,L,h,et)}else Ea(a,h);let xe=w(a.t.token);for(;xe!==Ke&&e[xe].left>S;){let et=new l,wt=a.linenumber;y.luaX_next(a),ct(a.fs,xe,h);let Tn=t(a,et,e[xe].right);gt(a.fs,xe,h,et,wt),xe=Tn}return Gn(a),xe},r=function(a,h){t(a,h,0)},c=function(a){let h=a.fs,S=new fe;fn(h,S,0),Cn(a),_n(h)};class k{constructor(){this.prev=null,this.v=new l}}const M=function(a,h,S){let L=a.fs,xe=L.freereg,et=!1;for(;h;h=h.prev)h.v.k===oe.VINDEXED&&(h.v.u.ind.vt===S.k&&h.v.u.ind.t===S.u.info&&(et=!0,h.v.u.ind.vt=oe.VLOCAL,h.v.u.ind.t=xe),S.k===oe.VLOCAL&&h.v.u.ind.idx===S.u.info&&(et=!0,h.v.u.ind.idx=xe));if(et){let wt=S.k===oe.VLOCAL?it:Ne;Ce(L,wt,xe,S.u.info,0),K(L,1)}},z=function(a,h,S){let L=new l;if(f(a,He(h.v.k),o("syntax error",!0)),Ft(a,44)){let xe=new k;xe.prev=h,Xn(a,xe.v),xe.v.k!==oe.VINDEXED&&M(a,h,xe.v),Bt(a.fs,S+a.L.nCcalls,V,o("JS levels",!0)),z(a,xe,S+1)}else{jt(a,61);let xe=bn(a,L);if(xe!==S)Zn(a,S,xe,L);else{v(a.fs,L),ue(a.fs,h.v,L);return}}pe(L,oe.VNONRELOC,a.fs.freereg-1),ue(a.fs,h.v,L)},lt=function(a){let h=new l;return r(a,h),h.k===oe.VNIL&&(h.k=oe.VFALSE),at(a.fs,h),h.f},rt=function(a,h){let S=a.linenumber,L;Ft(a,T.TK_GOTO)?L=be(a):(y.luaX_next(a),L=Kt(a.L,"break"));let xe=An(a,a.dyd.gt,L,S,h);oa(a,xe)},Ct=function(a,h,S){for(let L=a.bl.firstlabel;L<h.n;L++)if(b(S,h.arr[L].name)){let xe=qe.luaO_pushfstring(a.ls.L,o("label '%s' already defined on line %d",!0),S.getstr(),h.arr[L].line);Ve(a.ls,xe)}},zt=function(a){for(;a.t.token===59||a.t.token===T.TK_DBCOLON;)za(a)},It=function(a,h,S){let L=a.fs,xe=a.dyd.label,et;Ct(L,xe,h),jt(a,T.TK_DBCOLON),et=An(a,xe,h,S,je(L)),zt(a),Nn(a,0)&&(xe.arr[et].nactvar=L.bl.nactvar),Ln(a,xe.arr[et])},Ut=function(a,h){let S=a.fs,L=new fe;y.luaX_next(a);let xe=je(S),et=lt(a);fn(S,L,1),jt(a,T.TK_DO),c(a),Et(S,xe),G(a,T.TK_END,T.TK_WHILE,h),_n(S),tt(S,et)},ta=function(a,h){let S=a.fs,L=je(S),xe=new fe,et=new fe;fn(S,xe,1),fn(S,et,0),y.luaX_next(a),Cn(a),G(a,T.TK_UNTIL,T.TK_REPEAT,h);let wt=lt(a);et.upval&&Ze(S,wt,et.nactvar),_n(S),St(S,wt,L),_n(S)},ja=function(a){let h=new l;return r(a,h),he(a.fs,h),De(h.k===oe.VNONRELOC),h.u.info},pl=function(a,h,S,L,xe){let et=new fe,wt=a.fs,Tn;$e(a,3),jt(a,T.TK_DO);let wa=xe?ze(wt,se,h,_e):pt(wt);fn(wt,et,0),$e(a,L),K(wt,L),c(a),_n(wt),tt(wt,wa),xe?Tn=ze(wt,P,h,_e):(Ce(wt,yt,h,0,L),ne(wt,S),Tn=ze(wt,vt,h+2,_e)),St(wt,Tn,wa+1),ne(wt,S)},Kr=function(a,h,S){let L=a.fs,xe=L.freereg;le(a,"(for index)"),le(a,"(for limit)"),le(a,"(for step)"),Mt(a,h),jt(a,61),ja(a),jt(a,44),ja(a),Ft(a,44)?ja(a):(de(L,L.freereg,ht(L,1)),K(L,1)),pl(a,xe,S,1,1)},Fr=function(a,h){let S=a.fs,L=new l,xe=4,et=S.freereg;for(le(a,"(for generator)"),le(a,"(for state)"),le(a,"(for control)"),Mt(a,h);Ft(a,44);)Mt(a,be(a)),xe++;jt(a,T.TK_IN);let wt=a.linenumber;Zn(a,3,bn(a,L),L),D(S,3),pl(a,et,wt,xe-3,0)},Gr=function(a,h){let S=a.fs,L=new fe;fn(S,L,1),y.luaX_next(a);let xe=be(a);switch(a.t.token){case 61:Kr(a,xe,h);break;case 44:case T.TK_IN:Fr(a,xe);break;default:y.luaX_syntaxerror(a,o("'=' or 'in' expected",!0))}G(a,T.TK_END,T.TK_FOR,h),_n(S)},gl=function(a,h){let S=new fe,L=a.fs,xe=new l,et;if(y.luaX_next(a),r(a,xe),jt(a,T.TK_THEN),a.t.token===T.TK_GOTO||a.t.token===T.TK_BREAK){for(nt(a.fs,xe),fn(L,S,!1),rt(a,xe.t);Ft(a,59););if(Nn(a,0))return _n(L),h;et=pt(L)}else at(a.fs,xe),fn(L,S,!1),et=xe.f;return Cn(a),_n(L),(a.t.token===T.TK_ELSE||a.t.token===T.TK_ELSEIF)&&(h=Ye(L,h,pt(L))),tt(L,et),h},Vr=function(a,h){let S=a.fs,L=_e;for(L=gl(a,L);a.t.token===T.TK_ELSEIF;)L=gl(a,L);Ft(a,T.TK_ELSE)&&c(a),G(a,T.TK_END,T.TK_IF,h),tt(S,L)},Hr=function(a){let h=new l,S=a.fs;Mt(a,be(a)),$e(a,1),Bn(a,h,0,a.linenumber),Be(S,h.u.info).startpc=S.pc},Xr=function(a){let h=0,S,L=new l;do Mt(a,be(a)),h++;while(Ft(a,44));Ft(a,61)?S=bn(a,L):(L.k=oe.VVOID,S=0),Zn(a,h,S,L),$e(a,h)},jr=function(a,h){let S=0;for(Fn(a,h);a.t.token===46;)Qn(a,h);return a.t.token===58&&(S=1,Qn(a,h)),S},zr=function(a,h){let S=new l,L=new l;y.luaX_next(a);let xe=jr(a,S);Bn(a,L,xe,h),ue(a.fs,S,L),ne(a.fs,h)},qr=function(a){let h=a.fs,S=new k;Xn(a,S.v),a.t.token===61||a.t.token===44?(S.prev=null,z(a,S,1)):(f(a,S.v.k===oe.VCALL,o("syntax error",!0)),Dt(H(h,S.v),1))},Wr=function(a){let h=a.fs,S=new l,L,xe;Nn(a,1)||a.t.token===59?L=xe=0:(xe=bn(a,S),We(S.k)?(g(h,S),S.k===oe.VCALL&&xe===1&&(Vt(H(h,S),kt),De(H(h,S).A===h.nactvar)),L=h.nactvar,xe=d):xe===1?L=Y(h,S):(he(h,S),L=h.nactvar,De(xe===h.freereg-L))),I(h,L,xe),Ft(a,59)},za=function(a){let h=a.linenumber;switch(On(a),a.t.token){case 59:{y.luaX_next(a);break}case T.TK_IF:{Vr(a,h);break}case T.TK_WHILE:{Ut(a,h);break}case T.TK_DO:{y.luaX_next(a),c(a),G(a,T.TK_END,T.TK_DO,h);break}case T.TK_FOR:{Gr(a,h);break}case T.TK_REPEAT:{ta(a,h);break}case T.TK_FUNCTION:{zr(a,h);break}case T.TK_LOCAL:{y.luaX_next(a),Ft(a,T.TK_FUNCTION)?Hr(a):Xr(a);break}case T.TK_DBCOLON:{y.luaX_next(a),It(a,be(a),h);break}case T.TK_RETURN:{y.luaX_next(a),Wr(a);break}case T.TK_BREAK:case T.TK_GOTO:{rt(a,pt(a.fs));break}default:{qr(a);break}}De(a.fs.f.maxstacksize>=a.fs.freereg&&a.fs.freereg>=a.fs.nactvar),a.fs.freereg=a.fs.nactvar,Gn(a)},Yr=function(a,h){let S=new fe,L=new l;ua(a,h,S),h.f.is_vararg=!0,pe(L,oe.VLOCAL,0),on(h,a.envn,L),y.luaX_next(a),Cn(a),sn(a,T.TK_EOS),Hn(a)},Zr=function(a,h,S,L,xe,et){let wt=new y.LexState,Tn=new n,wa=Fe.luaF_newLclosure(a,1);return st.luaD_inctop(a),a.stack[a.top-1].setclLvalue(wa),wt.h=Xt.luaH_new(a),st.luaD_inctop(a),a.stack[a.top-1].sethvalue(wt.h),Tn.f=wa.p=new F(a),Tn.f.source=Lt(a,xe),wt.buff=S,wt.dyd=L,L.actvar.n=L.gt.n=L.label.n=0,y.luaX_setinput(a,wt,h,Tn.f.source,et),Yr(wt,Tn),De(!Tn.prev&&Tn.nups===1&&!wt.fs),De(L.actvar.n===0&&L.gt.n===0&&L.label.n===0),delete a.stack[--a.top],wa};return ka.Dyndata=re,ka.expkind=oe,ka.expdesc=l,ka.luaY_parser=Zr,ka.vkisinreg=At,ka}var qa={},Pl;function us(){if(Pl)return qa;Pl=1;const{LUA_SIGNATURE:d,constant_types:{LUA_TBOOLEAN:o,LUA_TLNGSTR:m,LUA_TNIL:E,LUA_TNUMFLT:N,LUA_TNUMINT:U,LUA_TSHRSTR:$},thread_status:{LUA_ERRSYNTAX:ge},is_luastring:ie,luastring_eq:Se,to_luastring:q}=rn(),Z=Yn(),Q=Ma(),Te=Mn(),{MAXARG_sBx:J,POS_A:Me,POS_Ax:Le,POS_B:ye,POS_Bx:Ke,POS_C:ut,POS_OP:Re,SIZE_A:Ue,SIZE_Ax:Pe,SIZE_B:ce,SIZE_Bx:ae,SIZE_C:R,SIZE_OP:Oe}=xa(),{lua_assert:me}=yn(),{luaS_bless:W}=ra(),{luaZ_read:_e,ZIO:H}=Ha();let D=[25,147,13,10,26,10];class Ce{constructor(de,Ye,Je){this.intSize=4,this.size_tSize=4,this.instructionSize=4,this.integerSize=4,this.numberSize=8,me(Ye instanceof H,"BytecodeParser only operates on a ZIO"),me(ie(Je)),Je[0]===64||Je[0]===61?this.name=Je.subarray(1):Je[0]==d[0]?this.name=q("binary string",!0):this.name=Je,this.L=de,this.Z=Ye,this.arraybuffer=new ArrayBuffer(Math.max(this.intSize,this.size_tSize,this.instructionSize,this.integerSize,this.numberSize)),this.dv=new DataView(this.arraybuffer),this.u8=new Uint8Array(this.arraybuffer)}read(de){let Ye=new Uint8Array(de);return _e(this.Z,Ye,0,de)!==0&&this.error("truncated"),Ye}LoadByte(){return _e(this.Z,this.u8,0,1)!==0&&this.error("truncated"),this.u8[0]}LoadInt(){return _e(this.Z,this.u8,0,this.intSize)!==0&&this.error("truncated"),this.dv.getInt32(0,!0)}LoadNumber(){return _e(this.Z,this.u8,0,this.numberSize)!==0&&this.error("truncated"),this.dv.getFloat64(0,!0)}LoadInteger(){return _e(this.Z,this.u8,0,this.integerSize)!==0&&this.error("truncated"),this.dv.getInt32(0,!0)}LoadSize_t(){return this.LoadInteger()}LoadString(){let de=this.LoadByte();return de===255&&(de=this.LoadSize_t()),de===0?null:W(this.L,this.read(de-1))}static MASK1(de,Ye){return~(-1<<de)<<Ye}LoadCode(de){let Ye=this.LoadInt(),Je=Ce;for(let x=0;x<Ye;x++){_e(this.Z,this.u8,0,this.instructionSize)!==0&&this.error("truncated");let Y=this.dv.getUint32(0,!0);de.code[x]={code:Y,opcode:Y>>Re&Je.MASK1(Oe,0),A:Y>>Me&Je.MASK1(Ue,0),B:Y>>ye&Je.MASK1(ce,0),C:Y>>ut&Je.MASK1(R,0),Bx:Y>>Ke&Je.MASK1(ae,0),Ax:Y>>Le&Je.MASK1(Pe,0),sBx:(Y>>Ke&Je.MASK1(ae,0))-J}}}LoadConstants(de){let Ye=this.LoadInt();for(let Je=0;Je<Ye;Je++){let x=this.LoadByte();switch(x){case E:de.k.push(new Te.TValue(E,null));break;case o:de.k.push(new Te.TValue(o,this.LoadByte()!==0));break;case N:de.k.push(new Te.TValue(N,this.LoadNumber()));break;case U:de.k.push(new Te.TValue(U,this.LoadInteger()));break;case $:case m:de.k.push(new Te.TValue(m,this.LoadString()));break;default:this.error(`unrecognized constant '${x}'`)}}}LoadProtos(de){let Ye=this.LoadInt();for(let Je=0;Je<Ye;Je++)de.p[Je]=new Q.Proto(this.L),this.LoadFunction(de.p[Je],de.source)}LoadUpvalues(de){let Ye=this.LoadInt();for(let Je=0;Je<Ye;Je++)de.upvalues[Je]={name:null,instack:this.LoadByte(),idx:this.LoadByte()}}LoadDebug(de){let Ye=this.LoadInt();for(let Je=0;Je<Ye;Je++)de.lineinfo[Je]=this.LoadInt();Ye=this.LoadInt();for(let Je=0;Je<Ye;Je++)de.locvars[Je]={varname:this.LoadString(),startpc:this.LoadInt(),endpc:this.LoadInt()};Ye=this.LoadInt();for(let Je=0;Je<Ye;Je++)de.upvalues[Je].name=this.LoadString()}LoadFunction(de,Ye){de.source=this.LoadString(),de.source===null&&(de.source=Ye),de.linedefined=this.LoadInt(),de.lastlinedefined=this.LoadInt(),de.numparams=this.LoadByte(),de.is_vararg=this.LoadByte()!==0,de.maxstacksize=this.LoadByte(),this.LoadCode(de),this.LoadConstants(de),this.LoadUpvalues(de),this.LoadProtos(de),this.LoadDebug(de)}checkliteral(de,Ye){let Je=this.read(de.length);Se(Je,de)||this.error(Ye)}checkHeader(){this.checkliteral(d.subarray(1),"not a"),this.LoadByte()!==83&&this.error("version mismatch in"),this.LoadByte()!==0&&this.error("format mismatch in"),this.checkliteral(D,"corrupted"),this.intSize=this.LoadByte(),this.size_tSize=this.LoadByte(),this.instructionSize=this.LoadByte(),this.integerSize=this.LoadByte(),this.numberSize=this.LoadByte(),this.checksize(this.intSize,4,"int"),this.checksize(this.size_tSize,4,"size_t"),this.checksize(this.instructionSize,4,"instruction"),this.checksize(this.integerSize,4,"integer"),this.checksize(this.numberSize,8,"number"),this.LoadInteger()!==22136&&this.error("endianness mismatch in"),this.LoadNumber()!==370.5&&this.error("float format mismatch in")}error(de){Te.luaO_pushfstring(this.L,q("%s: %s precompiled chunk"),this.name,q(de)),Z.luaD_throw(this.L,ge)}checksize(de,Ye,Je){de!==Ye&&this.error(`${Je} size mismatch in`)}}const ve=function(ze,de,Ye){let Je=new Ce(ze,de,Ye);Je.checkHeader();let x=Q.luaF_newLclosure(ze,Je.LoadByte());return Z.luaD_inctop(ze),ze.stack[ze.top-1].setclLvalue(x),x.p=new Q.Proto(ze),Je.LoadFunction(x.p,null),me(x.nupvalues===x.p.upvalues.length),x};return qa.luaU_undump=ve,qa}var Dl;function Yn(){if(Dl)return en;Dl=1;const{LUA_HOOKCALL:d,LUA_HOOKRET:o,LUA_HOOKTAILCALL:m,LUA_MASKCALL:E,LUA_MASKLINE:N,LUA_MASKRET:U,LUA_MINSTACK:$,LUA_MULTRET:ge,LUA_SIGNATURE:ie,constant_types:{LUA_TCCL:Se,LUA_TLCF:q,LUA_TLCL:Z,LUA_TNIL:Q},thread_status:{LUA_ERRMEM:Te,LUA_ERRERR:J,LUA_ERRRUN:Me,LUA_ERRSYNTAX:Le,LUA_OK:ye,LUA_YIELD:Ke},lua_Debug:ut,luastring_indexOf:Re,to_luastring:Ue}=rn(),Pe=Xa(),ce=pa(),ae=Ma(),{api_check:R,lua_assert:Oe,LUAI_MAXCCALLS:me}=yn(),W=Mn(),_e=xa(),H=fr(),D=ha(),{luaS_newliteral:Ce}=ra(),ve=Ia(),{LUAI_MAXSTACK:ze}=wn(),de=us(),Ye=Ra(),{MBuffer:Je}=Ha(),x=function(_,te){if(_.top<te)for(;_.top<te;)_.stack[_.top++]=new W.TValue(Q,null);else for(;_.top>te;)delete _.stack[--_.top]},Y=function(_,te,P){let se=_.top;for(;_.top<P+1;)_.stack[_.top++]=new W.TValue(Q,null);switch(te){case Te:{W.setsvalue2s(_,P,Ce(_,"not enough memory"));break}case J:{W.setsvalue2s(_,P,Ce(_,"error in error handling"));break}default:W.setobjs2s(_,P,se-1)}for(;_.top>P+1;)delete _.stack[--_.top]},X=ze+200,he=function(_,te){Oe(te<=ze||te==X),Oe(_.stack_last==_.stack.length-D.EXTRA_STACK),_.stack.length=te,_.stack_last=te-D.EXTRA_STACK},ee=function(_,te){let P=_.stack.length;if(P>ze)gt(_,J);else{let se=_.top+te+D.EXTRA_STACK,Ne=2*P;Ne>ze&&(Ne=ze),Ne<se&&(Ne=se),Ne>ze?(he(_,X),ce.luaG_runerror(_,Ue("stack overflow",!0))):he(_,Ne)}},ne=function(_,te){_.stack_last-_.top<=te&&ee(_,te)},je=function(_){let te=_.top;for(let P=_.ci;P!==null;P=P.previous)te<P.top&&(te=P.top);return Oe(te<=_.stack_last),te+1},nt=function(_){let te=je(_),P=te+Math.floor(te/8)+2*D.EXTRA_STACK;P>ze&&(P=ze),_.stack.length>ze&&D.luaE_freeCI(_),te<=ze-D.EXTRA_STACK&&P<_.stack.length&&he(_,P)},at=function(_){ne(_,1),_.stack[_.top++]=new W.TValue(Q,null)},ft=function(_,te,P){let se=_.stack[te];switch(se.type){case Se:case q:{let Ne=se.type===Se?se.value.f:se.value;ne(_,$);let it=D.luaE_extendCI(_);it.funcOff=te,it.nresults=P,it.func=se,it.top=_.top+$,Oe(it.top<=_.stack_last),it.callstatus=0,_.hookmask&E&&pt(_,d,-1);let Qe=Ne(_);if(typeof Qe!="number"||Qe<0||(Qe|0)!==Qe)throw Error("invalid return value from JS function (expected integer)");return Pe.api_checknelems(_,Qe),ct(_,it,_.top-Qe,Qe),!0}case Z:{let Ne,it=se.value.p,Qe=_.top-te-1,Rt=it.maxstacksize;if(ne(_,Rt),it.is_vararg)Ne=bt(_,it,Qe);else{for(;Qe<it.numparams;Qe++)_.stack[_.top++]=new W.TValue(Q,null);Ne=te+1}let kt=D.luaE_extendCI(_);return kt.funcOff=te,kt.nresults=P,kt.func=se,kt.l_base=Ne,kt.top=Ne+Rt,x(_,kt.top),kt.l_code=it.code,kt.l_savedpc=0,kt.callstatus=D.CIST_LUA,_.hookmask&E&&Et(_,kt),!1}default:return ne(_,1),Ze(_,te,se),ft(_,te,P)}},ct=function(_,te,P,se){let Ne=te.nresults;_.hookmask&(U|N)&&(_.hookmask&U&&pt(_,o,-1),_.oldpc=te.previous.l_savedpc);let it=te.funcOff;return _.ci=te.previous,_.ci.next=null,ht(_,P,it,se,Ne)},ht=function(_,te,P,se,Ne){switch(Ne){case 0:break;case 1:{se===0?_.stack[P].setnilvalue():W.setobjs2s(_,P,te);break}case ge:{for(let Qe=0;Qe<se;Qe++)W.setobjs2s(_,P+Qe,te+Qe);for(let Qe=_.top;Qe>=P+se;Qe--)delete _.stack[Qe];return _.top=P+se,!1}default:{let Qe;if(Ne<=se)for(Qe=0;Qe<Ne;Qe++)W.setobjs2s(_,P+Qe,te+Qe);else{for(Qe=0;Qe<se;Qe++)W.setobjs2s(_,P+Qe,te+Qe);for(;Qe<Ne;Qe++)P+Qe>=_.top?_.stack[P+Qe]=new W.TValue(Q,null):_.stack[P+Qe].setnilvalue()}break}}let it=P+Ne;for(let Qe=_.top;Qe>=it;Qe--)delete _.stack[Qe];return _.top=it,!0},pt=function(_,te,P){let se=_.hook;if(se&&_.allowhook){let Ne=_.ci,it=_.top,Qe=Ne.top,Rt=new ut;Rt.event=te,Rt.currentline=P,Rt.i_ci=Ne,ne(_,$),Ne.top=_.top+$,Oe(Ne.top<=_.stack_last),_.allowhook=0,Ne.callstatus|=D.CIST_HOOKED,se(_,Rt),Oe(!_.allowhook),_.allowhook=1,Ne.top=Qe,x(_,it),Ne.callstatus&=~D.CIST_HOOKED}},Et=function(_,te){let P=d;te.l_savedpc++,te.previous.callstatus&D.CIST_LUA&&te.previous.l_code[te.previous.l_savedpc-1].opcode==_e.OpCodesI.OP_TAILCALL&&(te.callstatus|=D.CIST_TAIL,P=m),pt(_,P,-1),te.l_savedpc--},bt=function(_,te,P){let se=te.numparams,Ne=_.top-P,it=_.top,Qe;for(Qe=0;Qe<se&&Qe<P;Qe++)W.pushobj2s(_,_.stack[Ne+Qe]),_.stack[Ne+Qe].setnilvalue();for(;Qe<se;Qe++)_.stack[_.top++]=new W.TValue(Q,null);return it},Ze=function(_,te,P){let se=ve.luaT_gettmbyobj(_,P,ve.TMS.TM_CALL);se.ttisfunction(se)||ce.luaG_typeerror(_,P,Ue("call",!0)),W.pushobj2s(_,_.stack[_.top-1]);for(let Ne=_.top-2;Ne>te;Ne--)W.setobjs2s(_,Ne,Ne-1);W.setobj2s(_,te,se)},St=function(_){_.nCcalls===me?ce.luaG_runerror(_,Ue("JS stack overflow",!0)):_.nCcalls>=me+(me>>3)&&gt(_,J)},tt=function(_,te,P){++_.nCcalls>=me&&St(_),ft(_,te,P)||Ye.luaV_execute(_),_.nCcalls--},gt=function(_,te){if(_.errorJmp)throw _.errorJmp.status=te,_.errorJmp;{let P=_.l_G;if(_.status=te,P.mainthread.errorJmp)P.mainthread.stack[P.mainthread.top++]=_.stack[_.top-1],gt(P.mainthread,te);else{let se=P.panic;throw se&&(Y(_,te,_.top),_.ci.top<_.top&&(_.ci.top=_.top),se(_)),new Error(`Aborted ${te}`)}}},we=function(_,te,P){let se=_.nCcalls,Ne={status:ye,previous:_.errorJmp};_.errorJmp=Ne;try{te(_,P)}catch(it){if(Ne.status===ye){let Qe=_.l_G.atnativeerror;if(Qe)try{if(Ne.status=ye,Pe.lua_pushcfunction(_,Qe),Pe.lua_pushlightuserdata(_,it),y(_,_.top-2,1),_.errfunc!==0){let Rt=_.errfunc;W.pushobj2s(_,_.stack[_.top-1]),W.setobjs2s(_,_.top-2,Rt),y(_,_.top-2,1)}Ne.status=Me}catch{Ne.status===ye&&(Ne.status=-1)}else Ne.status=-1}}return _.errorJmp=Ne.previous,_.nCcalls=se,Ne.status},K=function(_,te){let P=_.ci;Oe(P.c_k!==null&&_.nny===0),Oe(P.callstatus&D.CIST_YPCALL||te===Ke),P.callstatus&D.CIST_YPCALL&&(P.callstatus&=~D.CIST_YPCALL,_.errfunc=P.c_old_errfunc),P.nresults===ge&&_.ci.top<_.top&&(_.ci.top=_.top);let se=P.c_k,Ne=se(_,te,P.c_ctx);Pe.api_checknelems(_,Ne),ct(_,P,_.top-Ne,Ne)},I=function(_,te){for(te!==null&&K(_,te);_.ci!==_.base_ci;)_.ci.callstatus&D.CIST_LUA?(Ye.luaV_finishOp(_),Ye.luaV_execute(_)):K(_,Ke)},O=function(_){for(let te=_.ci;te!==null;te=te.previous)if(te.callstatus&D.CIST_YPCALL)return te;return null},A=function(_,te){let P=O(_);if(P===null)return 0;let se=P.extra;return ae.luaF_close(_,se),Y(_,te,se),_.ci=P,_.allowhook=P.callstatus&D.CIST_OAH,_.nny=0,nt(_),_.errfunc=P.c_old_errfunc,1},g=function(_,te,P){let se=Ce(_,te);if(P===0)W.pushsvalue2s(_,se),R(_,_.top<=_.ci.top,"stack overflow");else{for(let Ne=1;Ne<P;Ne++)delete _.stack[--_.top];W.setsvalue2s(_,_.top-1,se)}return Me},v=function(_,te){let P=_.top-te,se=_.ci;_.status===ye?ft(_,P-1,ge)||Ye.luaV_execute(_):(Oe(_.status===Ke),_.status=ye,se.funcOff=se.extra,se.func=_.stack[se.funcOff],se.callstatus&D.CIST_LUA?Ye.luaV_execute(_):(se.c_k!==null&&(te=se.c_k(_,Ke,se.c_ctx),Pe.api_checknelems(_,te),P=_.top-te),ct(_,se,P,te)),I(_,null))},B=function(_,te,P){let se=_.nny;if(_.status===ye){if(_.ci!==_.base_ci)return g(_,"cannot resume non-suspended coroutine",P)}else if(_.status!==Ke)return g(_,"cannot resume dead coroutine",P);if(_.nCcalls=te?te.nCcalls+1:1,_.nCcalls>=me)return g(_,"JS stack overflow",P);_.nny=0,Pe.api_checknelems(_,_.status===ye?P+1:P);let Ne=we(_,v,P);if(Ne===-1)Ne=Me;else{for(;Ne>Ke&&A(_,Ne);)Ne=we(_,I,Ne);Ne>Ke?(_.status=Ne,Y(_,Ne,_.top),_.ci.top=_.top):Oe(Ne===_.status)}return _.nny=se,_.nCcalls--,Oe(_.nCcalls===(te?te.nCcalls:0)),Ne},ue=function(_){return _.nny===0},ot=function(_,te,P,se){let Ne=_.ci;return Pe.api_checknelems(_,te),_.nny>0&&(_!==_.l_G.mainthread?ce.luaG_runerror(_,Ue("attempt to yield across a JS-call boundary",!0)):ce.luaG_runerror(_,Ue("attempt to yield from outside a coroutine",!0))),_.status=Ke,Ne.extra=Ne.funcOff,Ne.callstatus&D.CIST_LUA?R(_,se===null,"hooks cannot continue after yielding"):(Ne.c_k=se,se!==null&&(Ne.c_ctx=P),Ne.funcOff=_.top-te-1,Ne.func=_.stack[Ne.funcOff],gt(_,Ke)),Oe(Ne.callstatus&D.CIST_HOOKED),0},st=function(_,te){ot(_,te,0,null)},Fe=function(_,te,P,se,Ne){let it=_.ci,Qe=_.allowhook,Rt=_.nny,kt=_.errfunc;_.errfunc=Ne;let yt=we(_,te,P);return yt!==ye&&(ae.luaF_close(_,se),Y(_,yt,se),_.ci=it,_.allowhook=Qe,_.nny=Rt,nt(_)),_.errfunc=kt,yt},y=function(_,te,P){_.nny++,tt(_,te,P),_.nny--};class V{constructor(te,P,se){this.z=te,this.buff=new Je,this.dyd=new H.Dyndata,this.mode=se,this.name=P}}const Ae=function(_,te,P){te&&Re(te,P[0])===-1&&(W.luaO_pushfstring(_,Ue("attempt to load a %s chunk (mode is '%s')"),P,te),gt(_,Le))},De=function(_,te){let P,se=te.z.zgetc();se===ie[0]?(Ae(_,te.mode,Ue("binary",!0)),P=de.luaU_undump(_,te.z,te.name)):(Ae(_,te.mode,Ue("text",!0)),P=H.luaY_parser(_,te.z,te.buff,te.dyd,te.name,se)),Oe(P.nupvalues===P.p.upvalues.length),ae.luaF_initupvals(_,P)},qe=function(_,te,P,se){let Ne=new V(te,P,se);_.nny++;let it=Fe(_,De,Ne,_.top,_.errfunc);return _.nny--,it};return en.adjust_top=x,en.luaD_call=tt,en.luaD_callnoyield=y,en.luaD_checkstack=ne,en.luaD_growstack=ee,en.luaD_hook=pt,en.luaD_inctop=at,en.luaD_pcall=Fe,en.luaD_poscall=ct,en.luaD_precall=ft,en.luaD_protectedparser=qe,en.luaD_rawrunprotected=we,en.luaD_reallocstack=he,en.luaD_throw=gt,en.lua_isyieldable=ue,en.lua_resume=B,en.lua_yield=st,en.lua_yieldk=ot,en}var Bl;function pa(){if(Bl)return ln;Bl=1;const{LUA_HOOKCOUNT:d,LUA_HOOKLINE:o,LUA_MASKCOUNT:m,LUA_MASKLINE:E,constant_types:{LUA_TBOOLEAN:N,LUA_TNIL:U,LUA_TTABLE:$},thread_status:{LUA_ERRRUN:ge,LUA_YIELD:ie},from_userstring:Se,luastring_eq:q,luastring_indexOf:Z,to_luastring:Q}=rn(),{api_check:Te,lua_assert:J}=yn(),{LUA_IDSIZE:Me}=wn(),Le=Xa(),ye=Yn(),Ke=Ma(),ut=_l(),Re=Mn(),Ue=xa(),Pe=ha(),ce=sa(),ae=Ia(),R=Ra(),Oe=function(A){return J(A.callstatus&Pe.CIST_LUA),A.l_savedpc-1},me=function(A){return A.func.value.p.lineinfo.length!==0?A.func.value.p.lineinfo[Oe(A)]:-1},W=function(A){if(A.status===ie){let g=A.ci,v=g.funcOff;g.func=A.stack[g.extra],g.funcOff=g.extra,g.extra=v}},_e=function(A,g,v,B){(g===null||v===0)&&(v=0,g=null),A.ci.callstatus&Pe.CIST_LUA&&(A.oldpc=A.ci.l_savedpc),A.hook=g,A.basehookcount=B,A.hookcount=A.basehookcount,A.hookmask=v},H=function(A){return A.hook},D=function(A){return A.hookmask},Ce=function(A){return A.basehookcount},ve=function(A,g,v){let B,ue;if(g<0)return 0;for(B=A.ci;g>0&&B!==A.base_ci;B=B.previous)g--;return g===0&&B!==A.base_ci?(ue=1,v.i_ci=B):ue=0,ue},ze=function(A,g){J(g<A.upvalues.length);let v=A.upvalues[g].name;return v===null?Q("?",!0):v.getstr()},de=function(A,g){let v=A.func.value.p.numparams;return g>=A.l_base-A.funcOff-v?null:{pos:A.funcOff+v+g,name:Q("(*vararg)",!0)}},Ye=function(A,g,v){let B,ue=null;if(g.callstatus&Pe.CIST_LUA){if(v<0)return de(g,-v);B=g.l_base,ue=Ke.luaF_getlocalname(g.func.value.p,v,Oe(g))}else B=g.funcOff+1;if(ue===null)if((g===A.ci?A.top:g.next.funcOff)-B>=v&&v>0)ue=Q("(*temporary)",!0);else return null;return{pos:B+(v-1),name:ue}},Je=function(A,g,v){let B;if(W(A),g===null)A.stack[A.top-1].ttisLclosure()?B=Ke.luaF_getlocalname(A.stack[A.top-1].value.p,v,0):B=null;else{let ue=Ye(A,g.i_ci,v);ue?(B=ue.name,Re.pushobj2s(A,A.stack[ue.pos]),Te(A,A.top<=A.ci.top,"stack overflow")):B=null}return W(A),B},x=function(A,g,v){let B;W(A);let ue=Ye(A,g.i_ci,v);return ue?(B=ue.name,Re.setobjs2s(A,ue.pos,A.top-1),delete A.stack[--A.top]):B=null,W(A),B},Y=function(A,g){if(g===null||g instanceof Re.CClosure)A.source=Q("=[JS]",!0),A.linedefined=-1,A.lastlinedefined=-1,A.what=Q("J",!0);else{let v=g.p;A.source=v.source?v.source.getstr():Q("=?",!0),A.linedefined=v.linedefined,A.lastlinedefined=v.lastlinedefined,A.what=A.linedefined===0?Q("main",!0):Q("Lua",!0)}A.short_src=Re.luaO_chunkid(A.source,Me)},X=function(A,g){if(g===null||g instanceof Re.CClosure)A.stack[A.top]=new Re.TValue(U,null),Le.api_incr_top(A);else{let v=g.p.lineinfo,B=ce.luaH_new(A);A.stack[A.top]=new Re.TValue($,B),Le.api_incr_top(A);let ue=new Re.TValue(N,!0);for(let ot=0;ot<v.length;ot++)ce.luaH_setint(B,v[ot],ue)}},he=function(A,g){let v={name:null,funcname:null};return g===null?null:g.callstatus&Pe.CIST_FIN?(v.name=Q("__gc",!0),v.funcname=Q("metamethod",!0),v):!(g.callstatus&Pe.CIST_TAIL)&&g.previous.callstatus&Pe.CIST_LUA?ct(A,g.previous):null},ee=function(A,g,v,B,ue){let ot=1;for(;g.length>0;g=g.subarray(1))switch(g[0]){case 83:{Y(v,B);break}case 108:{v.currentline=ue&&ue.callstatus&Pe.CIST_LUA?me(ue):-1;break}case 117:{v.nups=B===null?0:B.nupvalues,B===null||B instanceof Re.CClosure?(v.isvararg=!0,v.nparams=0):(v.isvararg=B.p.is_vararg,v.nparams=B.p.numparams);break}case 116:{v.istailcall=ue?ue.callstatus&Pe.CIST_TAIL:0;break}case 110:{let st=he(A,ue);st===null?(v.namewhat=Q("",!0),v.name=null):(v.namewhat=st.funcname,v.name=st.name);break}case 76:case 102:break;default:ot=0}return ot},ne=function(A,g,v){g=Se(g);let B,ue,ot,st;return W(A),g[0]===62?(ot=null,st=A.stack[A.top-1],Te(A,st.ttisfunction(),"function expected"),g=g.subarray(1),A.top--):(ot=v.i_ci,st=ot.func,J(ot.func.ttisfunction())),ue=st.ttisclosure()?st.value:null,B=ee(A,g,v,ue,ot),Z(g,102)>=0&&(Re.pushobj2s(A,st),Te(A,A.top<=A.ci.top,"stack overflow")),W(A),Z(g,76)>=0&&X(A,ue),B},je=function(A,g,v){let B={name:null,funcname:null};if(Ue.ISK(v)){let ue=A.k[Ue.INDEXK(v)];if(ue.ttisstring())return B.name=ue.svalue(),B}else{let ue=ft(A,g,v);if(ue&&ue.funcname[0]===99)return ue}return B.name=Q("?",!0),B},nt=function(A,g){return A<g?-1:A},at=function(A,g,v){let B=-1,ue=0,ot=Ue.OpCodesI;for(let st=0;st<g;st++){let Fe=A.code[st],y=Fe.A;switch(Fe.opcode){case ot.OP_LOADNIL:{let V=Fe.B;y<=v&&v<=y+V&&(B=nt(st,ue));break}case ot.OP_TFORCALL:{v>=y+2&&(B=nt(st,ue));break}case ot.OP_CALL:case ot.OP_TAILCALL:{v>=y&&(B=nt(st,ue));break}case ot.OP_JMP:{let V=Fe.sBx,Ae=st+1+V;st<Ae&&Ae<=g&&Ae>ue&&(ue=Ae);break}default:Ue.testAMode(Fe.opcode)&&v===y&&(B=nt(st,ue));break}}return B},ft=function(A,g,v){let B={name:Ke.luaF_getlocalname(A,v+1,g),funcname:null};if(B.name)return B.funcname=Q("local",!0),B;let ue=at(A,g,v),ot=Ue.OpCodesI;if(ue!==-1){let st=A.code[ue];switch(st.opcode){case ot.OP_MOVE:{let Fe=st.B;if(Fe<st.A)return ft(A,ue,Fe);break}case ot.OP_GETTABUP:case ot.OP_GETTABLE:{let Fe=st.C,y=st.B,V=st.opcode===ot.OP_GETTABLE?Ke.luaF_getlocalname(A,y+1,ue):ze(A,y);return B.name=je(A,ue,Fe).name,B.funcname=V&&q(V,ut.LUA_ENV)?Q("global",!0):Q("field",!0),B}case ot.OP_GETUPVAL:return B.name=ze(A,st.B),B.funcname=Q("upvalue",!0),B;case ot.OP_LOADK:case ot.OP_LOADKX:{let Fe=st.opcode===ot.OP_LOADK?st.Bx:A.code[ue+1].Ax;if(A.k[Fe].ttisstring())return B.name=A.k[Fe].svalue(),B.funcname=Q("constant",!0),B;break}case ot.OP_SELF:{let Fe=st.C;return B.name=je(A,ue,Fe).name,B.funcname=Q("method",!0),B}}}return null},ct=function(A,g){let v={name:null,funcname:null},B=0,ue=g.func.value.p,ot=Oe(g),st=ue.code[ot],Fe=Ue.OpCodesI;if(g.callstatus&Pe.CIST_HOOKED)return v.name=Q("?",!0),v.funcname=Q("hook",!0),v;switch(st.opcode){case Fe.OP_CALL:case Fe.OP_TAILCALL:return ft(ue,ot,st.A);case Fe.OP_TFORCALL:return v.name=Q("for iterator",!0),v.funcname=Q("for iterator",!0),v;case Fe.OP_SELF:case Fe.OP_GETTABUP:case Fe.OP_GETTABLE:B=ae.TMS.TM_INDEX;break;case Fe.OP_SETTABUP:case Fe.OP_SETTABLE:B=ae.TMS.TM_NEWINDEX;break;case Fe.OP_ADD:B=ae.TMS.TM_ADD;break;case Fe.OP_SUB:B=ae.TMS.TM_SUB;break;case Fe.OP_MUL:B=ae.TMS.TM_MUL;break;case Fe.OP_MOD:B=ae.TMS.TM_MOD;break;case Fe.OP_POW:B=ae.TMS.TM_POW;break;case Fe.OP_DIV:B=ae.TMS.TM_DIV;break;case Fe.OP_IDIV:B=ae.TMS.TM_IDIV;break;case Fe.OP_BAND:B=ae.TMS.TM_BAND;break;case Fe.OP_BOR:B=ae.TMS.TM_BOR;break;case Fe.OP_BXOR:B=ae.TMS.TM_BXOR;break;case Fe.OP_SHL:B=ae.TMS.TM_SHL;break;case Fe.OP_SHR:B=ae.TMS.TM_SHR;break;case Fe.OP_UNM:B=ae.TMS.TM_UNM;break;case Fe.OP_BNOT:B=ae.TMS.TM_BNOT;break;case Fe.OP_LEN:B=ae.TMS.TM_LEN;break;case Fe.OP_CONCAT:B=ae.TMS.TM_CONCAT;break;case Fe.OP_EQ:B=ae.TMS.TM_EQ;break;case Fe.OP_LT:B=ae.TMS.TM_LT;break;case Fe.OP_LE:B=ae.TMS.TM_LE;break;default:return null}return v.name=A.l_G.tmname[B].getstr(),v.funcname=Q("metamethod",!0),v},ht=function(A,g,v){for(let B=g.l_base;B<g.top;B++)if(A.stack[B]===v)return B;return!1},pt=function(A,g,v){let B=g.func.value;for(let ue=0;ue<B.nupvalues;ue++)if(B.upvals[ue]===v)return{name:ze(B.p,ue),funcname:Q("upvalue",!0)};return null},Et=function(A,g){let v=A.ci,B=null;if(v.callstatus&Pe.CIST_LUA){B=pt(A,v,g);let ue=ht(A,v,g);!B&&ue&&(B=ft(v.func.value.p,Oe(v),ue-v.l_base))}return B?Re.luaO_pushfstring(A,Q(" (%s '%s')",!0),B.funcname,B.name):Q("",!0)},bt=function(A,g,v){let B=ae.luaT_objtypename(A,g);we(A,Q("attempt to %s a %s value%s",!0),v,B,Et(A,g))},Ze=function(A,g,v){(g.ttisstring()||R.cvt2str(g))&&(g=v),bt(A,g,Q("concatenate",!0))},St=function(A,g,v,B){R.tonumber(g)===!1&&(v=g),bt(A,v,B)},tt=function(A,g,v){let B=ae.luaT_objtypename(A,g),ue=ae.luaT_objtypename(A,v);q(B,ue)?we(A,Q("attempt to compare two %s values",!0),B):we(A,Q("attempt to compare %s with %s",!0),B,ue)},gt=function(A,g,v,B){let ue;return v?ue=Re.luaO_chunkid(v.getstr(),Me):ue=Q("?",!0),Re.luaO_pushfstring(A,Q("%s:%d: %s",!0),ue,B,g)},we=function(A,g,...v){let B=A.ci,ue=Re.luaO_pushvfstring(A,g,v);B.callstatus&Pe.CIST_LUA&&gt(A,ue,B.func.value.p.source,me(B)),K(A)},K=function(A){if(A.errfunc!==0){let g=A.errfunc;Re.pushobj2s(A,A.stack[A.top-1]),Re.setobjs2s(A,A.top-2,g),ye.luaD_callnoyield(A,A.top-2,1)}ye.luaD_throw(A,ge)},I=function(A,g,v){R.tointeger(g)===!1&&(v=g),we(A,Q("number%s has no integer representation",!0),Et(A,v))},O=function(A){let g=A.ci,v=A.hookmask,B=--A.hookcount===0&&v&m;if(B)A.hookcount=A.basehookcount;else if(!(v&E))return;if(g.callstatus&Pe.CIST_HOOKYIELD){g.callstatus&=~Pe.CIST_HOOKYIELD;return}if(B&&ye.luaD_hook(A,d,-1),v&E){let ue=g.func.value.p,ot=g.l_savedpc-1,st=ue.lineinfo.length!==0?ue.lineinfo[ot]:-1;(ot===0||g.l_savedpc<=A.oldpc||st!==(ue.lineinfo.length!==0?ue.lineinfo[A.oldpc-1]:-1))&&ye.luaD_hook(A,o,st)}A.oldpc=g.l_savedpc,A.status===ie&&(B&&(A.hookcount=1),g.l_savedpc--,g.callstatus|=Pe.CIST_HOOKYIELD,g.funcOff=A.top-1,g.func=A.stack[g.funcOff],ye.luaD_throw(A,ie))};return ln.luaG_addinfo=gt,ln.luaG_concaterror=Ze,ln.luaG_errormsg=K,ln.luaG_opinterror=St,ln.luaG_ordererror=tt,ln.luaG_runerror=we,ln.luaG_tointerror=I,ln.luaG_traceexec=O,ln.luaG_typeerror=bt,ln.lua_gethook=H,ln.lua_gethookcount=Ce,ln.lua_gethookmask=D,ln.lua_getinfo=ne,ln.lua_getlocal=Je,ln.lua_getstack=ve,ln.lua_sethook=_e,ln.lua_setlocal=x,ln}var Wa={},Kl;function cs(){if(Kl)return Wa;Kl=1;const{LUA_SIGNATURE:d,LUA_VERSION_MAJOR:o,LUA_VERSION_MINOR:m,constant_types:{LUA_TBOOLEAN:E,LUA_TLNGSTR:N,LUA_TNIL:U,LUA_TNUMFLT:$,LUA_TNUMINT:ge,LUA_TSHRSTR:ie},luastring_of:Se}=rn(),q=Se(25,147,13,10,26,10),Z=22136,Q=370.5,Te=Number(o)*16+Number(m),J=0;class Me{constructor(){this.L=null,this.writer=null,this.data=null,this.strip=NaN,this.status=NaN}}const Le=function(H,D,Ce){Ce.status===0&&D>0&&(Ce.status=Ce.writer(Ce.L,H,D,Ce.data))},ye=function(H,D){Le(Se(H),1,D)},Ke=function(H,D){let Ce=new ArrayBuffer(4);new DataView(Ce).setInt32(0,H,!0);let ze=new Uint8Array(Ce);Le(ze,4,D)},ut=function(H,D){let Ce=new ArrayBuffer(4);new DataView(Ce).setInt32(0,H,!0);let ze=new Uint8Array(Ce);Le(ze,4,D)},Re=function(H,D){let Ce=new ArrayBuffer(8);new DataView(Ce).setFloat64(0,H,!0);let ze=new Uint8Array(Ce);Le(ze,8,D)},Ue=function(H,D){if(H===null)ye(0,D);else{let Ce=H.tsslen()+1,ve=H.getstr();Ce<255?ye(Ce,D):(ye(255,D),ut(Ce,D)),Le(ve,Ce-1,D)}},Pe=function(H,D){let Ce=H.code.map(ve=>ve.code);Ke(Ce.length,D);for(let ve=0;ve<Ce.length;ve++)Ke(Ce[ve],D)},ce=function(H,D){let Ce=H.k.length;Ke(Ce,D);for(let ve=0;ve<Ce;ve++){let ze=H.k[ve];switch(ye(ze.ttype(),D),ze.ttype()){case U:break;case E:ye(ze.value?1:0,D);break;case $:Re(ze.value,D);break;case ge:ut(ze.value,D);break;case ie:case N:Ue(ze.tsvalue(),D);break}}},ae=function(H,D){let Ce=H.p.length;Ke(Ce,D);for(let ve=0;ve<Ce;ve++)me(H.p[ve],H.source,D)},R=function(H,D){let Ce=H.upvalues.length;Ke(Ce,D);for(let ve=0;ve<Ce;ve++)ye(H.upvalues[ve].instack?1:0,D),ye(H.upvalues[ve].idx,D)},Oe=function(H,D){let Ce=D.strip?0:H.lineinfo.length;Ke(Ce,D);for(let ve=0;ve<Ce;ve++)Ke(H.lineinfo[ve],D);Ce=D.strip?0:H.locvars.length,Ke(Ce,D);for(let ve=0;ve<Ce;ve++)Ue(H.locvars[ve].varname,D),Ke(H.locvars[ve].startpc,D),Ke(H.locvars[ve].endpc,D);Ce=D.strip?0:H.upvalues.length,Ke(Ce,D);for(let ve=0;ve<Ce;ve++)Ue(H.upvalues[ve].name,D)},me=function(H,D,Ce){Ce.strip||H.source===D?Ue(null,Ce):Ue(H.source,Ce),Ke(H.linedefined,Ce),Ke(H.lastlinedefined,Ce),ye(H.numparams,Ce),ye(H.is_vararg?1:0,Ce),ye(H.maxstacksize,Ce),Pe(H,Ce),ce(H,Ce),R(H,Ce),ae(H,Ce),Oe(H,Ce)},W=function(H){Le(d,d.length,H),ye(Te,H),ye(J,H),Le(q,q.length,H),ye(4,H),ye(4,H),ye(4,H),ye(4,H),ye(8,H),ut(Z,H),Re(Q,H)},_e=function(H,D,Ce,ve,ze){let de=new Me;return de.L=H,de.writer=Ce,de.data=ve,de.strip=ze,de.status=0,W(de),ye(D.upvalues.length,de),me(D,null,de),de.status};return Wa.luaU_dump=_e,Wa}var Fl;function Xa(){if(Fl)return Ge;Fl=1;const{LUA_MULTRET:d,LUA_OPBNOT:o,LUA_OPEQ:m,LUA_OPLE:E,LUA_OPLT:N,LUA_OPUNM:U,LUA_REGISTRYINDEX:$,LUA_RIDX_GLOBALS:ge,LUA_VERSION_NUM:ie,constant_types:{LUA_NUMTAGS:Se,LUA_TBOOLEAN:q,LUA_TCCL:Z,LUA_TFUNCTION:Q,LUA_TLCF:Te,LUA_TLCL:J,LUA_TLIGHTUSERDATA:Me,LUA_TLNGSTR:Le,LUA_TNIL:ye,LUA_TNONE:Ke,LUA_TNUMFLT:ut,LUA_TNUMINT:Re,LUA_TSHRSTR:Ue,LUA_TTABLE:Pe,LUA_TTHREAD:ce,LUA_TUSERDATA:ae},thread_status:{LUA_OK:R},from_userstring:Oe,to_luastring:me}=rn(),{api_check:W}=yn(),_e=pa(),H=Yn(),{luaU_dump:D}=cs(),Ce=Ma(),ve=Mn(),ze=ha(),{luaS_bless:de,luaS_new:Ye,luaS_newliteral:Je}=ra(),x=Ia(),{LUAI_MAXSTACK:Y}=wn(),X=Ra(),he=sa(),{ZIO:ee}=Ha(),ne=ve.TValue,je=ve.CClosure,nt=function(e){e.top++,W(e,e.top<=e.ci.top,"stack overflow")},at=function(e,i){W(e,i<e.top-e.ci.funcOff,"not enough elements in the stack")},ft=function(e){if(!e)throw TypeError("invalid argument")},ct=function(e){ft(typeof e=="number"&&(e|0)===e)},ht=function(e){return e!==ve.luaO_nilobject},pt=function(e){return e===null?ie:e.l_G.version},Et=function(e,i){let t=e.l_G.panic;return e.l_G.panic=i,t},bt=function(e,i){let t=e.l_G.atnativeerror;return e.l_G.atnativeerror=i,t},Ze=function(e,i){let t=e.ci;if(i>0){let r=t.funcOff+i;return W(e,i<=t.top-(t.funcOff+1),"unacceptable index"),r>=e.top?ve.luaO_nilobject:e.stack[r]}else return i>$?(W(e,i!==0&&-i<=e.top,"invalid index"),e.stack[e.top+i]):i===$?e.l_G.l_registry:(i=$-i,W(e,i<=Ce.MAXUPVAL+1,"upvalue index too large"),t.func.ttislcf()?ve.luaO_nilobject:i<=t.func.value.nupvalues?t.func.value.upvalue[i-1]:ve.luaO_nilobject)},St=function(e,i){let t=e.ci;if(i>0){let r=t.funcOff+i;return W(e,i<=t.top-(t.funcOff+1),"unacceptable index"),r>=e.top?null:r}else{if(i>$)return W(e,i!==0&&-i<=e.top,"invalid index"),e.top+i;throw Error("attempt to use pseudo-index")}},tt=function(e,i){let t,r=e.ci;return W(e,i>=0,"negative 'n'"),e.stack_last-e.top>i?t=!0:e.top+ze.EXTRA_STACK>Y-i?t=!1:(H.luaD_growstack(e,i),t=!0),t&&r.top<e.top+i&&(r.top=e.top+i),t},gt=function(e,i,t){if(e!==i){at(e,t),W(e,e.l_G===i.l_G,"moving among independent states"),W(e,i.ci.top-i.top>=t,"stack overflow"),e.top-=t;for(let r=0;r<t;r++)i.stack[i.top]=new ve.TValue,ve.setobj2s(i,i.top,e.stack[e.top+r]),delete e.stack[e.top+r],i.top++}},we=function(e,i){return i>0||i<=$?i:e.top-e.ci.funcOff+i},K=function(e){return e.top-(e.ci.funcOff+1)},I=function(e,i){ve.pushobj2s(e,Ze(e,i)),W(e,e.top<=e.ci.top,"stack overflow")},O=function(e,i){let t=e.ci.funcOff,r;i>=0?(W(e,i<=e.stack_last-(t+1),"new top too large"),r=t+1+i):(W(e,-(i+1)<=e.top-(t+1),"invalid new top"),r=e.top+i+1),H.adjust_top(e,r)},A=function(e,i){O(e,-i-1)},g=function(e,i,t){for(;i<t;i++,t--){let r=e.stack[i],c=new ne(r.type,r.value);ve.setobjs2s(e,i,t),ve.setobj2s(e,t,c)}},v=function(e,i,t){let r=e.top-1,c=St(e,i),k=e.stack[c];W(e,ht(k)&&i>$,"index not in the stack"),W(e,(t>=0?t:-t)<=r-c+1,"invalid 'n'");let M=t>=0?r-t:c-t-1;g(e,c,M),g(e,M+1,e.top-1),g(e,c,e.top-1)},B=function(e,i,t){let r=Ze(e,i);Ze(e,t).setfrom(r)},ue=function(e,i){v(e,i,-1),A(e,1)},ot=function(e,i){v(e,i,1)},st=function(e,i){B(e,-1,i),A(e,1)},Fe=function(e){e.stack[e.top]=new ne(ye,null),nt(e)},y=function(e,i){ft(typeof i=="number"),e.stack[e.top]=new ne(ut,i),nt(e)},V=function(e,i){ct(i),e.stack[e.top]=new ne(Re,i),nt(e)},Ae=function(e,i,t){ct(t);let r;return t===0?(i=me("",!0),r=de(e,i)):(i=Oe(i),W(e,i.length>=t,"invalid length to lua_pushlstring"),r=Ye(e,i.subarray(0,t))),ve.pushsvalue2s(e,r),W(e,e.top<=e.ci.top,"stack overflow"),r.value},De=function(e,i){if(i==null)e.stack[e.top]=new ne(ye,null),e.top++;else{let t=Ye(e,Oe(i));ve.pushsvalue2s(e,t),i=t.getstr()}return W(e,e.top<=e.ci.top,"stack overflow"),i},qe=function(e,i,t){return i=Oe(i),ve.luaO_pushvfstring(e,i,t)},_=function(e,i,...t){return i=Oe(i),ve.luaO_pushvfstring(e,i,t)},te=function(e,i){if(i==null)e.stack[e.top]=new ne(ye,null),e.top++;else{ft(typeof i=="string");let t=Je(e,i);ve.pushsvalue2s(e,t),i=t.getstr()}return W(e,e.top<=e.ci.top,"stack overflow"),i},P=function(e,i,t){if(ft(typeof i=="function"),ct(t),t===0)e.stack[e.top]=new ne(Te,i);else{at(e,t),W(e,t<=Ce.MAXUPVAL,"upvalue index too large");let r=new je(e,i,t);for(let c=0;c<t;c++)r.upvalue[c].setfrom(e.stack[e.top-t+c]);for(let c=1;c<t;c++)delete e.stack[--e.top];t>0&&--e.top,e.stack[e.top].setclCvalue(r)}nt(e)},se=P,Ne=function(e,i){P(e,i,0)},it=Ne,Qe=function(e,i){e.stack[e.top]=new ne(q,!!i),nt(e)},Rt=function(e,i){e.stack[e.top]=new ne(Me,i),nt(e)},kt=function(e){return e.stack[e.top]=new ne(ce,e),nt(e),e.l_G.mainthread===e},yt=function(e){F(e,$,ge)},vt=function(e,i,t){let r=Ye(e,Oe(t));at(e,1),ve.pushsvalue2s(e,r),W(e,e.top<=e.ci.top,"stack overflow"),X.settable(e,i,e.stack[e.top-1],e.stack[e.top-2]),delete e.stack[--e.top],delete e.stack[--e.top]},Wt=function(e,i){vt(e,he.luaH_getint(e.l_G.l_registry.value,ge),i)},Gt=function(e,i){at(e,1);let t,r=Ze(e,i);switch(e.stack[e.top-1].ttisnil()?t=null:(W(e,e.stack[e.top-1].ttistable(),"table expected"),t=e.stack[e.top-1].value),r.ttnov()){case ae:case Pe:{r.value.metatable=t;break}default:{e.l_G.mt[r.ttnov()]=t;break}}return delete e.stack[--e.top],!0},Nt=function(e,i){at(e,2);let t=Ze(e,i);X.settable(e,t,e.stack[e.top-2],e.stack[e.top-1]),delete e.stack[--e.top],delete e.stack[--e.top]},Dt=function(e,i,t){vt(e,Ze(e,i),t)},Vt=function(e,i,t){ct(t),at(e,1);let r=Ze(e,i);e.stack[e.top]=new ne(Re,t),nt(e),X.settable(e,r,e.stack[e.top-1],e.stack[e.top-2]),delete e.stack[--e.top],delete e.stack[--e.top]},Ht=function(e,i){at(e,2);let t=Ze(e,i);W(e,t.ttistable(),"table expected");let r=e.stack[e.top-2],c=e.stack[e.top-1];he.luaH_setfrom(e,t.value,r,c),he.invalidateTMcache(t.value),delete e.stack[--e.top],delete e.stack[--e.top]},Lt=function(e,i,t){ct(t),at(e,1);let r=Ze(e,i);W(e,r.ttistable(),"table expected"),he.luaH_setint(r.value,t,e.stack[e.top-1]),delete e.stack[--e.top]},Kt=function(e,i,t){at(e,1);let r=Ze(e,i);W(e,r.ttistable(),"table expected");let c=new ne(Me,t),k=e.stack[e.top-1];he.luaH_setfrom(e,r.value,c,k),delete e.stack[--e.top]},Xt=function(e,i,t){let r=Ye(e,Oe(t));return ve.pushsvalue2s(e,r),W(e,e.top<=e.ci.top,"stack overflow"),X.luaV_gettable(e,i,e.stack[e.top-1],e.top-1),e.stack[e.top-1].ttnov()},F=function(e,i,t){let r=Ze(e,i);return ct(t),W(e,r.ttistable(),"table expected"),ve.pushobj2s(e,he.luaH_getint(r.value,t)),W(e,e.top<=e.ci.top,"stack overflow"),e.stack[e.top-1].ttnov()},T=function(e,i,t){let r=Ze(e,i);W(e,r.ttistable(),"table expected");let c=new ne(Me,t);return ve.pushobj2s(e,he.luaH_get(e,r.value,c)),W(e,e.top<=e.ci.top,"stack overflow"),e.stack[e.top-1].ttnov()},Ee=function(e,i){let t=Ze(e,i);return W(e,t.ttistable(t),"table expected"),ve.setobj2s(e,e.top-1,he.luaH_get(e,t.value,e.stack[e.top-1])),e.stack[e.top-1].ttnov()},We=function(e,i,t){let r=new ve.TValue(Pe,he.luaH_new(e));e.stack[e.top]=r,nt(e)},b=function(e,i){return new ve.Udata(e,i)},fe=function(e,i){let t=b(e,i);return e.stack[e.top]=new ve.TValue(ae,t),nt(e),t.data},oe=function(e,i,t){switch(ct(t),i.ttype()){case Z:{let r=i.value;return 1<=t&&t<=r.nupvalues?{name:me("",!0),val:r.upvalue[t-1]}:null}case J:{let r=i.value,c=r.p;if(!(1<=t&&t<=c.upvalues.length))return null;let k=c.upvalues[t-1].name;return{name:k?k.getstr():me("(*no name)",!0),val:r.upvals[t-1]}}default:return null}},He=function(e,i,t){let r=oe(e,Ze(e,i),t);if(r){let c=r.name,k=r.val;return ve.pushobj2s(e,k),W(e,e.top<=e.ci.top,"stack overflow"),c}return null},At=function(e,i,t){let r=Ze(e,i);at(e,1);let c=oe(e,r,t);if(c){let k=c.name;return c.val.setfrom(e.stack[e.top-1]),delete e.stack[--e.top],k}return null},l=function(e){We(e)},n=function(e,i,t){Ne(e,t),Wt(e,i)},u=function(e,i){let t=Ze(e,i),r,c=!1;switch(t.ttnov()){case Pe:case ae:r=t.value.metatable;break;default:r=e.l_G.mt[t.ttnov()];break}return r!=null&&(e.stack[e.top]=new ne(Pe,r),nt(e),c=!0),c},s=function(e,i){let t=Ze(e,i);W(e,t.ttisfulluserdata(),"full userdata expected");let r=t.value.uservalue;return e.stack[e.top]=new ne(r.type,r.value),nt(e),e.stack[e.top-1].ttnov()},C=function(e,i){let t=Ze(e,i);return X.luaV_gettable(e,t,e.stack[e.top-1],e.top-1),e.stack[e.top-1].ttnov()},re=function(e,i,t){return Xt(e,Ze(e,i),t)},Ve=function(e,i,t){let r=Ze(e,i);return ct(t),e.stack[e.top]=new ne(Re,t),nt(e),X.luaV_gettable(e,r,e.stack[e.top-1],e.top-1),e.stack[e.top-1].ttnov()},dt=function(e,i){return Xt(e,he.luaH_getint(e.l_G.l_registry.value,ge),i)},Pt=function(e,i){return!Ze(e,i).l_isfalse()},Bt=function(e,i){let t=Ze(e,i);if(!t.ttisstring()){if(!X.cvt2str(t))return null;ve.luaO_tostring(e,t)}return t.svalue()},Ft=Bt,sn=function(e,i){let t=Ze(e,i);if(!t.ttisstring()){if(!X.cvt2str(t))return null;ve.luaO_tostring(e,t)}return t.jsstring()},jt=function(e,i){let t=Bt(e,i);return new DataView(t.buffer,t.byteOffset,t.byteLength)},f=function(e,i){let t=Ze(e,i);switch(t.ttype()){case Ue:case Le:return t.vslen();case ae:return t.value.len;case Pe:return he.luaH_getn(t.value);default:return 0}},G=function(e,i){let t=Ze(e,i);return t.ttislcf()||t.ttisCclosure()?t.value:null},be=function(e,i){let t=pe(e,i);return t===!1?0:t},pe=function(e,i){return X.tointeger(Ze(e,i))},Xe=function(e,i){let t=ke(e,i);return t===!1?0:t},ke=function(e,i){return X.tonumber(Ze(e,i))},Ie=function(e,i){let t=Ze(e,i);switch(t.ttnov()){case ae:return t.value.data;case Me:return t.value;default:return null}},Mt=function(e,i){let t=Ze(e,i);return t.ttisthread()?t.value:null},le=function(e,i){let t=Ze(e,i);switch(t.ttype()){case Pe:case J:case Z:case Te:case ce:case ae:case Me:return t.value;default:return null}},Be=new WeakMap,$e=function(e,i){let t=Be.get(e);return t?i===null||i.l_G===t:!1},Ot=function(e,i,t){let r=function(c){W(c,c instanceof ze.lua_State&&e===c.l_G,"must be from same global state"),c.stack[c.top]=new ne(i,t),nt(c)};return Be.set(r,e),r},nn=function(e,i){let t=Ze(e,i);return Ot(e.l_G,t.type,t.value)},on=function(e,i,t,r){let c=Ze(e,i),k=Ze(e,t),M=0;if(ht(c)&&ht(k))switch(r){case m:M=X.luaV_equalobj(e,c,k);break;case N:M=X.luaV_lessthan(e,c,k);break;case E:M=X.luaV_lessequal(e,c,k);break;default:W(e,!1,"invalid option")}return M},gn=function(e,i){let t=new ne,r=ve.luaO_str2num(i,t);return r!==0&&(e.stack[e.top]=t,nt(e)),r},Sn=function(e,i){H.luaD_callnoyield(e,i.funcOff,i.nresults)},un=function(e,i){let t=Ze(e,i);return ht(t)?t.ttnov():Ke},Fn=function(e,i){return W(e,Ke<=i&&i<Se,"invalid tag"),x.ttypename(i)},Zn=function(e,i){let t=Ze(e,i);return t.ttislcf(t)||t.ttisCclosure()},On=function(e,i){return un(e,i)===ye},Gn=function(e,i){return un(e,i)===q},Vn=function(e,i){return un(e,i)===Ke},oa=function(e,i){return un(e,i)<=0},An=function(e,i){return Ze(e,i).ttistable()},Ln=function(e,i){return Ze(e,i).ttisinteger()},ga=function(e,i){return X.tonumber(Ze(e,i))!==!1},fn=function(e,i){let t=Ze(e,i);return t.ttisstring()||X.cvt2str(t)},ia=function(e,i){let t=Ze(e,i);return t.ttisfulluserdata(t)||t.ttislightuserdata()},Jn=function(e,i){return un(e,i)===ce},$n=function(e,i){return un(e,i)===Q},Aa=function(e,i){return un(e,i)===Me},ua=function(e,i,t){let r=Ze(e,i),c=Ze(e,t);return ht(r)&&ht(c)?X.luaV_equalobj(null,r,c):0},_n=function(e,i){i!==U&&i!==o?at(e,2):(at(e,1),ve.pushobj2s(e,e.stack[e.top-1]),W(e,e.top<=e.ci.top,"stack overflow")),ve.luaO_arith(e,i,e.stack[e.top-2],e.stack[e.top-1],e.stack[e.top-2]),delete e.stack[--e.top]},Hn=me("?"),Nn=function(e,i,t,r,c){r?r=Oe(r):r=Hn,c!==null&&(c=Oe(c));let k=new ee(e,i,t),M=H.luaD_protectedparser(e,k,r,c);if(M===R){let z=e.stack[e.top-1].value;if(z.nupvalues>=1){let lt=he.luaH_getint(e.l_G.l_registry.value,ge);z.upvals[0].setfrom(lt)}}return M},Cn=function(e,i,t,r){at(e,1);let c=e.stack[e.top-1];return c.ttisLclosure()?D(e,c.value.p,i,t,r):1},Qn=function(e){return e.status},dn=function(e,i){at(e,1);let t=Ze(e,i);W(e,t.ttisfulluserdata(),"full userdata expected"),t.value.uservalue.setfrom(e.stack[e.top-1]),delete e.stack[--e.top]},Pn=function(e,i,t){W(e,t===d||e.ci.top-e.top>=t-i,"results from function overflow current stack size")},xn=function(e,i,t,r,c){W(e,c===null||!(e.ci.callstatus&ze.CIST_LUA),"cannot use continuations inside hooks"),at(e,i+1),W(e,e.status===R,"cannot do calls on non-normal thread"),Pn(e,i,t);let k=e.top-(i+1);c!==null&&e.nny===0?(e.ci.c_k=c,e.ci.c_ctx=r,H.luaD_call(e,k,t)):H.luaD_callnoyield(e,k,t),t===d&&e.ci.top<e.top&&(e.ci.top=e.top)},ma=function(e,i,t){xn(e,i,t,0,null)},Dn=function(e,i,t,r,c,k){W(e,k===null||!(e.ci.callstatus&ze.CIST_LUA),"cannot use continuations inside hooks"),at(e,i+1),W(e,e.status===R,"cannot do calls on non-normal thread"),Pn(e,i,t);let M,z;r===0?z=0:z=St(e,r);let lt=e.top-(i+1);if(k===null||e.nny>0){let rt={funcOff:lt,nresults:t};M=H.luaD_pcall(e,Sn,rt,lt,z)}else{let rt=e.ci;rt.c_k=k,rt.c_ctx=c,rt.extra=lt,rt.c_old_errfunc=e.errfunc,e.errfunc=z,rt.callstatus&=~ze.CIST_OAH|e.allowhook,rt.callstatus|=ze.CIST_YPCALL,H.luaD_call(e,lt,t),rt.callstatus&=~ze.CIST_YPCALL,e.errfunc=rt.c_old_errfunc,M=R}return t===d&&e.ci.top<e.top&&(e.ci.top=e.top),M},mn=function(e,i,t,r){return Dn(e,i,t,r,0,null)},ca=function(e){at(e,1),_e.luaG_errormsg(e)},ea=function(e,i){let t=Ze(e,i);return W(e,t.ttistable(),"table expected"),e.stack[e.top]=new ne,he.luaH_next(e,t.value,e.top-1)?(nt(e),1):(delete e.stack[e.top],delete e.stack[--e.top],0)},ba=function(e,i){at(e,i),i>=2?X.luaV_concat(e,i):i===0&&(ve.pushsvalue2s(e,de(e,me("",!0))),W(e,e.top<=e.ci.top,"stack overflow"))},Bn=function(e,i){let t=Ze(e,i),r=new ne;X.luaV_objlen(e,r,t),e.stack[e.top]=r,nt(e)},bn=function(e,i,t){let r=Ze(e,i);W(e,r.ttisLclosure(),"Lua function expected");let c=r.value;return ct(t),W(e,1<=t&&t<=c.p.upvalues.length,"invalid upvalue index"),{f:c,i:t-1}},fa=function(e,i,t){let r=Ze(e,i);switch(r.ttype()){case J:{let c=bn(e,i,t);return c.f.upvals[c.i]}case Z:{let c=r.value;return W(e,(t|0)===t&&t>0&&t<=c.nupvalues,"invalid upvalue index"),c.upvalue[t-1]}default:return W(e,!1,"closure expected"),null}},Ta=function(e,i,t,r,c){let k=bn(e,i,t),M=bn(e,r,c),z=M.f.upvals[M.i];k.f.upvals[k.i]=z},Xn=function(){},Ea=function(){return console.warn("lua_getallocf is not available"),0},p=function(){return console.warn("lua_setallocf is not available"),0},w=function(){return console.warn("lua_getextraspace is not available"),0};return Ge.api_incr_top=nt,Ge.api_checknelems=at,Ge.lua_absindex=we,Ge.lua_arith=_n,Ge.lua_atpanic=Et,Ge.lua_atnativeerror=bt,Ge.lua_call=ma,Ge.lua_callk=xn,Ge.lua_checkstack=tt,Ge.lua_compare=on,Ge.lua_concat=ba,Ge.lua_copy=B,Ge.lua_createtable=We,Ge.lua_dump=Cn,Ge.lua_error=ca,Ge.lua_gc=Xn,Ge.lua_getallocf=Ea,Ge.lua_getextraspace=w,Ge.lua_getfield=re,Ge.lua_getglobal=dt,Ge.lua_geti=Ve,Ge.lua_getmetatable=u,Ge.lua_gettable=C,Ge.lua_gettop=K,Ge.lua_getupvalue=He,Ge.lua_getuservalue=s,Ge.lua_insert=ot,Ge.lua_isboolean=Gn,Ge.lua_iscfunction=Zn,Ge.lua_isfunction=$n,Ge.lua_isinteger=Ln,Ge.lua_islightuserdata=Aa,Ge.lua_isnil=On,Ge.lua_isnone=Vn,Ge.lua_isnoneornil=oa,Ge.lua_isnumber=ga,Ge.lua_isproxy=$e,Ge.lua_isstring=fn,Ge.lua_istable=An,Ge.lua_isthread=Jn,Ge.lua_isuserdata=ia,Ge.lua_len=Bn,Ge.lua_load=Nn,Ge.lua_newtable=l,Ge.lua_newuserdata=fe,Ge.lua_next=ea,Ge.lua_pcall=mn,Ge.lua_pcallk=Dn,Ge.lua_pop=A,Ge.lua_pushboolean=Qe,Ge.lua_pushcclosure=P,Ge.lua_pushcfunction=Ne,Ge.lua_pushfstring=_,Ge.lua_pushglobaltable=yt,Ge.lua_pushinteger=V,Ge.lua_pushjsclosure=se,Ge.lua_pushjsfunction=it,Ge.lua_pushlightuserdata=Rt,Ge.lua_pushliteral=te,Ge.lua_pushlstring=Ae,Ge.lua_pushnil=Fe,Ge.lua_pushnumber=y,Ge.lua_pushstring=De,Ge.lua_pushthread=kt,Ge.lua_pushvalue=I,Ge.lua_pushvfstring=qe,Ge.lua_rawequal=ua,Ge.lua_rawget=Ee,Ge.lua_rawgeti=F,Ge.lua_rawgetp=T,Ge.lua_rawlen=f,Ge.lua_rawset=Ht,Ge.lua_rawseti=Lt,Ge.lua_rawsetp=Kt,Ge.lua_register=n,Ge.lua_remove=ue,Ge.lua_replace=st,Ge.lua_rotate=v,Ge.lua_setallocf=p,Ge.lua_setfield=Dt,Ge.lua_setglobal=Wt,Ge.lua_seti=Vt,Ge.lua_setmetatable=Gt,Ge.lua_settable=Nt,Ge.lua_settop=O,Ge.lua_setupvalue=At,Ge.lua_setuservalue=dn,Ge.lua_status=Qn,Ge.lua_stringtonumber=gn,Ge.lua_toboolean=Pt,Ge.lua_tocfunction=G,Ge.lua_todataview=jt,Ge.lua_tointeger=be,Ge.lua_tointegerx=pe,Ge.lua_tojsstring=sn,Ge.lua_tolstring=Bt,Ge.lua_tonumber=Xe,Ge.lua_tonumberx=ke,Ge.lua_topointer=le,Ge.lua_toproxy=nn,Ge.lua_tostring=Ft,Ge.lua_tothread=Mt,Ge.lua_touserdata=Ie,Ge.lua_type=un,Ge.lua_typename=Fn,Ge.lua_upvalueid=fa,Ge.lua_upvaluejoin=Ta,Ge.lua_version=pt,Ge.lua_xmove=gt,Ge}var Gl;function kn(){if(Gl)return j;Gl=1;const d=rn(),o=Xa(),m=pa(),E=Yn(),N=ha();return j.LUA_AUTHORS=d.LUA_AUTHORS,j.LUA_COPYRIGHT=d.LUA_COPYRIGHT,j.LUA_ERRERR=d.thread_status.LUA_ERRERR,j.LUA_ERRGCMM=d.thread_status.LUA_ERRGCMM,j.LUA_ERRMEM=d.thread_status.LUA_ERRMEM,j.LUA_ERRRUN=d.thread_status.LUA_ERRRUN,j.LUA_ERRSYNTAX=d.thread_status.LUA_ERRSYNTAX,j.LUA_HOOKCALL=d.LUA_HOOKCALL,j.LUA_HOOKCOUNT=d.LUA_HOOKCOUNT,j.LUA_HOOKLINE=d.LUA_HOOKLINE,j.LUA_HOOKRET=d.LUA_HOOKRET,j.LUA_HOOKTAILCALL=d.LUA_HOOKTAILCALL,j.LUA_MASKCALL=d.LUA_MASKCALL,j.LUA_MASKCOUNT=d.LUA_MASKCOUNT,j.LUA_MASKLINE=d.LUA_MASKLINE,j.LUA_MASKRET=d.LUA_MASKRET,j.LUA_MINSTACK=d.LUA_MINSTACK,j.LUA_MULTRET=d.LUA_MULTRET,j.LUA_NUMTAGS=d.constant_types.LUA_NUMTAGS,j.LUA_OK=d.thread_status.LUA_OK,j.LUA_OPADD=d.LUA_OPADD,j.LUA_OPBAND=d.LUA_OPBAND,j.LUA_OPBNOT=d.LUA_OPBNOT,j.LUA_OPBOR=d.LUA_OPBOR,j.LUA_OPBXOR=d.LUA_OPBXOR,j.LUA_OPDIV=d.LUA_OPDIV,j.LUA_OPEQ=d.LUA_OPEQ,j.LUA_OPIDIV=d.LUA_OPIDIV,j.LUA_OPLE=d.LUA_OPLE,j.LUA_OPLT=d.LUA_OPLT,j.LUA_OPMOD=d.LUA_OPMOD,j.LUA_OPMUL=d.LUA_OPMUL,j.LUA_OPPOW=d.LUA_OPPOW,j.LUA_OPSHL=d.LUA_OPSHL,j.LUA_OPSHR=d.LUA_OPSHR,j.LUA_OPSUB=d.LUA_OPSUB,j.LUA_OPUNM=d.LUA_OPUNM,j.LUA_REGISTRYINDEX=d.LUA_REGISTRYINDEX,j.LUA_RELEASE=d.LUA_RELEASE,j.LUA_RIDX_GLOBALS=d.LUA_RIDX_GLOBALS,j.LUA_RIDX_LAST=d.LUA_RIDX_LAST,j.LUA_RIDX_MAINTHREAD=d.LUA_RIDX_MAINTHREAD,j.LUA_SIGNATURE=d.LUA_SIGNATURE,j.LUA_TNONE=d.constant_types.LUA_TNONE,j.LUA_TNIL=d.constant_types.LUA_TNIL,j.LUA_TBOOLEAN=d.constant_types.LUA_TBOOLEAN,j.LUA_TLIGHTUSERDATA=d.constant_types.LUA_TLIGHTUSERDATA,j.LUA_TNUMBER=d.constant_types.LUA_TNUMBER,j.LUA_TSTRING=d.constant_types.LUA_TSTRING,j.LUA_TTABLE=d.constant_types.LUA_TTABLE,j.LUA_TFUNCTION=d.constant_types.LUA_TFUNCTION,j.LUA_TUSERDATA=d.constant_types.LUA_TUSERDATA,j.LUA_TTHREAD=d.constant_types.LUA_TTHREAD,j.LUA_VERSION=d.LUA_VERSION,j.LUA_VERSION_MAJOR=d.LUA_VERSION_MAJOR,j.LUA_VERSION_MINOR=d.LUA_VERSION_MINOR,j.LUA_VERSION_NUM=d.LUA_VERSION_NUM,j.LUA_VERSION_RELEASE=d.LUA_VERSION_RELEASE,j.LUA_YIELD=d.thread_status.LUA_YIELD,j.lua_Debug=d.lua_Debug,j.lua_upvalueindex=d.lua_upvalueindex,j.lua_absindex=o.lua_absindex,j.lua_arith=o.lua_arith,j.lua_atpanic=o.lua_atpanic,j.lua_atnativeerror=o.lua_atnativeerror,j.lua_call=o.lua_call,j.lua_callk=o.lua_callk,j.lua_checkstack=o.lua_checkstack,j.lua_close=N.lua_close,j.lua_compare=o.lua_compare,j.lua_concat=o.lua_concat,j.lua_copy=o.lua_copy,j.lua_createtable=o.lua_createtable,j.lua_dump=o.lua_dump,j.lua_error=o.lua_error,j.lua_gc=o.lua_gc,j.lua_getallocf=o.lua_getallocf,j.lua_getextraspace=o.lua_getextraspace,j.lua_getfield=o.lua_getfield,j.lua_getglobal=o.lua_getglobal,j.lua_gethook=m.lua_gethook,j.lua_gethookcount=m.lua_gethookcount,j.lua_gethookmask=m.lua_gethookmask,j.lua_geti=o.lua_geti,j.lua_getinfo=m.lua_getinfo,j.lua_getlocal=m.lua_getlocal,j.lua_getmetatable=o.lua_getmetatable,j.lua_getstack=m.lua_getstack,j.lua_gettable=o.lua_gettable,j.lua_gettop=o.lua_gettop,j.lua_getupvalue=o.lua_getupvalue,j.lua_getuservalue=o.lua_getuservalue,j.lua_insert=o.lua_insert,j.lua_isboolean=o.lua_isboolean,j.lua_iscfunction=o.lua_iscfunction,j.lua_isfunction=o.lua_isfunction,j.lua_isinteger=o.lua_isinteger,j.lua_islightuserdata=o.lua_islightuserdata,j.lua_isnil=o.lua_isnil,j.lua_isnone=o.lua_isnone,j.lua_isnoneornil=o.lua_isnoneornil,j.lua_isnumber=o.lua_isnumber,j.lua_isproxy=o.lua_isproxy,j.lua_isstring=o.lua_isstring,j.lua_istable=o.lua_istable,j.lua_isthread=o.lua_isthread,j.lua_isuserdata=o.lua_isuserdata,j.lua_isyieldable=E.lua_isyieldable,j.lua_len=o.lua_len,j.lua_load=o.lua_load,j.lua_newstate=N.lua_newstate,j.lua_newtable=o.lua_newtable,j.lua_newthread=N.lua_newthread,j.lua_newuserdata=o.lua_newuserdata,j.lua_next=o.lua_next,j.lua_pcall=o.lua_pcall,j.lua_pcallk=o.lua_pcallk,j.lua_pop=o.lua_pop,j.lua_pushboolean=o.lua_pushboolean,j.lua_pushcclosure=o.lua_pushcclosure,j.lua_pushcfunction=o.lua_pushcfunction,j.lua_pushfstring=o.lua_pushfstring,j.lua_pushglobaltable=o.lua_pushglobaltable,j.lua_pushinteger=o.lua_pushinteger,j.lua_pushjsclosure=o.lua_pushjsclosure,j.lua_pushjsfunction=o.lua_pushjsfunction,j.lua_pushlightuserdata=o.lua_pushlightuserdata,j.lua_pushliteral=o.lua_pushliteral,j.lua_pushlstring=o.lua_pushlstring,j.lua_pushnil=o.lua_pushnil,j.lua_pushnumber=o.lua_pushnumber,j.lua_pushstring=o.lua_pushstring,j.lua_pushthread=o.lua_pushthread,j.lua_pushvalue=o.lua_pushvalue,j.lua_pushvfstring=o.lua_pushvfstring,j.lua_rawequal=o.lua_rawequal,j.lua_rawget=o.lua_rawget,j.lua_rawgeti=o.lua_rawgeti,j.lua_rawgetp=o.lua_rawgetp,j.lua_rawlen=o.lua_rawlen,j.lua_rawset=o.lua_rawset,j.lua_rawseti=o.lua_rawseti,j.lua_rawsetp=o.lua_rawsetp,j.lua_register=o.lua_register,j.lua_remove=o.lua_remove,j.lua_replace=o.lua_replace,j.lua_resume=E.lua_resume,j.lua_rotate=o.lua_rotate,j.lua_setallocf=o.lua_setallocf,j.lua_setfield=o.lua_setfield,j.lua_setglobal=o.lua_setglobal,j.lua_sethook=m.lua_sethook,j.lua_seti=o.lua_seti,j.lua_setlocal=m.lua_setlocal,j.lua_setmetatable=o.lua_setmetatable,j.lua_settable=o.lua_settable,j.lua_settop=o.lua_settop,j.lua_setupvalue=o.lua_setupvalue,j.lua_setuservalue=o.lua_setuservalue,j.lua_status=o.lua_status,j.lua_stringtonumber=o.lua_stringtonumber,j.lua_toboolean=o.lua_toboolean,j.lua_todataview=o.lua_todataview,j.lua_tointeger=o.lua_tointeger,j.lua_tointegerx=o.lua_tointegerx,j.lua_tojsstring=o.lua_tojsstring,j.lua_tolstring=o.lua_tolstring,j.lua_tonumber=o.lua_tonumber,j.lua_tonumberx=o.lua_tonumberx,j.lua_topointer=o.lua_topointer,j.lua_toproxy=o.lua_toproxy,j.lua_tostring=o.lua_tostring,j.lua_tothread=o.lua_tothread,j.lua_touserdata=o.lua_touserdata,j.lua_type=o.lua_type,j.lua_typename=o.lua_typename,j.lua_upvalueid=o.lua_upvalueid,j.lua_upvaluejoin=o.lua_upvaluejoin,j.lua_version=o.lua_version,j.lua_xmove=o.lua_xmove,j.lua_yield=E.lua_yield,j.lua_yieldk=E.lua_yieldk,j.lua_tocfunction=o.lua_tocfunction,j}var _t={},Vl;function Un(){if(Vl)return _t;Vl=1;const{LUAL_BUFFERSIZE:d}=wn(),{LUA_ERRERR:o,LUA_MULTRET:m,LUA_REGISTRYINDEX:E,LUA_SIGNATURE:N,LUA_TBOOLEAN:U,LUA_TLIGHTUSERDATA:$,LUA_TNIL:ge,LUA_TNONE:ie,LUA_TNUMBER:Se,LUA_TSTRING:q,LUA_TTABLE:Z,LUA_VERSION_NUM:Q,lua_Debug:Te,lua_absindex:J,lua_atpanic:Me,lua_call:Le,lua_checkstack:ye,lua_concat:Ke,lua_copy:ut,lua_createtable:Re,lua_error:Ue,lua_getfield:Pe,lua_getinfo:ce,lua_getmetatable:ae,lua_getstack:R,lua_gettop:Oe,lua_insert:me,lua_isinteger:W,lua_isnil:_e,lua_isnumber:H,lua_isstring:D,lua_istable:Ce,lua_len:ve,lua_load:ze,lua_newstate:de,lua_newtable:Ye,lua_next:Je,lua_pcall:x,lua_pop:Y,lua_pushboolean:X,lua_pushcclosure:he,lua_pushcfunction:ee,lua_pushfstring:ne,lua_pushinteger:je,lua_pushliteral:nt,lua_pushlstring:at,lua_pushnil:ft,lua_pushstring:ct,lua_pushvalue:ht,lua_pushvfstring:pt,lua_rawequal:Et,lua_rawget:bt,lua_rawgeti:Ze,lua_rawlen:St,lua_rawseti:tt,lua_remove:gt,lua_setfield:we,lua_setglobal:K,lua_setmetatable:I,lua_settop:O,lua_toboolean:A,lua_tointeger:g,lua_tointegerx:v,lua_tojsstring:B,lua_tolstring:ue,lua_tonumber:ot,lua_tonumberx:st,lua_topointer:Fe,lua_tostring:y,lua_touserdata:V,lua_type:Ae,lua_typename:De,lua_version:qe}=kn(),{from_userstring:_,luastring_eq:te,to_luastring:P,to_uristring:se}=In(),Ne=o+1,it=P("_LOADED"),Qe=P("_PRELOAD"),Rt=P("FILE*"),kt=72,yt=P("__name"),vt=P("__tostring"),Wt=new Uint8Array(0);class Gt{constructor(){this.L=null,this.b=Wt,this.n=0}}const Nt=10,Dt=11,Vt=function(p,w,e){if(e===0||!Ce(p,-1))return 0;for(ft(p);Je(p,-2);){if(Ae(p,-2)===q){if(Et(p,w,-1))return Y(p,1),1;if(Vt(p,w,e-1))return gt(p,-2),nt(p,"."),me(p,-2),Ke(p,3),1}Y(p,1)}return 0},Ht=function(p,w){let e=Oe(p);if(ce(p,P("f"),w),Pe(p,E,it),Vt(p,e+1,2)){let i=y(p,-1);return i[0]===95&&i[1]===71&&i[2]===46&&(ct(p,i.subarray(3)),gt(p,-2)),ut(p,-1,e+1),Y(p,2),1}else return O(p,e),0},Lt=function(p,w){Ht(p,w)?(ne(p,P("function '%s'"),y(p,-1)),gt(p,-2)):w.namewhat.length!==0?ne(p,P("%s '%s'"),w.namewhat,w.name):w.what&&w.what[0]===109?nt(p,"main chunk"):w.what&&w.what[0]===76?ne(p,P("function <%s:%d>"),w.short_src,w.linedefined):nt(p,"?")},Kt=function(p){let w=new Te,e=1,i=1;for(;R(p,i,w);)e=i,i*=2;for(;e<i;){let t=Math.floor((e+i)/2);R(p,t,w)?e=t+1:i=t}return i-1},Xt=function(p,w,e,i){let t=new Te,r=Oe(p),c=Kt(w),k=c-i>Nt+Dt?Nt:-1;for(e&&ne(p,P(`%s
`),e),Nn(p,10,null),nt(p,"stack traceback:");R(w,i++,t);)k--===0?(nt(p,`
	...`),i=c-Dt+1):(ce(w,P("Slnt",!0),t),ne(p,P(`
	%s:`),t.short_src),t.currentline>0&&nt(p,`${t.currentline}:`),nt(p," in "),Lt(p,t),t.istailcall&&nt(p,`
	(...tail calls..)`),Ke(p,Oe(p)-r));Ke(p,Oe(p)-r)},F=function(p){let w="PANIC: unprotected error in call to Lua API ("+B(p,-1)+")";throw new Error(w)},T=function(p,w,e){let i=new Te;return R(p,0,i)?(ce(p,P("n"),i),te(i.namewhat,P("method"))&&(w--,w===0)?b(p,P("calling '%s' on bad self (%s)"),i.name,e):(i.name===null&&(i.name=Ht(p,i)?y(p,-1):P("?")),b(p,P("bad argument #%d to '%s' (%s)"),w,i.name,e))):b(p,P("bad argument #%d (%s)"),w,e)},Ee=function(p,w,e){let i;An(p,w,yt)===q?i=y(p,-1):Ae(p,w)===$?i=P("light userdata",!0):i=Ve(p,w);let t=ne(p,P("%s expected, got %s"),e,i);return T(p,w,t)},We=function(p,w){let e=new Te;if(R(p,w,e)&&(ce(p,P("Sl",!0),e),e.currentline>0)){ne(p,P("%s:%d: "),e.short_src,e.currentline);return}ct(p,P(""))},b=function(p,w,...e){return We(p,1),pt(p,w,e),Ke(p,2),Ue(p)},fe=function(p,w,e,i){if(w)return X(p,1),1;{ft(p);let t,r;return i?(t=i.message,r=-i.errno):(t="Success",r=0),e?ne(p,P("%s: %s"),e,P(t)):ct(p,P(t)),je(p,r),3}},oe=function(p,w){let e,i;if(w===null)return X(p,1),nt(p,"exit"),je(p,0),3;if(w.status)e="exit",i=w.status;else if(w.signal)e="signal",i=w.signal;else return fe(p,0,null,w);return ft(p),nt(p,e),je(p,i),3},He=function(p,w){return Pe(p,E,w)},At=function(p,w){return He(p,w)!==ge?0:(Y(p,1),Re(p,0,2),ct(p,w),we(p,-2,yt),ht(p,-1),we(p,E,w),1)},l=function(p,w){He(p,w),I(p,-2)},n=function(p,w,e){let i=V(p,w);return i!==null&&ae(p,w)?(He(p,e),Et(p,-1,-2)||(i=null),Y(p,2),i):null},u=function(p,w,e){let i=n(p,w,e);return i===null&&Ee(p,w,e),i},s=function(p,w,e,i){let t=e!==null?f(p,w,e):sn(p,w);for(let r=0;i[r];r++)if(te(i[r],t))return r;return T(p,w,ne(p,P("invalid option '%s'"),t))},C=function(p,w,e){Ee(p,w,De(p,e))},re=function(){let p=de();return p&&Me(p,F),p},Ve=function(p,w){return De(p,Ae(p,w))},dt=function(p,w,e,i){w||T(p,e,i)},Pt=function(p,w){Ae(p,w)===ie&&T(p,w,P("value expected",!0))},Bt=function(p,w,e){Ae(p,w)!==e&&C(p,w,e)},Ft=function(p,w){let e=ue(p,w);return e==null&&C(p,w,q),e},sn=Ft,jt=function(p,w,e){return Ae(p,w)<=0?e===null?null:_(e):Ft(p,w)},f=jt,G=function(p,w){H(p,w)?T(p,w,P("number has no integer representation",!0)):C(p,w,Se)},be=function(p,w){let e=st(p,w);return e===!1&&C(p,w,Se),e},pe=function(p,w,e){return Fn(p,be,w,e)},Xe=function(p,w){let e=v(p,w);return e===!1&&G(p,w),e},ke=function(p,w,e){return Fn(p,Xe,w,e)},Ie=function(p,w){let e=p.n+w;if(p.b.length<e){let i=Math.max(p.b.length*2,e),t=new Uint8Array(i);t.set(p.b),p.b=t}return p.b.subarray(p.n,e)},Mt=function(p,w){w.L=p,w.b=Wt},le=function(p,w,e){return Mt(p,w),Ie(w,e)},Be=function(p){return Ie(p,d)},$e=function(p,w,e){e>0&&(w=_(w),Ie(p,e).set(w.subarray(0,e)),gn(p,e))},Ot=function(p,w){w=_(w),$e(p,w,w.length)},nn=function(p){at(p.L,p.b,p.n),p.n=0,p.b=Wt},on=function(p,w){Ie(p,1),p.b[p.n++]=w},gn=function(p,w){p.n+=w},Sn=function(p,w){gn(p,w),nn(p)},un=function(p){let w=p.L,e=y(w,-1);$e(p,e,e.length),Y(w,1)},Fn=function(p,w,e,i){return Ae(p,e)<=0?i:w(p,e)},Zn=function(p,w){let e=w.string;return w.string=null,e},On=function(p,w,e,i,t){return ze(p,Zn,{string:w},i,t)},Gn=function(p,w,e,i){return On(p,w,e,i,null)},Vn=function(p,w){return Gn(p,w,w.length,w)},oa=function(p,w){return Vn(p,w)||x(p,0,m,0)},An=function(p,w,e){if(ae(p,w)){ct(p,e);let i=bt(p,-2);return i===ge?Y(p,2):gt(p,-2),i}else return ge},Ln=function(p,w,e){return w=J(p,w),An(p,w,e)===ge?!1:(ht(p,w),Le(p,1,1),!0)},ga=function(p,w){ve(p,w);let e=v(p,-1);return e===!1&&b(p,P("object length is not an integer",!0)),Y(p,1),e},fn=P("%I"),ia=P("%f"),Jn=function(p,w){if(Ln(p,w,vt))D(p,-1)||b(p,P("'__tostring' must return a string"));else switch(Ae(p,w)){case Se:{W(p,w)?ne(p,fn,g(p,w)):ne(p,ia,ot(p,w));break}case q:ht(p,w);break;case U:nt(p,A(p,w)?"true":"false");break;case ge:nt(p,"nil");break;default:{let i=An(p,w,yt),t=i===q?y(p,-1):Ve(p,w);ne(p,P("%s: %p"),t,Fe(p,w)),i!==ge&&gt(p,-2);break}}return ue(p,-1)},$n=function(p,w,e,i){_n(p,E,it),Pe(p,-1,w),A(p,-1)||(Y(p,1),ee(p,e),ct(p,w),Le(p,1,1),ht(p,-1),we(p,-3,w)),gt(p,-2),i&&(ht(p,-1),K(p,w))},Aa=function(p,w,e){var i=e>>>0,t=w.length,r=p.length+1-t;e:for(;i<r;i++){for(let c=0;c<t;c++)if(p[i+c]!==w[c])continue e;return i}return-1},ua=function(p,w,e,i){let t,r=new Gt;for(Mt(p,r);(t=Aa(w,e))>=0;)$e(r,w,t),Ot(r,i),w=w.subarray(t+e.length);return Ot(r,w),nn(r),y(p,-1)},_n=function(p,w,e){return Pe(p,w,e)===Z?!0:(Y(p,1),w=J(p,w),Ye(p),ht(p,-1),we(p,w,e),!1)},Hn=function(p,w,e){Nn(p,e,P("too many upvalues",!0));for(let i in w){for(let t=0;t<e;t++)ht(p,-e);he(p,w[i],e),we(p,-(e+2),P(i))}Y(p,e)},Nn=function(p,w,e){ye(p,w)||(e?b(p,P("stack overflow (%s)"),e):b(p,P("stack overflow",!0)))},Cn=function(p){Re(p)},Qn=function(p,w){Re(p),Hn(p,w,0)},dn=-2,Pn=-1,xn=function(p,w){let e;return _e(p,-1)?(Y(p,1),Pn):(w=J(p,w),Ze(p,w,0),e=g(p,-1),Y(p,1),e!==0?(Ze(p,w,e),tt(p,w,0)):e=St(p,w)+1,tt(p,w,e),e)},ma=function(p,w,e){e>=0&&(w=J(p,w),Ze(p,w,0),tt(p,w,e),je(p,e),tt(p,w,0))},Dn=function(p,w,e,i){let t=i.message,r=y(p,e).subarray(1);return ne(p,P("cannot %s %s: %s"),P(w),r,P(t)),gt(p,e),Ne};let mn;const ca=[239,187,191],ea=function(p){p.n=0;let w,e=0;do{if(w=mn(p),w===null||w!==ca[e])return w;e++,p.buff[p.n++]=w}while(e<ca.length);return p.n=0,mn(p)},ba=function(p){let w=ea(p);if(w===35){do w=mn(p);while(w&&w!==10);return{skipped:!0,c:mn(p)}}else return{skipped:!1,c:w}};let Bn;{class p{constructor(){this.n=NaN,this.f=null,this.buff=new Uint8Array(1024),this.pos=0,this.err=void 0}}const w=function(e,i){let t=i;if(t.f!==null&&t.n>0){let c=t.n;return t.n=0,t.f=t.f.subarray(t.pos),t.buff.subarray(0,c)}let r=t.f;return t.f=null,r};mn=function(e){return e.pos<e.f.length?e.f[e.pos++]:null},Bn=function(e,i,t){let r=new p,c=Oe(e)+1;if(i===null)throw new Error("Can't read stdin in the browser");{ne(e,P("@%s"),i);let lt=se(i),rt=new XMLHttpRequest;if(rt.open("GET",lt,!1),typeof window>"u"&&(rt.responseType="arraybuffer"),rt.send(),rt.status>=200&&rt.status<=299)typeof rt.response=="string"?r.f=P(rt.response):r.f=new Uint8Array(rt.response);else return r.err=rt.status,Dn(e,"open",c,{message:`${rt.status}: ${rt.statusText}`})}let k=ba(r);k.c===N[0]&&i||k.skipped&&(r.buff[r.n++]=10),k.c!==null&&(r.buff[r.n++]=k.c);let M=ze(e,w,r,y(e,-1),t),z=r.err;return z?(O(e,c),Dn(e,"read",c,z)):(gt(e,c),M)}}const bn=function(p,w){return Bn(p,w,null)},fa=function(p,w){return bn(p,w)||x(p,0,m,0)},Ta=function(){for(let p=0;p<arguments.length;p++){let w=arguments[p];do{let e=/([^\n]*)\n?([\d\D]*)/.exec(w);console.error(e[1]),w=e[2]}while(w!=="")}},Xn=function(p,w,e){let i=qe(p);e!=kt&&b(p,P("core and library have incompatible numeric types")),i!=qe(null)?b(p,P("multiple Lua VMs detected")):i!==w&&b(p,P("version mismatch: app. needs %f, Lua core provides %f"),w,i)},Ea=function(p){Xn(p,Q,kt)};return _t.LUA_ERRFILE=Ne,_t.LUA_FILEHANDLE=Rt,_t.LUA_LOADED_TABLE=it,_t.LUA_NOREF=dn,_t.LUA_PRELOAD_TABLE=Qe,_t.LUA_REFNIL=Pn,_t.luaL_Buffer=Gt,_t.luaL_addchar=on,_t.luaL_addlstring=$e,_t.luaL_addsize=gn,_t.luaL_addstring=Ot,_t.luaL_addvalue=un,_t.luaL_argcheck=dt,_t.luaL_argerror=T,_t.luaL_buffinit=Mt,_t.luaL_buffinitsize=le,_t.luaL_callmeta=Ln,_t.luaL_checkany=Pt,_t.luaL_checkinteger=Xe,_t.luaL_checklstring=Ft,_t.luaL_checknumber=be,_t.luaL_checkoption=s,_t.luaL_checkstack=Nn,_t.luaL_checkstring=sn,_t.luaL_checktype=Bt,_t.luaL_checkudata=u,_t.luaL_checkversion=Ea,_t.luaL_checkversion_=Xn,_t.luaL_dofile=fa,_t.luaL_dostring=oa,_t.luaL_error=b,_t.luaL_execresult=oe,_t.luaL_fileresult=fe,_t.luaL_getmetafield=An,_t.luaL_getmetatable=He,_t.luaL_getsubtable=_n,_t.luaL_gsub=ua,_t.luaL_len=ga,_t.luaL_loadbuffer=Gn,_t.luaL_loadbufferx=On,_t.luaL_loadfile=bn,_t.luaL_loadfilex=Bn,_t.luaL_loadstring=Vn,_t.luaL_newlib=Qn,_t.luaL_newlibtable=Cn,_t.luaL_newmetatable=At,_t.luaL_newstate=re,_t.luaL_opt=Fn,_t.luaL_optinteger=ke,_t.luaL_optlstring=jt,_t.luaL_optnumber=pe,_t.luaL_optstring=f,_t.luaL_prepbuffer=Be,_t.luaL_prepbuffsize=Ie,_t.luaL_pushresult=nn,_t.luaL_pushresultsize=Sn,_t.luaL_ref=xn,_t.luaL_requiref=$n,_t.luaL_setfuncs=Hn,_t.luaL_setmetatable=l,_t.luaL_testudata=n,_t.luaL_tolstring=Jn,_t.luaL_traceback=Xt,_t.luaL_typename=Ve,_t.luaL_unref=ma,_t.luaL_where=We,_t.lua_writestringerror=Ta,_t}var Zt={},Ya={},Hl;function _r(){if(Hl)return Ya;Hl=1;const{LUA_MULTRET:d,LUA_OK:o,LUA_TFUNCTION:m,LUA_TNIL:E,LUA_TNONE:N,LUA_TNUMBER:U,LUA_TSTRING:$,LUA_TTABLE:ge,LUA_VERSION:ie,LUA_YIELD:Se,lua_call:q,lua_callk:Z,lua_concat:Q,lua_error:Te,lua_getglobal:J,lua_geti:Me,lua_getmetatable:Le,lua_gettop:ye,lua_insert:Ke,lua_isnil:ut,lua_isnone:Re,lua_isstring:Ue,lua_load:Pe,lua_next:ce,lua_pcallk:ae,lua_pop:R,lua_pushboolean:Oe,lua_pushcfunction:me,lua_pushglobaltable:W,lua_pushinteger:_e,lua_pushliteral:H,lua_pushnil:D,lua_pushstring:Ce,lua_pushvalue:ve,lua_rawequal:ze,lua_rawget:de,lua_rawlen:Ye,lua_rawset:Je,lua_remove:x,lua_replace:Y,lua_rotate:X,lua_setfield:he,lua_setmetatable:ee,lua_settop:ne,lua_setupvalue:je,lua_stringtonumber:nt,lua_toboolean:at,lua_tolstring:ft,lua_tostring:ct,lua_type:ht,lua_typename:pt}=kn(),{luaL_argcheck:Et,luaL_checkany:bt,luaL_checkinteger:Ze,luaL_checkoption:St,luaL_checkstack:tt,luaL_checktype:gt,luaL_error:we,luaL_getmetafield:K,luaL_loadbufferx:I,luaL_loadfile:O,luaL_loadfilex:A,luaL_optinteger:g,luaL_optstring:v,luaL_setfuncs:B,luaL_tolstring:ue,luaL_where:ot}=Un(),{to_jsstring:st,to_luastring:Fe}=In();let y,V;if(typeof TextDecoder=="function"){let n="",u=new TextDecoder("utf-8");y=function(C){n+=u.decode(C,{stream:!0})};let s=new Uint8Array(0);V=function(){n+=u.decode(s),console.log(n),n=""}}else{let n=[];y=function(u){try{u=st(u)}catch{let C=new Uint8Array(u.length);C.set(u),u=C}n.push(u)},V=function(){console.log.apply(console.log,n),n=[]}}const Ae=function(n){let u=ye(n);J(n,Fe("tostring",!0));for(let s=1;s<=u;s++){ve(n,-1),ve(n,s),q(n,1,1);let C=ft(n,-1);if(C===null)return we(n,Fe("'tostring' must return a string to 'print'"));s>1&&y(Fe("	")),y(C),R(n,1)}return V(),0},De=function(n){return bt(n,1),ue(n,1),1},qe=function(n){return bt(n,1),Le(n,1)?(K(n,1,Fe("__metatable",!0)),1):(D(n),1)},_=function(n){let u=ht(n,2);return gt(n,1,ge),Et(n,u===E||u===ge,2,"nil or table expected"),K(n,1,Fe("__metatable",!0))!==E?we(n,Fe("cannot change a protected metatable")):(ne(n,2),ee(n,1),1)},te=function(n){return bt(n,1),bt(n,2),Oe(n,ze(n,1,2)),1},P=function(n){let u=ht(n,1);return Et(n,u===ge||u===$,1,"table or string expected"),_e(n,Ye(n,1)),1},se=function(n){return gt(n,1,ge),bt(n,2),ne(n,2),de(n,1),1},Ne=function(n){return gt(n,1,ge),bt(n,2),bt(n,3),ne(n,3),Je(n,1),1},it=["stop","restart","collect","count","step","setpause","setstepmul","isrunning"].map(n=>Fe(n)),Qe=function(n){St(n,1,"collect",it),g(n,2,0),we(n,Fe("lua_gc not implemented"))},Rt=function(n){let u=ht(n,1);return Et(n,u!==N,1,"value expected"),Ce(n,pt(n,u)),1},kt=function(n,u,s,C){return bt(n,1),K(n,1,u)===E?(me(n,C),ve(n,1),D(n)):(ve(n,1),q(n,1,3)),3},yt=function(n){return gt(n,1,ge),ne(n,2),ce(n,1)?2:(D(n),1)},vt=function(n){return kt(n,Fe("__pairs",!0),0,yt)},Wt=function(n){let u=Ze(n,2)+1;return _e(n,u),Me(n,1,u)===E?1:2},Gt=function(n){return bt(n,1),me(n,Wt),ve(n,1),_e(n,0),3},Nt=function(n,u){try{n=st(n)}catch{return null}let s=/^[\t\v\f \n\r]*([+-]?)0*([0-9A-Za-z]+)[\t\v\f \n\r]*$/.exec(n);if(!s)return null;let C=parseInt(s[1]+s[2],u);return isNaN(C)?null:C|0},Dt=function(n){if(ht(n,2)<=0){if(bt(n,1),ht(n,1)===U)return ne(n,1),1;{let u=ct(n,1);if(u!==null&&nt(n,u)===u.length+1)return 1}}else{let u=Ze(n,2);gt(n,1,$);let s=ct(n,1);Et(n,2<=u&&u<=36,2,"base out of range");let C=Nt(s,u);if(C!==null)return _e(n,C),1}return D(n),1},Vt=function(n){let u=g(n,2,1);return ne(n,1),ht(n,1)===$&&u>0&&(ot(n,u),ve(n,1),Q(n,2)),Te(n)},Ht=function(n){return at(n,1)?ye(n):(bt(n,1),x(n,1),H(n,"assertion failed!"),ne(n,1),Vt(n))},Lt=function(n){let u=ye(n);if(ht(n,1)===$&&ct(n,1)[0]===35)return _e(n,u-1),1;{let s=Ze(n,1);return s<0?s=u+s:s>u&&(s=u),Et(n,1<=s,1,"index out of range"),u-s}},Kt=function(n,u,s){return u!==o&&u!==Se?(Oe(n,0),ve(n,-2),2):ye(n)-s},Xt=function(n){bt(n,1),Oe(n,1),Ke(n,1);let u=ae(n,ye(n)-2,d,0,0,Kt);return Kt(n,u,0)},F=function(n){let u=ye(n);gt(n,2,m),Oe(n,1),ve(n,1),X(n,3,2);let s=ae(n,u-2,d,2,2,Kt);return Kt(n,s,2)},T=function(n,u,s){return u===o?(s!==0&&(ve(n,s),je(n,-2,1)||R(n,1)),1):(D(n),Ke(n,-2),2)},Ee=5,We=function(n,u){return tt(n,2,"too many nested functions"),ve(n,1),q(n,0,1),ut(n,-1)?(R(n,1),null):(Ue(n,-1)||we(n,Fe("reader function must return a string")),Y(n,Ee),ct(n,Ee))},b=function(n){let u=ct(n,1),s=v(n,3,"bt"),C=Re(n,4)?0:4,re;if(u!==null){let Ve=v(n,2,u);re=I(n,u,u.length,Ve,s)}else{let Ve=v(n,2,"=(load)");gt(n,1,m),ne(n,Ee),re=Pe(n,We,null,Ve,s)}return T(n,re,C)},fe=function(n){let u=v(n,1,null),s=v(n,2,null),C=Re(n,3)?0:3,re=A(n,u,s);return T(n,re,C)},oe=function(n,u,s){return ye(n)-1},At={assert:Ht,collectgarbage:Qe,dofile:function(n){let u=v(n,1,null);return ne(n,1),O(n,u)!==o?Te(n):(Z(n,0,d,0,oe),oe(n))},error:Vt,getmetatable:qe,ipairs:Gt,load:b,loadfile:fe,next:yt,pairs:vt,pcall:Xt,print:Ae,rawequal:te,rawget:se,rawlen:P,rawset:Ne,select:Lt,setmetatable:_,tonumber:Dt,tostring:De,type:Rt,xpcall:F},l=function(n){return W(n),B(n,At,0),ve(n,-1),he(n,-2,Fe("_G")),H(n,ie),he(n,-2,Fe("_VERSION")),1};return Ya.luaopen_base=l,Ya}var Za={},Xl;function dr(){if(Xl)return Za;Xl=1;const{LUA_OK:d,LUA_TFUNCTION:o,LUA_TSTRING:m,LUA_YIELD:E,lua_Debug:N,lua_checkstack:U,lua_concat:$,lua_error:ge,lua_getstack:ie,lua_gettop:Se,lua_insert:q,lua_isyieldable:Z,lua_newthread:Q,lua_pop:Te,lua_pushboolean:J,lua_pushcclosure:Me,lua_pushliteral:Le,lua_pushthread:ye,lua_pushvalue:Ke,lua_resume:ut,lua_status:Re,lua_tothread:Ue,lua_type:Pe,lua_upvalueindex:ce,lua_xmove:ae,lua_yield:R}=kn(),{luaL_argcheck:Oe,luaL_checktype:me,luaL_newlib:W,luaL_where:_e}=Un(),H=function(ee){let ne=Ue(ee,1);return Oe(ee,ne,1,"thread expected"),ne},D=function(ee,ne,je){if(!U(ne,je))return Le(ee,"too many arguments to resume"),-1;if(Re(ne)===d&&Se(ne)===0)return Le(ee,"cannot resume dead coroutine"),-1;ae(ee,ne,je);let nt=ut(ne,ee,je);if(nt===d||nt===E){let at=Se(ne);return U(ee,at+1)?(ae(ne,ee,at),at):(Te(ne,at),Le(ee,"too many results to resume"),-1)}else return ae(ne,ee,1),-1},Ce=function(ee){let ne=H(ee),je=D(ee,ne,Se(ee)-1);return je<0?(J(ee,0),q(ee,-2),2):(J(ee,1),q(ee,-(je+1)),je+1)},ve=function(ee){let ne=Ue(ee,ce(1)),je=D(ee,ne,Se(ee));return je<0?(Pe(ee,-1)===m&&(_e(ee,1),q(ee,-2),$(ee,2)),ge(ee)):je},ze=function(ee){me(ee,1,o);let ne=Q(ee);return Ke(ee,1),ae(ee,ne,1),1},X={create:ze,isyieldable:function(ee){return J(ee,Z(ee)),1},resume:Ce,running:function(ee){return J(ee,ye(ee)),2},status:function(ee){let ne=H(ee);if(ee===ne)Le(ee,"running");else switch(Re(ne)){case E:Le(ee,"suspended");break;case d:{let je=new N;ie(ne,0,je)>0?Le(ee,"normal"):Se(ne)===0?Le(ee,"dead"):Le(ee,"suspended");break}default:Le(ee,"dead");break}return 1},wrap:function(ee){return ze(ee),Me(ee,ve,1),1},yield:function(ee){return R(ee,Se(ee))}},he=function(ee){return W(ee,X),1};return Za.luaopen_coroutine=he,Za}var La={},jl;function hr(){if(jl)return La;jl=1;const{LUA_MAXINTEGER:d}=wn(),{LUA_OPEQ:o,LUA_OPLT:m,LUA_TFUNCTION:E,LUA_TNIL:N,LUA_TTABLE:U,lua_call:$,lua_checkstack:ge,lua_compare:ie,lua_createtable:Se,lua_geti:q,lua_getmetatable:Z,lua_gettop:Q,lua_insert:Te,lua_isnil:J,lua_isnoneornil:Me,lua_isstring:Le,lua_pop:ye,lua_pushinteger:Ke,lua_pushnil:ut,lua_pushstring:Re,lua_pushvalue:Ue,lua_rawget:Pe,lua_setfield:ce,lua_seti:ae,lua_settop:R,lua_toboolean:Oe,lua_type:me}=kn(),{luaL_Buffer:W,luaL_addlstring:_e,luaL_addvalue:H,luaL_argcheck:D,luaL_buffinit:Ce,luaL_checkinteger:ve,luaL_checktype:ze,luaL_error:de,luaL_len:Ye,luaL_newlib:Je,luaL_opt:x,luaL_optinteger:Y,luaL_optlstring:X,luaL_pushresult:he,luaL_typename:ee}=Un(),ne=Ua(),{to_luastring:je}=In(),nt=1,at=2,ft=4,ct=nt|at,ht=function(y,V,Ae){return Re(y,V),Pe(y,-Ae)!==N},pt=function(y,V,Ae){if(me(y,V)!==U){let De=1;Z(y,V)&&(!(Ae&nt)||ht(y,je("__index",!0),++De))&&(!(Ae&at)||ht(y,je("__newindex",!0),++De))&&(!(Ae&ft)||ht(y,je("__len",!0),++De))?ye(y,De):ze(y,V,U)}},Et=function(y,V,Ae){return pt(y,V,Ae|ft),Ye(y,V)},bt=function(y,V,Ae){q(y,1,Ae),Le(y,-1)||de(y,je("invalid value (%s) at index %d in table for 'concat'"),ee(y,-1),Ae),H(V)},Ze=function(y){let V=Et(y,1,ct)+1,Ae;switch(Q(y)){case 2:Ae=V;break;case 3:{Ae=ve(y,2),D(y,1<=Ae&&Ae<=V,2,"position out of bounds");for(let De=V;De>Ae;De--)q(y,1,De-1),ae(y,1,De);break}default:return de(y,"wrong number of arguments to 'insert'")}return ae(y,1,Ae),0},St=function(y){let V=Et(y,1,ct),Ae=Y(y,2,V);for(Ae!==V&&D(y,1<=Ae&&Ae<=V+1,1,"position out of bounds"),q(y,1,Ae);Ae<V;Ae++)q(y,1,Ae+1),ae(y,1,Ae);return ut(y),ae(y,1,Ae),1},tt=function(y){let V=ve(y,2),Ae=ve(y,3),De=ve(y,4),qe=Me(y,5)?1:5;if(pt(y,1,nt),pt(y,qe,at),Ae>=V){D(y,V>0||Ae<d+V,3,"too many elements to move");let _=Ae-V+1;if(D(y,De<=d-_+1,4,"destination wrap around"),De>Ae||De<=V||qe!==1&&ie(y,1,qe,o)!==1)for(let te=0;te<_;te++)q(y,1,V+te),ae(y,qe,De+te);else for(let te=_-1;te>=0;te--)q(y,1,V+te),ae(y,qe,De+te)}return Ue(y,qe),1},gt=function(y){let V=Et(y,1,nt),Ae=X(y,2,""),De=Ae.length,qe=Y(y,3,1);V=Y(y,4,V);let _=new W;for(Ce(y,_);qe<V;qe++)bt(y,_,qe),_e(_,Ae,De);return qe===V&&bt(y,_,qe),he(_),1},we=function(y){let V=Q(y);Se(y,V,1),Te(y,1);for(let Ae=V;Ae>=1;Ae--)ae(y,1,Ae);return Ke(y,V),ce(y,1,je("n")),1},K=function(y){let V=Y(y,2,1),Ae=x(y,ve,3,Ye(y,1));if(V>Ae)return 0;let De=Ae-V;if(De>=Number.MAX_SAFE_INTEGER||!ge(y,++De))return de(y,je("too many results to unpack"));for(;V<Ae;V++)q(y,1,V);return q(y,1,Ae),De},I=function(){return Math.floor(Math.random()*4294967296)},O=100,A=function(y,V,Ae){ae(y,1,V),ae(y,1,Ae)},g=function(y,V,Ae){if(J(y,2))return ie(y,V,Ae,m);{Ue(y,2),Ue(y,V-1),Ue(y,Ae-2),$(y,2,1);let De=Oe(y,-1);return ye(y,1),De}},v=function(y,V,Ae){let De=V,qe=Ae-1;for(;;){for(;q(y,1,++De),g(y,-1,-2);)De==Ae-1&&de(y,je("invalid order function for sorting")),ye(y,1);for(;q(y,1,--qe),g(y,-3,-1);)qe<De&&de(y,je("invalid order function for sorting")),ye(y,1);if(qe<De)return ye(y,1),A(y,Ae-1,De),De;A(y,De,qe)}},B=function(y,V,Ae){let De=Math.floor((V-y)/4),qe=Ae%(De*2)+(y+De);return ne.lua_assert(y+De<=qe&&qe<=V-De),qe},ue=function(y,V,Ae,De){for(;V<Ae;){if(q(y,1,V),q(y,1,Ae),g(y,-1,-2)?A(y,V,Ae):ye(y,2),Ae-V==1)return;let qe;if(Ae-V<O||De===0?qe=Math.floor((V+Ae)/2):qe=B(V,Ae,De),q(y,1,qe),q(y,1,V),g(y,-2,-1)?A(y,qe,V):(ye(y,1),q(y,1,Ae),g(y,-1,-2)?A(y,qe,Ae):ye(y,2)),Ae-V==2)return;q(y,1,qe),Ue(y,-1),q(y,1,Ae-1),A(y,qe,Ae-1),qe=v(y,V,Ae);let _;qe-V<Ae-qe?(ue(y,V,qe-1,De),_=qe-V,V=qe+1):(ue(y,qe+1,Ae,De),_=Ae-qe,Ae=qe-1),(Ae-V)/128>_&&(De=I())}},st={concat:gt,insert:Ze,move:tt,pack:we,remove:St,sort:function(y){let V=Et(y,1,ct);return V>1&&(D(y,V<d,1,"array too big"),Me(y,2)||ze(y,2,E),R(y,2),ue(y,1,V,0)),0},unpack:K},Fe=function(y){return Je(y,st),1};return La.luaopen_table=Fe,La}var Ja={},zl;function pr(){if(zl)return Ja;zl=1;const{LUA_TNIL:d,LUA_TTABLE:o,lua_close:m,lua_createtable:E,lua_getfield:N,lua_isboolean:U,lua_isnoneornil:$,lua_pop:ge,lua_pushboolean:ie,lua_pushfstring:Se,lua_pushinteger:q,lua_pushliteral:Z,lua_pushnil:Q,lua_pushnumber:Te,lua_pushstring:J,lua_setfield:Me,lua_settop:Le,lua_toboolean:ye,lua_tointegerx:Ke}=kn(),{luaL_Buffer:ut,luaL_addchar:Re,luaL_addstring:Ue,luaL_argerror:Pe,luaL_buffinit:ce,luaL_checkinteger:ae,luaL_checkoption:R,luaL_checkstring:Oe,luaL_checktype:me,luaL_error:W,luaL_execresult:_e,luaL_fileresult:H,luaL_newlib:D,luaL_optinteger:Ce,luaL_optlstring:ve,luaL_optstring:ze,luaL_pushresult:de}=Un(),{luastring_eq:Ye,to_jsstring:Je,to_luastring:x}=In(),Y=x("aAbBcCdDeFhHIjklmMnpPrRStTuUwWxXyYzZ%"),X=function(I,O,A){q(I,A),Me(I,-2,x(O,!0))},he=function(I,O,A){X(I,"sec",A?O.getUTCSeconds():O.getSeconds()),X(I,"min",A?O.getUTCMinutes():O.getMinutes()),X(I,"hour",A?O.getUTCHours():O.getHours()),X(I,"day",A?O.getUTCDate():O.getDate()),X(I,"month",(A?O.getUTCMonth():O.getMonth())+1),X(I,"year",A?O.getUTCFullYear():O.getFullYear()),X(I,"wday",(A?O.getUTCDay():O.getDay())+1),X(I,"yday",Math.floor((O-new Date(O.getFullYear(),0,0))/864e5))},ee=Number.MAX_SAFE_INTEGER/2,ne=function(I,O,A,g){let v=N(I,-1,x(O,!0)),B=Ke(I,-1);if(B===!1){if(v!==d)return W(I,x("field '%s' is not an integer"),O);if(A<0)return W(I,x("field '%s' missing in date table"),O);B=A}else{if(!(-ee<=B&&B<=ee))return W(I,x("field '%s' is out-of-bound"),O);B-=g}return ge(I,1),B},je={days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(I=>x(I)),shortDays:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(I=>x(I)),months:["January","February","March","April","May","June","July","August","September","October","November","December"].map(I=>x(I)),shortMonths:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(I=>x(I)),AM:x("AM"),PM:x("PM"),am:x("am"),pm:x("pm"),formats:{c:x("%a %b %e %H:%M:%S %Y"),D:x("%m/%d/%y"),F:x("%Y-%m-%d"),R:x("%H:%M"),r:x("%I:%M:%S %p"),T:x("%H:%M:%S"),X:x("%T"),x:x("%D")}},nt=function(I,O){let A=I.getDay();O==="monday"&&(A===0?A=6:A--);let g=(I-new Date(I.getFullYear(),0,1))/864e5;return Math.floor((g+7-A)/7)},at=function(I,O,A){O<10&&Re(I,A),Ue(I,x(String(O)))},ft=function(I,O,A,g){let v=0;for(;v<A.length;)if(A[v]!==37)Re(O,A[v++]);else{v++;let B=ct(I,A,v);switch(A[v]){case 37:Re(O,37);break;case 65:Ue(O,je.days[g.getDay()]);break;case 66:Ue(O,je.months[g.getMonth()]);break;case 67:at(O,Math.floor(g.getFullYear()/100),48);break;case 68:ft(I,O,je.formats.D,g);break;case 70:ft(I,O,je.formats.F,g);break;case 72:at(O,g.getHours(),48);break;case 73:at(O,(g.getHours()+11)%12+1,48);break;case 77:at(O,g.getMinutes(),48);break;case 80:Ue(O,g.getHours()<12?je.am:je.pm);break;case 82:ft(I,O,je.formats.R,g);break;case 83:at(O,g.getSeconds(),48);break;case 84:ft(I,O,je.formats.T,g);break;case 85:at(O,nt(g,"sunday"),48);break;case 87:at(O,nt(g,"monday"),48);break;case 88:ft(I,O,je.formats.X,g);break;case 89:Ue(O,x(String(g.getFullYear())));break;case 90:{let ue=g.toString().match(/\(([\w\s]+)\)/);ue&&Ue(O,x(ue[1]));break}case 97:Ue(O,je.shortDays[g.getDay()]);break;case 98:case 104:Ue(O,je.shortMonths[g.getMonth()]);break;case 99:ft(I,O,je.formats.c,g);break;case 100:at(O,g.getDate(),48);break;case 101:at(O,g.getDate(),32);break;case 106:{let ue=Math.floor((g-new Date(g.getFullYear(),0,1))/864e5);ue<100&&(ue<10&&Re(O,48),Re(O,48)),Ue(O,x(String(ue)));break}case 107:at(O,g.getHours(),32);break;case 108:at(O,(g.getHours()+11)%12+1,32);break;case 109:at(O,g.getMonth()+1,48);break;case 110:Re(O,10);break;case 112:Ue(O,g.getHours()<12?je.AM:je.PM);break;case 114:ft(I,O,je.formats.r,g);break;case 115:Ue(O,x(String(Math.floor(g/1e3))));break;case 116:Re(O,8);break;case 117:{let ue=g.getDay();Ue(O,x(String(ue===0?7:ue)));break}case 119:Ue(O,x(String(g.getDay())));break;case 120:ft(I,O,je.formats.x,g);break;case 121:at(O,g.getFullYear()%100,48);break;case 122:{let ue=g.getTimezoneOffset();ue>0?Re(O,45):(ue=-ue,Re(O,43)),at(O,Math.floor(ue/60),48),at(O,ue%60,48);break}}v+=B}},ct=function(I,O,A){let g=Y,v=0,B=1;for(;v<g.length&&B<=O.length-A;v+=B)if(g[v]===124)B++;else if(Ye(O.subarray(A,A+B),g.subarray(v,v+B)))return B;Pe(I,1,Se(I,x("invalid conversion specifier '%%%s'"),O))},ht=function(I){let O=ve(I,1,"%c"),A=$(I,2)?new Date:new Date(Et(I,2)*1e3),g=!1,v=0;if(O[v]===33&&(g=!0,v++),O[v]===42&&O[v+1]===116)E(I,0,9),he(I,A,g);else{let B=new Uint8Array(4);B[0]=37;let ue=new ut;ce(I,ue),ft(I,ue,O,A),de(ue)}return 1},pt=function(I){let O;return $(I,1)?O=new Date:(me(I,1,o),Le(I,1),O=new Date(ne(I,"year",-1,0),ne(I,"month",-1,1),ne(I,"day",-1,0),ne(I,"hour",12,0),ne(I,"min",0,0),ne(I,"sec",0,0)),he(I,O)),q(I,Math.floor(O/1e3)),1},Et=function(I,O){return ae(I,O)},bt=function(I){let O=Et(I,1),A=Et(I,2);return Te(I,O-A),1},Ze=["all","collate","ctype","monetary","numeric","time"].map(I=>x(I)),St=x("C"),tt=x("POSIX"),we={date:ht,difftime:bt,setlocale:function(I){const O=ze(I,1,null);return R(I,2,"all",Ze),J(I,O===null||O.length==0||Ye(O,St)||Ye(O,tt)?St:null),1},time:pt};we.clock=function(I){return Te(I,performance.now()/1e3),1};const K=function(I){return D(I,we),1};return Ja.luaopen_os=K,Ja}var $a={},Qa={},ql;function fs(){return ql||(ql=1,(function(d){(function(){var o={not_type:/[^T]/,not_primitive:/[^v]/,number:/[diefg]/,numeric_arg:/[bcdiefguxX]/,json:/[j]/,text:/^[^\x25]+/,modulo:/^\x25{2}/,placeholder:/^\x25(?:([1-9]\d*)\$|\(([^)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,key:/^([a-z_][a-z_\d]*)/i,key_access:/^\.([a-z_][a-z_\d]*)/i,index_access:/^\[(\d+)\]/,sign:/^[+-]/};function m(ge){return N($(ge),arguments)}function E(ge,ie){return m.apply(null,[ge].concat(ie||[]))}function N(ge,ie){var Se=1,q=ge.length,Z,Q="",Te,J,Me,Le,ye,Ke,ut,Re;for(Te=0;Te<q;Te++)if(typeof ge[Te]=="string")Q+=ge[Te];else if(typeof ge[Te]=="object"){if(Me=ge[Te],Me.keys)for(Z=ie[Se],J=0;J<Me.keys.length;J++){if(Z==null)throw new Error(m('[sprintf] Cannot access property "%s" of undefined value "%s"',Me.keys[J],Me.keys[J-1]));Z=Z[Me.keys[J]]}else Me.param_no?Z=ie[Me.param_no]:Z=ie[Se++];if(o.not_type.test(Me.type)&&o.not_primitive.test(Me.type)&&Z instanceof Function&&(Z=Z()),o.numeric_arg.test(Me.type)&&typeof Z!="number"&&isNaN(Z))throw new TypeError(m("[sprintf] expecting number but found %T",Z));switch(o.number.test(Me.type)&&(ut=Z>=0),Me.type){case"b":Z=parseInt(Z,10).toString(2);break;case"c":Z=String.fromCharCode(parseInt(Z,10));break;case"d":case"i":Z=parseInt(Z,10);break;case"j":Z=JSON.stringify(Z,null,Me.width?parseInt(Me.width):0);break;case"e":Z=Me.precision?parseFloat(Z).toExponential(Me.precision):parseFloat(Z).toExponential();break;case"f":Z=Me.precision?parseFloat(Z).toFixed(Me.precision):parseFloat(Z);break;case"g":Z=Me.precision?String(Number(Z.toPrecision(Me.precision))):parseFloat(Z);break;case"o":Z=(parseInt(Z,10)>>>0).toString(8);break;case"s":Z=String(Z),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"t":Z=String(!!Z),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"T":Z=Object.prototype.toString.call(Z).slice(8,-1).toLowerCase(),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"u":Z=parseInt(Z,10)>>>0;break;case"v":Z=Z.valueOf(),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"x":Z=(parseInt(Z,10)>>>0).toString(16);break;case"X":Z=(parseInt(Z,10)>>>0).toString(16).toUpperCase();break}o.json.test(Me.type)?Q+=Z:(o.number.test(Me.type)&&(!ut||Me.sign)?(Re=ut?"+":"-",Z=Z.toString().replace(o.sign,"")):Re="",ye=Me.pad_char?Me.pad_char==="0"?"0":Me.pad_char.charAt(1):" ",Ke=Me.width-(Re+Z).length,Le=Me.width&&Ke>0?ye.repeat(Ke):"",Q+=Me.align?Re+Z+Le:ye==="0"?Re+Le+Z:Le+Re+Z)}return Q}var U=Object.create(null);function $(ge){if(U[ge])return U[ge];for(var ie=ge,Se,q=[],Z=0;ie;){if((Se=o.text.exec(ie))!==null)q.push(Se[0]);else if((Se=o.modulo.exec(ie))!==null)q.push("%");else if((Se=o.placeholder.exec(ie))!==null){if(Se[2]){Z|=1;var Q=[],Te=Se[2],J=[];if((J=o.key.exec(Te))!==null)for(Q.push(J[1]);(Te=Te.substring(J[0].length))!=="";)if((J=o.key_access.exec(Te))!==null)Q.push(J[1]);else if((J=o.index_access.exec(Te))!==null)Q.push(J[1]);else throw new SyntaxError("[sprintf] failed to parse named argument key");else throw new SyntaxError("[sprintf] failed to parse named argument key");Se[2]=Q}else Z|=2;if(Z===3)throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported");q.push({placeholder:Se[0],param_no:Se[1],keys:Se[2],sign:Se[3],pad_char:Se[4],align:Se[5],width:Se[6],precision:Se[7],type:Se[8]})}else throw new SyntaxError("[sprintf] unexpected placeholder");ie=ie.substring(Se[0].length)}return U[ge]=q}d.sprintf=m,d.vsprintf=E,typeof window<"u"&&(window.sprintf=m,window.vsprintf=E)})()})(Qa)),Qa}var Wl;function gr(){if(Wl)return $a;Wl=1;const{sprintf:d}=fs(),{LUA_INTEGER_FMT:o,LUA_INTEGER_FRMLEN:m,LUA_MININTEGER:E,LUA_NUMBER_FMT:N,LUA_NUMBER_FRMLEN:U,frexp:$,lua_getlocaledecpoint:ge}=wn(),{LUA_TBOOLEAN:ie,LUA_TFUNCTION:Se,LUA_TNIL:q,LUA_TNUMBER:Z,LUA_TSTRING:Q,LUA_TTABLE:Te,lua_call:J,lua_createtable:Me,lua_dump:Le,lua_gettable:ye,lua_gettop:Ke,lua_isinteger:ut,lua_isstring:Re,lua_pop:Ue,lua_pushcclosure:Pe,lua_pushinteger:ce,lua_pushlightuserdata:ae,lua_pushliteral:R,lua_pushlstring:Oe,lua_pushnil:me,lua_pushnumber:W,lua_pushstring:_e,lua_pushvalue:H,lua_remove:D,lua_setfield:Ce,lua_setmetatable:ve,lua_settop:ze,lua_toboolean:de,lua_tointeger:Ye,lua_tonumber:Je,lua_tostring:x,lua_touserdata:Y,lua_type:X,lua_upvalueindex:he}=kn(),{luaL_Buffer:ee,luaL_addchar:ne,luaL_addlstring:je,luaL_addsize:nt,luaL_addstring:at,luaL_addvalue:ft,luaL_argcheck:ct,luaL_argerror:ht,luaL_buffinit:pt,luaL_buffinitsize:Et,luaL_checkinteger:bt,luaL_checknumber:Ze,luaL_checkstack:St,luaL_checkstring:tt,luaL_checktype:gt,luaL_error:we,luaL_newlib:K,luaL_optinteger:I,luaL_optstring:O,luaL_prepbuffsize:A,luaL_pushresult:g,luaL_pushresultsize:v,luaL_tolstring:B,luaL_typename:ue}=Un(),ot=Ua(),{luastring_eq:st,luastring_indexOf:Fe,to_jsstring:y,to_luastring:V}=In(),De="%".charCodeAt(0),qe=32,_=2147483647,te=function(t){let r=Fe(t,0);return r>-1?r:t.length},P=function(t,r){return t>=0?t:0-t>r?0:r+t+1},se=function(t){let r=tt(t,1),c=r.length,k=P(bt(t,2),c),M=P(I(t,3,-1),c);return k<1&&(k=1),M>c&&(M=c),k<=M?_e(t,r.subarray(k-1,k-1+(M-k+1))):R(t,""),1},Ne=function(t){return ce(t,tt(t,1).length),1},it=function(t){let r=Ke(t),c=new ee,k=Et(t,c,r);for(let M=1;M<=r;M++){let z=bt(t,M);ct(t,z>=0&&z<=255,"value out of range"),k[M-1]=z}return v(c,r),1},Qe=function(t,r,c,k){return je(k,r,c),0},Rt=function(t){let r=new ee,c=de(t,2);return gt(t,1,Se),ze(t,1),pt(t,r),Le(t,Qe,r,c)!==0?we(t,V("unable to dump given function")):(g(r),1)},kt=U.length+1,yt=1,vt=function(t){if(Object.is(t,1/0))return V("inf");if(Object.is(t,-1/0))return V("-inf");if(Number.isNaN(t))return V("nan");if(t===0){let r=d(N+"x0p+0",t);return Object.is(t,-0)&&(r="-"+r),V(r)}else{let r="",c=$(t),k=c[0],M=c[1];return k<0&&(r+="-",k=-k),r+="0x",r+=(k*(1<<yt)).toString(16),M-=yt,r+=d("p%+d",M),V(r)}},Wt=function(t,r,c){let k=vt(c);if(r[kt]===65)for(let M=0;M<k.length;M++){let z=k[M];z>=97&&(k[M]=z&223)}else r[kt]!==97&&we(t,V("modifiers for format '%%a'/'%%A' not implemented"));return k},Gt=V("-+ #0"),Nt=t=>97<=t&&t<=122||65<=t&&t<=90,Dt=t=>48<=t&&t<=57,Vt=t=>0<=t&&t<=31||t===127,Ht=t=>33<=t&&t<=126,Lt=t=>97<=t&&t<=122,Kt=t=>65<=t&&t<=90,Xt=t=>97<=t&&t<=122||65<=t&&t<=90||48<=t&&t<=57,F=t=>Ht(t)&&!Xt(t),T=t=>t===32||t>=9&&t<=13,Ee=t=>48<=t&&t<=57||65<=t&&t<=70||97<=t&&t<=102,We=function(t,r,c){ne(t,34);let k=0;for(;c--;){if(r[k]===34||r[k]===92||r[k]===10)ne(t,92),ne(t,r[k]);else if(Vt(r[k])){let M=""+r[k];Dt(r[k+1])&&(M=("000"+M).slice(-3)),at(t,V("\\"+M))}else ne(t,r[k]);k++}ne(t,34)},b=function(t){if(Fe(t,46)<0){let r=ge(),c=Fe(t,r);c&&(t[c]=46)}},fe=function(t,r,c){switch(X(t,c)){case Q:{let k=x(t,c);We(r,k,k.length);break}case Z:{let k;if(ut(t,c)){let M=Ye(t,c),z=M===E?"0x%"+m+"x":o;k=V(d(z,M))}else{let M=Je(t,c);k=Wt(t,V(`%${m}a`),M),b(k)}at(r,k);break}case q:case ie:{B(t,c),ft(r);break}default:ht(t,c,V("value has no literal form"))}},oe=function(t,r,c,k){let M=c;for(;r[M]!==0&&Fe(Gt,r[M])>=0;)M++;M-c>=Gt.length&&we(t,V("invalid format (repeated flags)")),Dt(r[M])&&M++,Dt(r[M])&&M++,r[M]===46&&(M++,Dt(r[M])&&M++,Dt(r[M])&&M++),Dt(r[M])&&we(t,V("invalid format (width or precision too long)")),k[0]=37;for(let z=0;z<M-c+1;z++)k[z+1]=r[c+z];return M},He=function(t,r){let c=t.length,k=r.length,M=t[c-1];for(let z=0;z<k;z++)t[z+c-1]=r[z];t[c+k-1]=M},At=function(t){let r=Ke(t),c=1,k=tt(t,c),M=0,z=new ee;for(pt(t,z);M<k.length;)if(k[M]!==De)ne(z,k[M++]);else if(k[++M]===De)ne(z,k[M++]);else{let lt=[];switch(++c>r&&ht(t,c,V("no value")),M=oe(t,k,M,lt),String.fromCharCode(k[M++])){case"c":{ne(z,bt(t,c));break}case"d":case"i":case"o":case"u":case"x":case"X":{let rt=bt(t,c);He(lt,V(m,!0)),at(z,V(d(String.fromCharCode(...lt),rt)));break}case"a":case"A":{He(lt,V(m,!0)),at(z,Wt(t,lt,Ze(t,c)));break}case"e":case"E":case"f":case"g":case"G":{let rt=Ze(t,c);He(lt,V(m,!0)),at(z,V(d(String.fromCharCode(...lt),rt)));break}case"q":{fe(t,z,c);break}case"s":{let rt=B(t,c);lt.length<=2||lt[2]===0?ft(z):(ct(t,rt.length===te(rt),c,"string contains zeros"),Fe(lt,46)<0&&rt.length>=100?ft(z):(at(z,V(d(String.fromCharCode(...lt),y(rt)))),Ue(t,1)));break}default:return we(t,V("invalid option '%%%c' to 'format'"),k[M-1])}}return g(z),1},l=0,n=16,u=4,s=8,C=(1<<s)-1,re=8;class Ve{constructor(r){this.L=r,this.islittle=!0,this.maxalign=1}}const dt=0,Pt=1,Bt=2,Ft=3,sn=4,jt=5,f=6,G=7,be=8,pe=Dt,Xe=function(t,r){if(t.off>=t.s.length||!pe(t.s[t.off]))return r;{let c=0;do c=c*10+(t.s[t.off++]-48);while(t.off<t.s.length&&pe(t.s[t.off])&&c<=(_-9)/10);return c}},ke=function(t,r,c){let k=Xe(r,c);return(k>n||k<=0)&&we(t.L,V("integral size (%d) out of limits [1,%d]"),k,n),k},Ie=function(t,r){let c={opt:r.s[r.off++],size:0};switch(c.opt){case 98:return c.size=1,c.opt=dt,c;case 66:return c.size=1,c.opt=Pt,c;case 104:return c.size=2,c.opt=dt,c;case 72:return c.size=2,c.opt=Pt,c;case 108:return c.size=4,c.opt=dt,c;case 76:return c.size=4,c.opt=Pt,c;case 106:return c.size=4,c.opt=dt,c;case 74:return c.size=4,c.opt=Pt,c;case 84:return c.size=4,c.opt=Pt,c;case 102:return c.size=4,c.opt=Bt,c;case 100:return c.size=8,c.opt=Bt,c;case 110:return c.size=8,c.opt=Bt,c;case 105:return c.size=ke(t,r,4),c.opt=dt,c;case 73:return c.size=ke(t,r,4),c.opt=Pt,c;case 115:return c.size=ke(t,r,4),c.opt=sn,c;case 99:return c.size=Xe(r,-1),c.size===-1&&we(t.L,V("missing size for format option 'c'")),c.opt=Ft,c;case 122:return c.opt=jt,c;case 120:return c.size=1,c.opt=f,c;case 88:return c.opt=G,c;case 32:break;case 60:t.islittle=!0;break;case 62:t.islittle=!1;break;case 61:t.islittle=!0;break;case 33:t.maxalign=ke(t,r,re);break;default:we(t.L,V("invalid format option '%c'"),c.opt)}return c.opt=be,c},Mt=function(t,r,c){let k={opt:NaN,size:NaN,ntoalign:NaN},M=Ie(t,c);k.size=M.size,k.opt=M.opt;let z=k.size;if(k.opt===G)if(c.off>=c.s.length||c.s[c.off]===0)ht(t.L,1,V("invalid next option for option 'X'"));else{let lt=Ie(t,c);z=lt.size,lt=lt.opt,(lt===Ft||z===0)&&ht(t.L,1,V("invalid next option for option 'X'"))}return z<=1||k.opt===Ft?k.ntoalign=0:(z>t.maxalign&&(z=t.maxalign),(z&z-1)!==0&&ht(t.L,1,V("format asks for alignment not power of 2")),k.ntoalign=z-(r&z-1)&z-1),k},le=function(t,r,c,k,M){let z=A(t,k);z[c?0:k-1]=r&C;for(let lt=1;lt<k;lt++)r>>=s,z[c?lt:k-1-lt]=r&C;if(M&&k>u)for(let lt=u;lt<k;lt++)z[c?lt:k-1-lt]=C;nt(t,k)},Be=function(t){let r=new ee,c=new Ve(t),k={s:tt(t,1),off:0},M=1,z=0;for(me(t),pt(t,r);k.off<k.s.length;){let lt=Mt(c,z,k),rt=lt.opt,Ct=lt.size,zt=lt.ntoalign;for(z+=zt+Ct;zt-- >0;)ne(r,l);switch(M++,rt){case dt:{let It=bt(t,M);if(Ct<u){let Ut=1<<Ct*8-1;ct(t,-Ut<=It&&It<Ut,M,"integer overflow")}le(r,It,c.islittle,Ct,It<0);break}case Pt:{let It=bt(t,M);Ct<u&&ct(t,It>>>0<1<<Ct*s,M,"unsigned overflow"),le(r,It>>>0,c.islittle,Ct,!1);break}case Bt:{let It=A(r,Ct),Ut=Ze(t,M),ta=new DataView(It.buffer,It.byteOffset,It.byteLength);Ct===4?ta.setFloat32(0,Ut,c.islittle):ta.setFloat64(0,Ut,c.islittle),nt(r,Ct);break}case Ft:{let It=tt(t,M),Ut=It.length;for(ct(t,Ut<=Ct,M,"string longer than given size"),je(r,It,Ut);Ut++<Ct;)ne(r,l);break}case sn:{let It=tt(t,M),Ut=It.length;ct(t,Ct>=4||Ut<1<<Ct*s,M,"string length does not fit in given size"),le(r,Ut,c.islittle,Ct,0),je(r,It,Ut),z+=Ut;break}case jt:{let It=tt(t,M),Ut=It.length;ct(t,Fe(It,0)<0,M,"strings contains zeros"),je(r,It,Ut),ne(r,0),z+=Ut+1;break}case f:ne(r,l);case G:case be:M--;break}}return g(r),1},$e=function(t){let r=tt(t,1),c=r.length,k=new Uint8Array(c);for(let M=0;M<c;M++)k[M]=r[c-1-M];return _e(t,k),1},Ot=function(t){let r=tt(t,1),c=r.length,k=new Uint8Array(c);for(let M=0;M<c;M++){let z=r[M];Kt(z)&&(z=z|32),k[M]=z}return _e(t,k),1},nn=function(t){let r=tt(t,1),c=r.length,k=new Uint8Array(c);for(let M=0;M<c;M++){let z=r[M];Lt(z)&&(z=z&223),k[M]=z}return _e(t,k),1},on=function(t){let r=tt(t,1),c=r.length,k=bt(t,2),M=O(t,3,""),z=M.length;if(k<=0)R(t,"");else{if(c+z<c||c+z>_/k)return we(t,V("resulting string too large"));{let lt=k*c+(k-1)*z,rt=new ee,Ct=Et(t,rt,lt),zt=0;for(;k-- >1;)Ct.set(r,zt),zt+=c,z>0&&(Ct.set(M,zt),zt+=z);Ct.set(r,zt),v(rt,lt)}}return 1},gn=function(t){let r=tt(t,1),c=r.length,k=P(I(t,2,1),c),M=P(I(t,3,k),c);if(k<1&&(k=1),M>c&&(M=c),k>M)return 0;if(M-k>=Number.MAX_SAFE_INTEGER)return we(t,"string slice too long");let z=M-k+1;St(t,z,"string slice too long");for(let lt=0;lt<z;lt++)ce(t,r[k+lt-1]);return z},Sn=function(t){let r=new Ve(t),c={s:tt(t,1),off:0},k=0;for(;c.off<c.s.length;){let M=Mt(r,k,c),z=M.opt,lt=M.size,rt=M.ntoalign;switch(lt+=rt,ct(t,k<=_-lt,1,"format result too large"),k+=lt,z){case sn:case jt:ht(t,1,"variable-length format")}}return ce(t,k),1},un=function(t,r,c,k,M){let z=0,lt=k<=u?k:u;for(let rt=lt-1;rt>=0;rt--)z<<=s,z|=r[c?rt:k-1-rt];if(k<u){if(M){let rt=1<<k*s-1;z=(z^rt)-rt}}else if(k>u){let rt=!M||z>=0?0:C;for(let Ct=lt;Ct<k;Ct++)r[c?Ct:k-1-Ct]!==rt&&we(t,V("%d-byte integer does not fit into Lua Integer"),k)}return z},Fn=function(t,r,c,k){ot.lua_assert(r.length>=k);let M=new DataView(new ArrayBuffer(k));for(let z=0;z<k;z++)M.setUint8(z,r[z]);return k==4?M.getFloat32(0,c):M.getFloat64(0,c)},Zn=function(t){let r=new Ve(t),c={s:tt(t,1),off:0},k=tt(t,2),M=k.length,z=P(I(t,3,1),M)-1,lt=0;for(ct(t,z<=M&&z>=0,3,"initial position out of string");c.off<c.s.length;){let rt=Mt(r,z,c),Ct=rt.opt,zt=rt.size,It=rt.ntoalign;switch(z+It+zt>M&&ht(t,2,V("data string too short")),z+=It,St(t,2,"too many results"),lt++,Ct){case dt:case Pt:{let Ut=un(t,k.subarray(z),r.islittle,zt,Ct===dt);ce(t,Ut);break}case Bt:{let Ut=Fn(t,k.subarray(z),r.islittle,zt);W(t,Ut);break}case Ft:{_e(t,k.subarray(z,z+zt));break}case sn:{let Ut=un(t,k.subarray(z),r.islittle,zt,0);ct(t,z+Ut+zt<=M,2,"data string too short"),_e(t,k.subarray(z+zt,z+zt+Ut)),z+=Ut;break}case jt:{let Ut=Fe(k,0,z);Ut===-1&&(Ut=k.length-z),_e(t,k.subarray(z,Ut)),z=Ut+1;break}case G:case f:case be:lt--;break}z+=zt}return ce(t,z+1),lt+1},On=-1,Gn=-2,Vn=200,oa=V("^$*+?.([%-");class An{constructor(r){this.src=null,this.src_init=null,this.src_end=null,this.p=null,this.p_end=null,this.L=r,this.matchdepth=NaN,this.level=NaN,this.capture=[]}}const Ln=function(t,r){return r=r-49,r<0||r>=t.level||t.capture[r].len===On?we(t.L,V("invalid capture index %%%d"),r+1):r},ga=function(t){let r=t.level;for(r--;r>=0;r--)if(t.capture[r].len===On)return r;return we(t.L,V("invalid pattern capture"))},fn=function(t,r){switch(t.p[r++]){case De:return r===t.p_end&&we(t.L,V("malformed pattern (ends with '%%')")),r+1;case 91:{t.p[r]===94&&r++;do r===t.p_end&&we(t.L,V("malformed pattern (missing ']')")),t.p[r++]===De&&r<t.p_end&&r++;while(t.p[r]!==93);return r+1}default:return r}},ia=function(t,r){switch(r){case 97:return Nt(t);case 65:return!Nt(t);case 99:return Vt(t);case 67:return!Vt(t);case 100:return Dt(t);case 68:return!Dt(t);case 103:return Ht(t);case 71:return!Ht(t);case 108:return Lt(t);case 76:return!Lt(t);case 112:return F(t);case 80:return!F(t);case 115:return T(t);case 83:return!T(t);case 117:return Kt(t);case 85:return!Kt(t);case 119:return Xt(t);case 87:return!Xt(t);case 120:return Ee(t);case 88:return!Ee(t);case 122:return t===0;case 90:return t!==0;default:return r===t}},Jn=function(t,r,c,k){let M=!0;for(t.p[c+1]===94&&(M=!1,c++);++c<k;)if(t.p[c]===De){if(c++,ia(r,t.p[c]))return M}else if(t.p[c+1]===45&&c+2<k){if(c+=2,t.p[c-2]<=r&&r<=t.p[c])return M}else if(t.p[c]===r)return M;return!M},$n=function(t,r,c,k){if(r>=t.src_end)return!1;{let M=t.src[r];switch(t.p[c]){case 46:return!0;case De:return ia(M,t.p[c+1]);case 91:return Jn(t,M,c,k-1);default:return t.p[c]===M}}},Aa=function(t,r,c){if(c>=t.p_end-1&&we(t.L,V("malformed pattern (missing arguments to '%%b'")),t.src[r]!==t.p[c])return null;{let k=t.p[c],M=t.p[c+1],z=1;for(;++r<t.src_end;)if(t.src[r]===M){if(--z===0)return r+1}else t.src[r]===k&&z++}return null},ua=function(t,r,c,k){let M=0;for(;$n(t,r+M,c,k);)M++;for(;M>=0;){let z=dn(t,r+M,k+1);if(z)return z;M--}return null},_n=function(t,r,c,k){for(;;){let M=dn(t,r,k+1);if(M!==null)return M;if($n(t,r,c,k))r++;else return null}},Hn=function(t,r,c,k){let M=t.level;M>=qe&&we(t.L,V("too many captures")),t.capture[M]=t.capture[M]?t.capture[M]:{},t.capture[M].init=r,t.capture[M].len=k,t.level=M+1;let z;return(z=dn(t,r,c))===null&&t.level--,z},Nn=function(t,r,c){let k=ga(t);t.capture[k].len=r-t.capture[k].init;let M;return(M=dn(t,r,c))===null&&(t.capture[k].len=On),M},Cn=function(t,r,c,k,M){return st(t.subarray(r,r+M),c.subarray(k,k+M))},Qn=function(t,r,c){c=Ln(t,c);let k=t.capture[c].len;return t.src_end-r>=k&&Cn(t.src,t.capture[c].init,t.src,r,k)?r+k:null},dn=function(t,r,c){let k=!1,M=!0;for(t.matchdepth--===0&&we(t.L,V("pattern too complex"));M||k;)if(M=!1,c!==t.p_end)switch(k?void 0:t.p[c]){case 40:{t.p[c+1]===41?r=Hn(t,r,c+2,Gn):r=Hn(t,r,c+1,On);break}case 41:{r=Nn(t,r,c+1);break}case 36:{if(c+1!==t.p_end){k=!0;break}r=t.src.length-r===0?r:null;break}case De:{switch(t.p[c+1]){case 98:{r=Aa(t,r,c+2),r!==null&&(c+=4,M=!0);break}case 102:{c+=2,t.p[c]!==91&&we(t.L,V("missing '[' after '%%f' in pattern"));let z=fn(t,c),lt=r===t.src_init?0:t.src[r-1];if(!Jn(t,lt,c,z-1)&&Jn(t,r===t.src_end?0:t.src[r],c,z-1)){c=z,M=!0;break}r=null;break}case 48:case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:{r=Qn(t,r,t.p[c+1]),r!==null&&(c+=2,M=!0);break}default:k=!0}break}default:{k=!1;let z=fn(t,c);if($n(t,r,c,z))switch(t.p[z]){case 63:{let lt;(lt=dn(t,r+1,z+1))!==null?r=lt:(c=z+1,M=!0);break}case 43:r++;case 42:r=ua(t,r,c,z);break;case 45:r=_n(t,r,c,z);break;default:r++,c=z,M=!0}else if(t.p[z]===42||t.p[z]===63||t.p[z]===45){c=z+1,M=!0;break}else r=null;break}}return t.matchdepth++,r},Pn=function(t,r,c,k){if(r>=t.level)r===0?Oe(t.L,t.src.subarray(c,k),k-c):we(t.L,V("invalid capture index %%%d"),r+1);else{let M=t.capture[r].len;M===On&&we(t.L,V("unfinished capture")),M===Gn?ce(t.L,t.capture[r].init-t.src_init+1):Oe(t.L,t.src.subarray(t.capture[r].init),M)}},xn=function(t,r,c){let k=t.level===0&&r!=null?1:t.level;St(t.L,k,"too many captures");for(let M=0;M<k;M++)Pn(t,M,r,c);return k},ma=function(t,r){for(let c=0;c<r;c++)if(Fe(oa,t[c])!==-1)return!1;return!0},Dn=function(t,r,c,k,M,z){t.L=r,t.matchdepth=Vn,t.src=c,t.src_init=0,t.src_end=k,t.p=M,t.p_end=z},mn=function(t){t.level=0,ot.lua_assert(t.matchdepth===Vn)},ca=function(t,r,c){var k=c>>>0,M=r.length;if(M===0)return k;for(;(k=t.indexOf(r[0],k))!==-1;k++)if(st(t.subarray(k,k+M),r))return k;return-1},ea=function(t,r){let c=tt(t,1),k=tt(t,2),M=c.length,z=k.length,lt=P(I(t,3,1),M);if(lt<1)lt=1;else if(lt>M+1)return me(t),1;if(r&&(de(t,4)||ma(k,z))){let rt=ca(c.subarray(lt-1),k,0);if(rt>-1)return ce(t,lt+rt),ce(t,lt+rt+z-1),2}else{let rt=new An(t),Ct=lt-1,zt=k[0]===94;zt&&(k=k.subarray(1),z--),Dn(rt,t,c,M,k,z);do{let It;if(mn(rt),(It=dn(rt,Ct,0))!==null)return r?(ce(t,Ct+1),ce(t,It),xn(rt,null,0)+2):xn(rt,Ct,It)}while(Ct++<rt.src_end&&!zt)}return me(t),1},ba=function(t){return ea(t,1)},Bn=function(t){return ea(t,0)};class bn{constructor(){this.src=NaN,this.p=NaN,this.lastmatch=NaN,this.ms=new An}}const fa=function(t){let r=Y(t,he(3));r.ms.L=t;for(let c=r.src;c<=r.ms.src_end;c++){mn(r.ms);let k;if((k=dn(r.ms,c,r.p))!==null&&k!==r.lastmatch)return r.src=r.lastmatch=k,xn(r.ms,c,k)}return 0},Ta=function(t){let r=tt(t,1),c=tt(t,2),k=r.length,M=c.length;ze(t,2);let z=new bn;return ae(t,z),Dn(z.ms,t,r,k,c,M),z.src=0,z.p=0,z.lastmatch=null,Pe(t,fa,3),1},Xn=function(t,r,c,k){let M=t.L,z=x(M,3),lt=z.length;for(let rt=0;rt<lt;rt++)z[rt]!==De?ne(r,z[rt]):(rt++,Dt(z[rt])?z[rt]===48?je(r,t.src.subarray(c,k),k-c):(Pn(t,z[rt]-49,c,k),B(M,-1),D(M,-2),ft(r)):(z[rt]!==De&&we(M,V("invalid use of '%c' in replacement string"),De),ne(r,z[rt])))},Ea=function(t,r,c,k,M){let z=t.L;switch(M){case Se:{H(z,3);let lt=xn(t,c,k);J(z,lt,1);break}case Te:{Pn(t,0,c,k),ye(z,3);break}default:{Xn(t,r,c,k);return}}de(z,-1)?Re(z,-1)||we(z,V("invalid replacement value (a %s)"),ue(z,-1)):(Ue(z,1),Oe(z,t.src.subarray(c,k),k-c)),ft(r)},w={byte:gn,char:it,dump:Rt,find:ba,format:At,gmatch:Ta,gsub:function(t){let r=tt(t,1),c=r.length,k=tt(t,2),M=k.length,z=null,lt=X(t,3),rt=I(t,4,c+1),Ct=k[0]===94,zt=0,It=new An(t),Ut=new ee;for(ct(t,lt===Z||lt===Q||lt===Se||lt===Te,3,"string/function/table expected"),pt(t,Ut),Ct&&(k=k.subarray(1),M--),Dn(It,t,r,c,k,M),r=0,k=0;zt<rt;){let ta;if(mn(It),(ta=dn(It,r,k))!==null&&ta!==z)zt++,Ea(It,Ut,r,ta,lt),r=z=ta;else if(r<It.src_end)ne(Ut,It.src[r++]);else break;if(Ct)break}return je(Ut,It.src.subarray(r,It.src_end),It.src_end-r),g(Ut),ce(t,zt),2},len:Ne,lower:Ot,match:Bn,pack:Be,packsize:Sn,rep:on,reverse:$e,sub:se,unpack:Zn,upper:nn},e=function(t){Me(t,0,1),R(t,""),H(t,-2),ve(t,-2),Ue(t,1),H(t,-2),Ce(t,-2,V("__index",!0)),Ue(t,1)},i=function(t){return K(t,w),e(t),1};return $a.luaopen_string=i,$a}var el={},Yl;function Ar(){if(Yl)return el;Yl=1;const{lua_gettop:d,lua_pushcfunction:o,lua_pushfstring:m,lua_pushinteger:E,lua_pushnil:N,lua_pushstring:U,lua_pushvalue:$,lua_setfield:ge,lua_tointeger:ie}=kn(),{luaL_Buffer:Se,luaL_addvalue:q,luaL_argcheck:Z,luaL_buffinit:Q,luaL_checkinteger:Te,luaL_checkstack:J,luaL_checkstring:Me,luaL_error:Le,luaL_newlib:ye,luaL_optinteger:Ke,luaL_pushresult:ut}=Un(),{luastring_of:Re,to_luastring:Ue}=In(),Pe=1114111,ce=function(x){return(x&192)===128},ae=function(x,Y){return x>=0?x:0-x>Y?0:Y+x+1},R=[255,127,2047,65535],Oe=function(x,Y){let X=x[Y],he=0;if(X<128)he=X;else{let ee=0;for(;X&64;){let ne=x[Y+ ++ee];if((ne&192)!==128)return null;he=he<<6|ne&63,X<<=1}if(he|=(X&127)<<ee*5,ee>3||he>Pe||he<=R[ee])return null;Y+=ee}return{code:he,pos:Y+1}},me=function(x){let Y=0,X=Me(x,1),he=X.length,ee=ae(Ke(x,2,1),he),ne=ae(Ke(x,3,-1),he);for(Z(x,1<=ee&&--ee<=he,2,"initial position out of string"),Z(x,--ne<he,3,"final position out of string");ee<=ne;){let je=Oe(X,ee);if(je===null)return N(x),E(x,ee+1),2;ee=je.pos,Y++}return E(x,Y),1},W=Ue("%U"),_e=function(x,Y){let X=Te(x,Y);Z(x,0<=X&&X<=Pe,Y,"value out of range"),m(x,W,X)},H=function(x){let Y=d(x);if(Y===1)_e(x,1);else{let X=new Se;Q(x,X);for(let he=1;he<=Y;he++)_e(x,he),q(X);ut(X)}return 1},D=function(x){let Y=Me(x,1),X=Te(x,2),he=X>=0?1:Y.length+1;if(he=ae(Ke(x,3,he),Y.length),Z(x,1<=he&&--he<=Y.length,3,"position out of range"),X===0)for(;he>0&&ce(Y[he]);)he--;else if(ce(Y[he])&&Le(x,"initial position is a continuation byte"),X<0)for(;X<0&&he>0;){do he--;while(he>0&&ce(Y[he]));X++}else for(X--;X>0&&he<Y.length;){do he++;while(ce(Y[he]));X--}return X===0?E(x,he+1):N(x),1},Ce=function(x){let Y=Me(x,1),X=ae(Ke(x,2,1),Y.length),he=ae(Ke(x,3,X),Y.length);if(Z(x,X>=1,2,"out of range"),Z(x,he<=Y.length,3,"out of range"),X>he)return 0;if(he-X>=Number.MAX_SAFE_INTEGER)return Le(x,"string slice too long");let ee=he-X+1;for(J(x,ee,"string slice too long"),ee=0,X-=1;X<he;){let ne=Oe(Y,X);if(ne===null)return Le(x,"invalid UTF-8 code");E(x,ne.code),X=ne.pos,ee++}return ee},ve=function(x){let Y=Me(x,1),X=Y.length,he=ie(x,2)-1;if(he<0)he=0;else if(he<X)for(he++;ce(Y[he]);)he++;if(he>=X)return 0;{let ee=Oe(Y,he);return ee===null||ce(Y[ee.pos])?Le(x,Ue("invalid UTF-8 code")):(E(x,he+1),E(x,ee.code),2)}},de={char:H,codepoint:Ce,codes:function(x){return Me(x,1),o(x,ve),$(x,1),E(x,0),3},len:me,offset:D},Ye=Re(91,0,45,127,194,45,244,93,91,128,45,191,93,42),Je=function(x){return ye(x,de),U(x,Ye),ge(x,-2,Ue("charpattern",!0)),1};return el.luaopen_utf8=Je,el}var tl={},Zl;function mr(){if(Zl)return tl;Zl=1;const{LUA_OPLT:d,LUA_TNUMBER:o,lua_compare:m,lua_gettop:E,lua_isinteger:N,lua_isnoneornil:U,lua_pushboolean:$,lua_pushinteger:ge,lua_pushliteral:ie,lua_pushnil:Se,lua_pushnumber:q,lua_pushvalue:Z,lua_setfield:Q,lua_settop:Te,lua_tointeger:J,lua_tointegerx:Me,lua_type:Le}=kn(),{luaL_argcheck:ye,luaL_argerror:Ke,luaL_checkany:ut,luaL_checkinteger:Re,luaL_checknumber:Ue,luaL_error:Pe,luaL_newlib:ce,luaL_optnumber:ae}=Un(),{LUA_MAXINTEGER:R,LUA_MININTEGER:Oe,lua_numbertointeger:me}=wn(),{to_luastring:W}=In();let _e;const H=function(){return _e=1103515245*_e+12345&2147483647,_e},D=function(K){_e=K|0,_e===0&&(_e=1)},Ce=function(K){let I,O,A=_e===void 0?Math.random():H()/2147483648;switch(E(K)){case 0:return q(K,A),1;case 1:{I=1,O=Re(K,1);break}case 2:{I=Re(K,1),O=Re(K,2);break}default:return Pe(K,"wrong number of arguments")}return ye(K,I<=O,1,"interval is empty"),ye(K,I>=0||O<=R+I,1,"interval too large"),A*=O-I+1,ge(K,Math.floor(A)+I),1},ve=function(K){return D(Ue(K,1)),H(),0},ze=function(K){if(N(K,1)){let I=J(K,1);I<0&&(I=-I|0),ge(K,I)}else q(K,Math.abs(Ue(K,1)));return 1},de=function(K){return q(K,Math.sin(Ue(K,1))),1},Ye=function(K){return q(K,Math.cos(Ue(K,1))),1},Je=function(K){return q(K,Math.tan(Ue(K,1))),1},x=function(K){return q(K,Math.asin(Ue(K,1))),1},Y=function(K){return q(K,Math.acos(Ue(K,1))),1},X=function(K){let I=Ue(K,1),O=ae(K,2,1);return q(K,Math.atan2(I,O)),1},he=function(K){let I=Me(K,1);return I!==!1?ge(K,I):(ut(K,1),Se(K)),1},ee=function(K,I){let O=me(I);O!==!1?ge(K,O):q(K,I)},gt={abs:ze,acos:Y,asin:x,atan:X,ceil:function(K){return N(K,1)?Te(K,1):ee(K,Math.ceil(Ue(K,1))),1},cos:Ye,deg:function(K){return q(K,Ue(K,1)*(180/Math.PI)),1},exp:function(K){return q(K,Math.exp(Ue(K,1))),1},floor:function(K){return N(K,1)?Te(K,1):ee(K,Math.floor(Ue(K,1))),1},fmod:function(K){if(N(K,1)&&N(K,2)){let I=J(K,2);I===0?Ke(K,2,"zero"):ge(K,J(K,1)%I|0)}else{let I=Ue(K,1),O=Ue(K,2);q(K,I%O)}return 1},log:function(K){let I=Ue(K,1),O;if(U(K,2))O=Math.log(I);else{let A=Ue(K,2);A===2?O=Math.log2(I):A===10?O=Math.log10(I):O=Math.log(I)/Math.log(A)}return q(K,O),1},max:function(K){let I=E(K),O=1;ye(K,I>=1,1,"value expected");for(let A=2;A<=I;A++)m(K,O,A,d)&&(O=A);return Z(K,O),1},min:function(K){let I=E(K),O=1;ye(K,I>=1,1,"value expected");for(let A=2;A<=I;A++)m(K,A,O,d)&&(O=A);return Z(K,O),1},modf:function(K){if(N(K,1))Te(K,1),q(K,0);else{let I=Ue(K,1),O=I<0?Math.ceil(I):Math.floor(I);ee(K,O),q(K,I===O?0:I-O)}return 2},rad:function(K){return q(K,Ue(K,1)*(Math.PI/180)),1},random:Ce,randomseed:ve,sin:de,sqrt:function(K){return q(K,Math.sqrt(Ue(K,1))),1},tan:Je,tointeger:he,type:function(K){return Le(K,1)===o?N(K,1)?ie(K,"integer"):ie(K,"float"):(ut(K,1),Se(K)),1},ult:function(K){let I=Re(K,1),O=Re(K,2);return $(K,I>=0?O<0||I<O:O<0&&I<O),1}},we=function(K){return ce(K,gt),q(K,Math.PI),Q(K,-2,W("pi",!0)),q(K,1/0),Q(K,-2,W("huge",!0)),ge(K,R),Q(K,-2,W("maxinteger",!0)),ge(K,Oe),Q(K,-2,W("mininteger",!0)),1};return tl.luaopen_math=we,tl}var nl={},Ll;function br(){if(Ll)return nl;Ll=1;const{LUA_MASKCALL:d,LUA_MASKCOUNT:o,LUA_MASKLINE:m,LUA_MASKRET:E,LUA_REGISTRYINDEX:N,LUA_TFUNCTION:U,LUA_TNIL:$,LUA_TTABLE:ge,LUA_TUSERDATA:ie,lua_Debug:Se,lua_call:q,lua_checkstack:Z,lua_gethook:Q,lua_gethookcount:Te,lua_gethookmask:J,lua_getinfo:Me,lua_getlocal:Le,lua_getmetatable:ye,lua_getstack:Ke,lua_getupvalue:ut,lua_getuservalue:Re,lua_insert:Ue,lua_iscfunction:Pe,lua_isfunction:ce,lua_isnoneornil:ae,lua_isthread:R,lua_newtable:Oe,lua_pcall:me,lua_pop:W,lua_pushboolean:_e,lua_pushfstring:H,lua_pushinteger:D,lua_pushlightuserdata:Ce,lua_pushliteral:ve,lua_pushnil:ze,lua_pushstring:de,lua_pushvalue:Ye,lua_rawgetp:Je,lua_rawsetp:x,lua_rotate:Y,lua_setfield:X,lua_sethook:he,lua_setlocal:ee,lua_setmetatable:ne,lua_settop:je,lua_setupvalue:nt,lua_setuservalue:at,lua_tojsstring:ft,lua_toproxy:ct,lua_tostring:ht,lua_tothread:pt,lua_touserdata:Et,lua_type:bt,lua_upvalueid:Ze,lua_upvaluejoin:St,lua_xmove:tt}=kn(),{luaL_argcheck:gt,luaL_argerror:we,luaL_checkany:K,luaL_checkinteger:I,luaL_checkstring:O,luaL_checktype:A,luaL_error:g,luaL_loadbuffer:v,luaL_newlib:B,luaL_optinteger:ue,luaL_optstring:ot,luaL_traceback:st,lua_writestringerror:Fe}=Un(),y=Ua(),{luastring_indexOf:V,to_luastring:Ae}=In(),De=function(l,n,u){l!==n&&!Z(n,u)&&g(l,Ae("stack overflow",!0))},qe=function(l){return Ye(l,N),1},_=function(l){return K(l,1),ye(l,1)||ze(l),1},te=function(l){const n=bt(l,2);return gt(l,n==$||n==ge,2,"nil or table expected"),je(l,2),ne(l,1),1},P=function(l){return bt(l,1)!==ie?ze(l):Re(l,1),1},se=function(l){return A(l,1,ie),K(l,2),je(l,2),at(l,1),1},Ne=function(l){return R(l,1)?{arg:1,thread:pt(l,1)}:{arg:0,thread:l}},it=function(l,n,u){de(l,u),X(l,-2,n)},Qe=function(l,n,u){D(l,u),X(l,-2,n)},Rt=function(l,n,u){_e(l,u),X(l,-2,n)},kt=function(l,n,u){l==n?Y(l,-2,1):tt(n,l,1),X(l,-2,u)},yt=function(l){let n=new Se,u=Ne(l),s=u.arg,C=u.thread,re=ot(l,s+2,"flnStu");if(De(l,C,3),ce(l,s+1))re=H(l,Ae(">%s"),re),Ye(l,s+1),tt(l,C,1);else if(!Ke(C,I(l,s+1),n))return ze(l),1;return Me(C,re,n)||we(l,s+2,"invalid option"),Oe(l),V(re,83)>-1&&(it(l,Ae("source",!0),n.source),it(l,Ae("short_src",!0),n.short_src),Qe(l,Ae("linedefined",!0),n.linedefined),Qe(l,Ae("lastlinedefined",!0),n.lastlinedefined),it(l,Ae("what",!0),n.what)),V(re,108)>-1&&Qe(l,Ae("currentline",!0),n.currentline),V(re,117)>-1&&(Qe(l,Ae("nups",!0),n.nups),Qe(l,Ae("nparams",!0),n.nparams),Rt(l,Ae("isvararg",!0),n.isvararg)),V(re,110)>-1&&(it(l,Ae("name",!0),n.name),it(l,Ae("namewhat",!0),n.namewhat)),V(re,116)>-1&&Rt(l,Ae("istailcall",!0),n.istailcall),V(re,76)>-1&&kt(l,C,Ae("activelines",!0)),V(re,102)>-1&&kt(l,C,Ae("func",!0)),1},vt=function(l){let n=Ne(l),u=n.thread,s=n.arg,C=new Se,re=I(l,s+2);if(ce(l,s+1))return Ye(l,s+1),de(l,Le(l,null,re)),1;{let Ve=I(l,s+1);if(!Ke(u,Ve,C))return we(l,s+1,"level out of range");De(l,u,1);let dt=Le(u,C,re);return dt?(tt(u,l,1),de(l,dt),Y(l,-2,1),2):(ze(l),1)}},Wt=function(l){let n=Ne(l),u=n.thread,s=n.arg,C=new Se,re=I(l,s+1),Ve=I(l,s+2);if(!Ke(u,re,C))return we(l,s+1,"level out of range");K(l,s+3),je(l,s+3),De(l,u,1),tt(l,u,1);let dt=ee(u,C,Ve);return dt===null&&W(u,1),de(l,dt),1},Gt=function(l,n){let u=I(l,2);A(l,1,U);let s=n?ut(l,1,u):nt(l,1,u);return s===null?0:(de(l,s),Ue(l,-(n+1)),n+1)},Nt=function(l){return Gt(l,1)},Dt=function(l){return K(l,3),Gt(l,0)},Vt=function(l,n,u){let s=I(l,u);return A(l,n,U),gt(l,ut(l,n,s)!==null,u,"invalid upvalue index"),s},Ht=function(l){let n=Vt(l,1,2);return Ce(l,Ze(l,1,n)),1},Lt=function(l){let n=Vt(l,1,2),u=Vt(l,3,4);return gt(l,!Pe(l,1),1,"Lua function expected"),gt(l,!Pe(l,3),3,"Lua function expected"),St(l,1,n,3,u),0},Kt=Ae("__hooks__",!0),Xt=["call","return","line","count","tail call"].map(l=>Ae(l)),F=function(l,n){Je(l,N,Kt);let s=Et(l,-1).get(l);s&&(s(l),de(l,Xt[n.event]),n.currentline>=0?D(l,n.currentline):ze(l),y.lua_assert(Me(l,Ae("lS"),n)),q(l,2,0))},T=function(l,n){let u=0;return V(l,99)>-1&&(u|=d),V(l,114)>-1&&(u|=E),V(l,108)>-1&&(u|=m),n>0&&(u|=o),u},Ee=function(l,n){let u=0;return l&d&&(n[u++]=99),l&E&&(n[u++]=114),l&m&&(n[u++]=108),n.subarray(0,u)},oe={gethook:function(l){let u=Ne(l).thread,s=new Uint8Array(5),C=J(u),re=Q(u);return re===null?ze(l):re!==F?ve(l,"external hook"):(Je(l,N,Kt),Et(l,-1).get(u)(l)),de(l,Ee(C,s)),D(l,Te(u)),3},getinfo:yt,getlocal:vt,getmetatable:_,getregistry:qe,getupvalue:Nt,getuservalue:P,sethook:function(l){let n,u,s,C=Ne(l),re=C.thread,Ve=C.arg;if(ae(l,Ve+1))je(l,Ve+1),s=null,n=0,u=0;else{const Bt=O(l,Ve+2);A(l,Ve+1,U),u=ue(l,Ve+3,0),s=F,n=T(Bt,u)}let dt;Je(l,N,Kt)===$?(dt=new WeakMap,Ce(l,dt),x(l,N,Kt)):dt=Et(l,-1);let Pt=ct(l,Ve+1);return dt.set(re,Pt),he(re,s,n,u),0},setlocal:Wt,setmetatable:te,setupvalue:Dt,setuservalue:se,traceback:function(l){let n=Ne(l),u=n.thread,s=n.arg,C=ht(l,s+1);if(C===null&&!ae(l,s+1))Ye(l,s+1);else{let re=ue(l,s+2,l===u?1:0);st(l,u,C,re)}return 1},upvalueid:Ht,upvaluejoin:Lt};let He;typeof window<"u"&&(He=function(){let l=prompt("lua_debug>","");return l!==null?l:""}),He&&(oe.debug=function(l){for(;;){let n=He();if(n==="cont")return 0;if(n.length===0)continue;let u=Ae(n);(v(l,u,u.length,Ae("=(debug command)",!0))||me(l,0,0,0))&&Fe(ft(l,-1),`
`),je(l,0)}});const At=function(l){return B(l,oe),1};return nl.luaopen_debug=At,nl}var al={},Jl;function Tr(){if(Jl)return al;Jl=1;const{LUA_DIRSEP:d,LUA_EXEC_DIR:o,LUA_JSPATH_DEFAULT:m,LUA_PATH_DEFAULT:E,LUA_PATH_MARK:N,LUA_PATH_SEP:U}=wn(),{LUA_OK:$,LUA_REGISTRYINDEX:ge,LUA_TNIL:ie,LUA_TTABLE:Se,lua_callk:q,lua_createtable:Z,lua_getfield:Q,lua_insert:Te,lua_isfunction:J,lua_isnil:Me,lua_isstring:Le,lua_newtable:ye,lua_pop:Ke,lua_pushboolean:ut,lua_pushcclosure:Re,lua_pushcfunction:Ue,lua_pushfstring:Pe,lua_pushglobaltable:ce,lua_pushlightuserdata:ae,lua_pushliteral:R,lua_pushlstring:Oe,lua_pushnil:me,lua_pushstring:W,lua_pushvalue:_e,lua_rawgeti:H,lua_rawgetp:D,lua_rawseti:Ce,lua_rawsetp:ve,lua_remove:ze,lua_setfield:de,lua_setmetatable:Ye,lua_settop:Je,lua_toboolean:x,lua_tostring:Y,lua_touserdata:X,lua_upvalueindex:he}=kn(),{LUA_LOADED_TABLE:ee,LUA_PRELOAD_TABLE:ne,luaL_Buffer:je,luaL_addvalue:nt,luaL_buffinit:at,luaL_checkstring:ft,luaL_error:ct,luaL_getsubtable:ht,luaL_gsub:pt,luaL_len:Et,luaL_loadfile:bt,luaL_newlib:Ze,luaL_optstring:St,luaL_pushresult:tt,luaL_setfuncs:gt}=Un(),we=Ua(),{luastring_indexOf:K,to_jsstring:I,to_luastring:O,to_uristring:A}=In(),g=kr(),v=(function(){return typeof window<"u"?window:typeof WorkerGlobalScope<"u"&&self instanceof WorkerGlobalScope?self:(0,eval)("this")})(),B=O("__JSLIBS__"),ue="LUA_PATH",ot="LUA_JSPATH",st="-",Fe=d,y=d,V=O("luaopen_"),Ae=O("_"),De="open",qe=O("");let _;_=function(s,C,re){C=A(C);let Ve=new XMLHttpRequest;if(Ve.open("GET",C,!1),Ve.send(),Ve.status<200||Ve.status>=300)return W(s,O(`${Ve.status}: ${Ve.statusText}`)),null;let dt=Ve.response;/\/\/[#@] sourceURL=/.test(dt)||(dt+=" //# sourceURL="+C);let Pt;try{Pt=Function("fengari",dt)}catch(Ft){return W(s,O(`${Ft.name}: ${Ft.message}`)),null}let Bt=Pt(g);return typeof Bt=="function"||typeof Bt=="object"&&Bt!==null?Bt:Bt===void 0?v:(W(s,O(`library returned unexpected type (${typeof Bt})`)),null)};const te=function(s,C,re){let Ve=C[I(re)];return Ve&&typeof Ve=="function"?Ve:(Pe(s,O("undefined symbol: %s"),re),null)},P=function(s){Q(s,ge,O("LUA_NOENV"));let C=x(s,-1);return Ke(s,1),C};let se;se=function(s){s=A(s);let C=new XMLHttpRequest;return C.open("GET",s,!1),C.send(),C.status>=200&&C.status<=299};const Ne=1,it=2,Qe=function(s,C,re){let Ve=vt(s,C);if(Ve===null){if(Ve=_(s,C,re[0]===42),Ve===null)return Ne;Wt(s,C,Ve)}if(re[0]===42)return ut(s,1),0;{let dt=te(s,Ve,re);return dt===null?it:(Ue(s,dt),0)}},Rt=function(s){let C=ft(s,1),re=ft(s,2),Ve=Qe(s,C,re);return Ve===0?1:(me(s),Te(s,-2),R(s,Ve===Ne?De:"init"),3)},kt=(function(){return v})(),yt=function(s,C,re,Ve){let dt=`${re}${we.LUA_VERSUFFIX}`;W(s,O(dt));let Pt=kt[dt];Pt===void 0&&(Pt=kt[re]),Pt===void 0||P(s)?W(s,Ve):(Pt=pt(s,O(Pt),O(U+U,!0),O(U+I(qe)+U,!0)),pt(s,Pt,qe,Ve),ze(s,-2)),de(s,-3,C),Ke(s,1)},vt=function(s,C){D(s,ge,B),Q(s,-1,C);let re=X(s,-1);return Ke(s,2),re},Wt=function(s,C,re){D(s,ge,B),ae(s,re),_e(s,-1),de(s,-3,C),Ce(s,-2,Et(s,-2)+1),Ke(s,1)},Gt=function(s,C){for(;C[0]===U.charCodeAt(0);)C=C.subarray(1);if(C.length===0)return null;let re=K(C,U.charCodeAt(0));return re<0&&(re=C.length),Oe(s,C,re),C.subarray(re)},Nt=function(s,C,re,Ve,dt){let Pt=new je;for(at(s,Pt),Ve[0]!==0&&(C=pt(s,C,Ve,dt));(re=Gt(s,re))!==null;){let Bt=pt(s,Y(s,-1),O(N,!0),C);if(ze(s,-2),se(Bt))return Bt;Pe(s,O(`
	no file '%s'`),Bt),ze(s,-2),nt(Pt)}return tt(Pt),null},Dt=function(s){return Nt(s,ft(s,1),ft(s,2),St(s,3,"."),St(s,4,d))!==null?1:(me(s),Te(s,-2),2)},Vt=function(s,C,re,Ve){Q(s,he(1),re);let dt=Y(s,-1);return dt===null&&ct(s,O("'package.%s' must be a string"),re),Nt(s,C,dt,O("."),Ve)},Ht=function(s,C,re){return C?(W(s,re),2):ct(s,O(`error loading module '%s' from file '%s':
	%s`),Y(s,1),re,Y(s,-1))},Lt=function(s){let C=ft(s,1),re=Vt(s,C,O("path",!0),O(y,!0));return re===null?1:Ht(s,bt(s,re)===$,re)},Kt=function(s,C,re){let Ve;re=pt(s,re,O("."),Ae);let dt=K(re,st.charCodeAt(0));if(dt>=0){Ve=Oe(s,re,dt),Ve=Pe(s,O("%s%s"),V,Ve);let Pt=Qe(s,C,Ve);if(Pt!==it)return Pt;re=dt+1}return Ve=Pe(s,O("%s%s"),V,re),Qe(s,C,Ve)},Xt=function(s){let C=ft(s,1),re=Vt(s,C,O("jspath",!0),O(Fe,!0));return re===null?1:Ht(s,Kt(s,re,C)===0,re)},F=function(s){let C=ft(s,1),re=K(C,46),Ve;if(re<0)return 0;Oe(s,C,re);let dt=Vt(s,Y(s,-1),O("jspath",!0),O(Fe,!0));return dt===null?1:(Ve=Kt(s,dt,C))!==0?Ve!=it?Ht(s,0,dt):(Pe(s,O(`
	no module '%s' in file '%s'`),C,dt),1):(W(s,dt),2)},T=function(s){let C=ft(s,1);return Q(s,ge,ne),Q(s,-1,C)===ie&&Pe(s,O(`
	no field package.preload['%s']`),C),1},Ee=function(s,C,re,Ve){let dt=new je;return at(s,dt),Q(s,he(1),O("searchers",!0))!==Se&&ct(s,O("'package.searchers' must be a table")),We(s,$,{name:C,i:1,msg:dt,ctx:re,k:Ve})},We=function(s,C,re){for(;C===$?(H(s,3,re.i)===ie&&(Ke(s,1),tt(re.msg),ct(s,O("module '%s' not found:%s"),re.name,Y(s,-1))),W(s,re.name),q(s,1,2,re,We)):C=$,!J(s,-2);re.i++)Le(s,-2)?(Ke(s,1),nt(re.msg)):Ke(s,2);return re.k(s,$,re.ctx)},b=function(s){let C=ft(s,1);return Je(s,1),Q(s,ge,ee),Q(s,2,C),x(s,-1)?1:(Ke(s,1),Ee(s,C,C,fe))},fe=function(s,C,re){return W(s,re),Te(s,-2),q(s,2,1,re,oe),oe(s,$,re)},oe=function(s,C,re){let Ve=re;return Me(s,-1)||de(s,2,Ve),Q(s,2,Ve)==ie&&(ut(s,1),_e(s,-1),de(s,2,Ve)),1},He={loadlib:Rt,searchpath:Dt},At={require:b},l=function(s){let C=[T,Lt,Xt,F,null];Z(s);for(let re=0;C[re];re++)_e(s,-2),Re(s,C[re],1),Ce(s,-2,re+1);de(s,-2,O("searchers",!0))},n=function(s){ye(s),Z(s,0,1),Ye(s,-2),ve(s,ge,B)},u=function(s){return n(s),Ze(s,He),l(s),yt(s,O("path",!0),ue,E),yt(s,O("jspath",!0),ot,m),R(s,d+`
`+U+`
`+N+`
`+o+`
`+st+`
`),de(s,-2,O("config",!0)),ht(s,ge,ee),de(s,-2,O("loaded",!0)),ht(s,ge,ne),de(s,-2,O("preload",!0)),ce(s),_e(s,-2),gt(s,At,1),Ke(s,1),1};return al.luaopen_package=u,al}var ll={},$l;function Er(){if($l)return ll;$l=1;const{lua_pushinteger:d,lua_pushliteral:o,lua_setfield:m}=kn(),{luaL_newlib:E}=Un(),{FENGARI_AUTHORS:N,FENGARI_COPYRIGHT:U,FENGARI_RELEASE:$,FENGARI_VERSION:ge,FENGARI_VERSION_MAJOR:ie,FENGARI_VERSION_MINOR:Se,FENGARI_VERSION_NUM:q,FENGARI_VERSION_RELEASE:Z,to_luastring:Q}=In(),Te=function(J){return E(J,{}),o(J,N),m(J,-2,Q("AUTHORS")),o(J,U),m(J,-2,Q("COPYRIGHT")),o(J,$),m(J,-2,Q("RELEASE")),o(J,ge),m(J,-2,Q("VERSION")),o(J,ie),m(J,-2,Q("VERSION_MAJOR")),o(J,Se),m(J,-2,Q("VERSION_MINOR")),d(J,q),m(J,-2,Q("VERSION_NUM")),o(J,Z),m(J,-2,Q("VERSION_RELEASE")),1};return ll.luaopen_fengari=Te,ll}var rl={},Ql;function _s(){if(Ql)return rl;Ql=1;const{lua_pop:d}=kn(),{luaL_requiref:o}=Un(),{to_luastring:m}=In(),E={},N=function(Le){for(let ye in E)o(Le,m(ye),E[ye],1),d(Le,1)};rl.luaL_openlibs=N;const U=Ua(),{luaopen_base:$}=_r(),{luaopen_coroutine:ge}=dr(),{luaopen_debug:ie}=br(),{luaopen_math:Se}=mr(),{luaopen_package:q}=Tr(),{luaopen_os:Z}=pr(),{luaopen_string:Q}=gr(),{luaopen_table:Te}=hr(),{luaopen_utf8:J}=Ar();E._G=$,E[U.LUA_LOADLIBNAME]=q,E[U.LUA_COLIBNAME]=ge,E[U.LUA_TABLIBNAME]=Te,E[U.LUA_OSLIBNAME]=Z,E[U.LUA_STRLIBNAME]=Q,E[U.LUA_MATHLIBNAME]=Se,E[U.LUA_UTF8LIBNAME]=J,E[U.LUA_DBLIBNAME]=ie;const{luaopen_fengari:Me}=Er();return E[U.LUA_FENGARILIBNAME]=Me,rl}var er;function Ua(){if(er)return Zt;er=1;const{LUA_VERSION_MAJOR:d,LUA_VERSION_MINOR:o}=kn(),m="_"+d+"_"+o;Zt.LUA_VERSUFFIX=m,Zt.lua_assert=function(J){},Zt.luaopen_base=_r().luaopen_base;const E="coroutine";Zt.LUA_COLIBNAME=E,Zt.luaopen_coroutine=dr().luaopen_coroutine;const N="table";Zt.LUA_TABLIBNAME=N,Zt.luaopen_table=hr().luaopen_table;const U="os";Zt.LUA_OSLIBNAME=U,Zt.luaopen_os=pr().luaopen_os;const $="string";Zt.LUA_STRLIBNAME=$,Zt.luaopen_string=gr().luaopen_string;const ge="utf8";Zt.LUA_UTF8LIBNAME=ge,Zt.luaopen_utf8=Ar().luaopen_utf8;const ie="bit32";Zt.LUA_BITLIBNAME=ie;const Se="math";Zt.LUA_MATHLIBNAME=Se,Zt.luaopen_math=mr().luaopen_math;const q="debug";Zt.LUA_DBLIBNAME=q,Zt.luaopen_debug=br().luaopen_debug;const Z="package";Zt.LUA_LOADLIBNAME=Z,Zt.luaopen_package=Tr().luaopen_package;const Q="fengari";Zt.LUA_FENGARILIBNAME=Q,Zt.luaopen_fengari=Er().luaopen_fengari;const Te=_s();return Zt.luaL_openlibs=Te.luaL_openlibs,Zt}/**
@license MIT

Copyright © 2017-2019 Benoit Giannangeli
Copyright © 2017-2019 Daurnimator
Copyright © 1994–2017 Lua.org, PUC-Rio.
*/var tr;function kr(){if(tr)return Qt;tr=1;const d=In();Qt.FENGARI_AUTHORS=d.FENGARI_AUTHORS,Qt.FENGARI_COPYRIGHT=d.FENGARI_COPYRIGHT,Qt.FENGARI_RELEASE=d.FENGARI_RELEASE,Qt.FENGARI_VERSION=d.FENGARI_VERSION,Qt.FENGARI_VERSION_MAJOR=d.FENGARI_VERSION_MAJOR,Qt.FENGARI_VERSION_MINOR=d.FENGARI_VERSION_MINOR,Qt.FENGARI_VERSION_NUM=d.FENGARI_VERSION_NUM,Qt.FENGARI_VERSION_RELEASE=d.FENGARI_VERSION_RELEASE,Qt.luastring_eq=d.luastring_eq,Qt.luastring_indexOf=d.luastring_indexOf,Qt.luastring_of=d.luastring_of,Qt.to_jsstring=d.to_jsstring,Qt.to_luastring=d.to_luastring,Qt.to_uristring=d.to_uristring;const o=wn(),m=kn(),E=Un(),N=Ua();return Qt.luaconf=o,Qt.lua=m,Qt.lauxlib=E,Qt.lualib=N,Qt}var ds=kr();const Na=os(ds),{lua:Jt,lauxlib:cn,lualib:hs}=Na;function Da(d){return Na.to_luastring(String(d))}function ps(d,o){if(typeof o=="number")Jt.lua_pushnumber(d,o);else if(typeof o=="boolean")Jt.lua_pushboolean(d,o);else if(o==null)Jt.lua_pushnil(d);else{const m=Da(o);Jt.lua_pushlstring(d,m,m.length)}}function nr(d,o){return Na.to_jsstring(cn.luaL_checkstring(d,o))}function ar(d,o,m){return Na.to_jsstring(cn.luaL_optstring(d,o,m))}class gs{constructor(o,m,E){this.name=o,this.scene=[],this.lastError=null,this.takeover=!1,this._getCanvasSize=E;const N=cn.luaL_newstate();hs.luaL_openlibs(N),this.L=N,this._registerHostApi();const U=cn.luaL_dostring(N,Da(m));if(U!==0){const $=Jt.lua_isstring(N,-1)?Na.to_jsstring(cn.luaL_tolstring(N,-1)):`load failed (code ${U})`;throw Jt.lua_pop(N,1),new Error($.trim())}}_registerHostApi(){const o=this.L,m=(E,N)=>{Jt.lua_pushcfunction(o,N),Jt.lua_setglobal(o,Da(E))};m("clearCanvas",()=>(this.scene.length=0,0)),m("drawText",E=>{const N=nr(E,1),U=cn.luaL_checknumber(E,2),$=cn.luaL_checknumber(E,3),ge=cn.luaL_optnumber(E,4,24),ie=ar(E,5,"#ffffff");return this.scene.push({type:"text",text:N,x:U,y:$,size:ge,color:ie}),0}),m("drawImage",E=>{const N=nr(E,1),U=cn.luaL_checknumber(E,2),$=cn.luaL_checknumber(E,3),ge=Jt.lua_gettop(E)>=4&&!Jt.lua_isnil(E,4)?cn.luaL_checknumber(E,4):null,ie=Jt.lua_gettop(E)>=5&&!Jt.lua_isnil(E,5)?cn.luaL_checknumber(E,5):null;return this.scene.push({type:"image",src:N,x:U,y:$,w:ge,h:ie}),0}),m("drawRectangle",E=>{const N=cn.luaL_checknumber(E,1),U=cn.luaL_checknumber(E,2),$=cn.luaL_checknumber(E,3),ge=cn.luaL_checknumber(E,4),ie=ar(E,5,"#ffffff");return this.scene.push({type:"rect",x:N,y:U,w:$,h:ge,fill:ie}),0}),m("now",()=>(Jt.lua_pushnumber(o,Date.now()/1e3),1)),m("canvasWidth",()=>(Jt.lua_pushnumber(o,this._getCanvasSize()[0]),1)),m("canvasHeight",()=>(Jt.lua_pushnumber(o,this._getCanvasSize()[1]),1)),m("takeoverCanvas",E=>(this.takeover=Jt.lua_gettop(E)>=1&&!!Jt.lua_toboolean(E,1),0))}_call(o,m){const E=this.L;if(Jt.lua_getglobal(E,Da(o)),!Jt.lua_isfunction(E,-1)){Jt.lua_pop(E,1);return}for(const U of m)ps(E,U);const N=Jt.lua_pcall(E,m.length,0,0);N!==0&&(this.lastError=Jt.lua_isstring(E,-1)?Na.to_jsstring(cn.luaL_tolstring(E,-1)):`error code ${N}`),Jt.lua_settop(E,0)}dispose(){this.L=null,this.takeover=!1,this.scene.length=0}}class As{constructor(o=()=>[0,0]){this._scripts=[],this._getCanvasSize=o,this._nextId=1}add(o,m){try{const E=new gs(o,m,this._getCanvasSize),N=this._nextId++;return this._scripts.push({id:N,script:E,enabled:!0}),{ok:!0,id:N}}catch(E){return{ok:!1,error:E.message}}}setEnabled(o,m){const E=this._scripts.find(N=>N.id===o);E&&(E.enabled=!!m)}remove(o){const m=this._scripts.find(E=>E.id===o);m&&(m.script.dispose(),this._scripts=this._scripts.filter(E=>E.id!==o))}clear(){for(const{script:o}of this._scripts)o.dispose();this._scripts.length=0}get size(){return this._scripts.length}scripts(){return this._scripts.map(({id:o,script:m,enabled:E})=>({id:o,name:m.name,enabled:E,lastError:m.lastError}))}scenes(){const o=this._scripts.filter(({enabled:m})=>m);for(const m of o)if(m.script.takeover)return[{name:m.script.name,scene:m.script.scene}];return o.map(({script:m})=>({name:m.name,scene:m.scene}))}onLogLine(o){for(const{script:m,enabled:E}of this._scripts)E&&m._call("onLogLine",[o])}onChangeZone(o){for(const{script:m,enabled:E}of this._scripts)E&&m._call("onChangeZone",[o])}onCombatStart(){for(const{script:o,enabled:m}of this._scripts)m&&o._call("onCombatStart",[])}onCombatEnd(o,m){for(const{script:E,enabled:N}of this._scripts)N&&E._call("onCombatEnd",[o,m])}frame(o){for(const{script:m,enabled:E}of this._scripts)E&&m._call("onFrame",[o])}}const ms=`-- DMU Phase 4 real/fake debuff tracker (Kefka / Neo Exdeath / Chaos).
--
-- Before each big move the acting boss holds status "Unknown_808" whose param
-- encodes the reality of that move's debuffs:
--   p=1119/1121 -> FAKE,  p=1120/1122 -> REAL.
-- Two kinds of rows:
--   GLOBAL (Cursed Shriek / Inferno / Tsunami): affect everyone, so the table
--   follows the LATEST round — captured from any player's apply line or the
--   boss casting; "you" markers show which are on you specifically.
--   PERSONAL (Compressed Water / Forked Lightning / Acceleration Bomb): only
--   matter to whoever carries them, so each row is pinned to YOUR debuff when
--   it lands and a later round cannot overwrite it while yours is still up.
-- If no fresh (<20s) tell is active when something triggers it stays ??? and
-- is re-checked every frame until one shows up (mirrors dmu-p4-debuff-helper).

-- Under the table, all six resolution windows get their own huge line; a window
-- with nothing resolved yet is drawn blank and dimmed. Windows 1 and 4 show
-- STACK when you hold no debuff in that wave — an empty wave means stack:
--   1st: short-timer water/lightning/bomb   2nd: short Cursed Shriek   3rd: Inferno
--   4th: long-timer water/lightning/bomb    5th: long Cursed Shriek    6th: Tsunami
-- Words come from the per-status reality maps below. The two personal waves are
-- told apart by expiry clustering: the party's debuffs always resolve at the same
-- moment (durations differ per player, expiries align), so the earlier cluster is
-- the short wave and the later one the long wave.

local TELL_STATUS = "808"
local FRESH_TELL_MS = 20000

-- Late-P4 Mana Charge / Release (a Kefka clone): the final simultaneous TTIII/BIIIB is
-- real or fake per element, which decides where the safe spots are. The holder clone
-- gets a MARKER at each step and the marker id encodes element AND reality:
--   thunder 02A6=REAL 02A5=FAKE, blizzard 02A4=REAL 02A3=FAKE.
-- Per pull: one thunder-charge marker (~"Thunder Charged"), one blizzard-charge marker
-- (~"Blizzard Charged"), then two at once when Mana Release casts (its telegraphs).
-- An element's final cast is REAL iff its charge and release states agree; line 6 gets
-- the computed outcome. The same markers also appear on these clones in an earlier P4
-- round, so everything is anchored to the Mana Charge cast (BAA4).
local MANA_ACTION = { BAA4 = true, BAA5 = true } -- Mana Charge / Mana Release

local function manaMarker(mid)
  if mid == "02A6" then return "t", true end   -- thunder REAL telegraph
  if mid == "02A5" then return "t", false end  -- thunder FAKE telegraph
  if mid == "02A4" then return "b", true end   -- blizzard REAL telegraph
  if mid == "02A3" then return "b", false end  -- blizzard FAKE telegraph
  return nil, nil
end

local function freshMana()
  return { holderId = nil, mcT = nil, mcB = nil, mrT = nil, mrB = nil }
end

-- The table only appears while mechanics are happening and stays up this long after
-- the last related line (tells, debuff applies/removals, boss casts) before clearing.
local CLEAR_MS = 120000

-- Shared visual language across the example scripts — keep these in sync.
local C_TITLE  = "#ffffff"
local C_LABEL  = "#5a627e"
local C_NAME   = "#d0d0e0"
local C_BRIGHT = "#e8ecf8"
local C_INFO   = "#9fd0ff"
local C_ACCENT = "#ffd24c"
local C_REAL   = "#7dff9e"
local C_FAKE   = "#ff8f8f"
local C_WARN   = "#ffd27f"
local C_DIMMED = "#6a6a80"

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = "Minda Silva"
local MY_ID   = "10020C04"

-- Boss entity ids differ between sessions, so tells are matched by NAME.
-- (Chaos's effect sub-entities share the name "Chaos".)
local BOSS_NAMES = { ["Neo Exdeath"] = true, ["Chaos"] = true }

-- GLOBAL rows: any player's apply line stamps the table; Cursed Shriek comes in
-- a 60s class ("Short") and a 69s class ("Long"), so its key depends on duration.
local STATUS_MECH = {
  ["15A7"] = { boss="Neo Exdeath", mech=function(dur) return dur < 65 and "csShort" or "csLong" end }, -- Cursed Shriek
  ["15AB"] = { boss="Chaos",       mech="inferno" }, -- Entropy (Inferno's debuff)
  ["15AC"] = { boss="Chaos",       mech="tsunami" }, -- Dynamic Fluid (Tsunami's debuff)
}

-- PERSONAL rows: pinned to your own debuff when it lands.
local STATUS_PERSONAL = {
  ["15A8"] = { boss="Neo Exdeath", row="cwfl" }, -- Forked Lightning
  ["15A9"] = { boss="Neo Exdeath", row="cwfl" }, -- Compressed Water
  ["15AA"] = { boss="Neo Exdeath", row="ab" },   -- Acceleration Bomb
}

local MECH_BOSSES = { csShort="Neo Exdeath", csLong="Neo Exdeath", inferno="Chaos", tsunami="Chaos" }

-- Chaos casts stamp their global mechanic even if apply lines never arrive (e.g. a
-- snippet cut before they do). Matched on ACTION HEX + caster name: other phases
-- reuse these ability names (Kefka has his own "Inferno" BAF4 / "Tsunami" BAF5), so
-- the display name alone is ambiguous. Grand Cross stamps NO shriek rows: each round
-- applies only ONE shriek class, and which one is revealed by the apply lines'
-- durations — a cast cannot say. (GC casts are still recorded for the footer.)
local CASTS = {
  BB14 = { boss="Neo Exdeath", keys={} }, -- Grand Cross
  BB1E = { boss="Chaos",       keys={ "inferno" } },           -- Inferno
  BB20 = { boss="Chaos",       keys={ "inferno" } },           -- Inferno (sub-entity caster)
  BB1F = { boss="Chaos",       keys={ "tsunami" } },           -- Tsunami
  BB21 = { boss="Chaos",       keys={ "tsunami" } },           -- Tsunami (sub-entity caster)
}

local mechs      = {} -- mechKey -> { reality=, tellParam=, atMs= } (latest round, global rows)
local personal   = {} -- statusHex -> { boss=, appliedAtMs=, reality=, tellParam= } (your cwfl/ab debuffs)
local mine       = {} -- statusHex -> { durationS=, appliedAtMs= } ("you" markers only)
local tells    = {} -- bossName -> { param=, atMs= } (currently held tell)
local priorTells = {} -- bossName -> { param=, endedAtMs= } (tell already active when the log started)
local tellSeen   = {} -- bossName -> true once any of its tell lines was observed this session
local casts      = {} -- cast name -> last seen ms
local personalWaves = {} -- { at=, expire= } for every observed cwfl/ab apply (any carrier)
local mana = freshMana() -- Mana Charge / Release sequence state (see above)
local lastActivityMs = nil -- when the newest mechanic-related line was seen (nil = nothing to show)

function resetAll()
  mechs = {}
  personal = {}
  mine = {}
  tells = {}
  priorTells = {}
  tellSeen = {}
  casts = {}
  personalWaves = {}
  mana = freshMana()
  lastActivityMs = nil
end

-- onCombatStart covers the case where a fight ends without a defeat/victory line we
-- see (stream hiccup): every new pull starts from clean state regardless.
onChangeZone    = function(_zone) resetAll() end
onCombatEnd     = function(_result, _elapsedMs) resetAll() end
onCombatStart   = function() resetAll() end

local function nowMs() return math.floor(now() * 1000 + 0.5) end

-- NOTE: Lua's gmatch("[^|]+") silently DROPS empty fields between "||",
-- shifting every later index. Split on literal "|" preserving empties.
local function splitLine(raw)
  local parts, start = {}, 1
  while true do
    local i = raw:find("|", start, true)
    if not i then break end
    parts[#parts+1] = raw:sub(start, i - 1)
    start = i + 1
  end
  parts[#parts+1] = raw:sub(start)
  return parts
end

local function realityOfParam(p)
  if p == 1119 or p == 1121 then return "fake" end
  if p == 1120 or p == 1122 then return "real" end
  return nil
end

-- Reality of the boss tell relevant at refMs: a fresh currently-held tell, or a
-- pre-log tell that was still active at refMs. Returns (reality|nil, param|nil).
local function tellReality(boss, refMs)
  local t = tells[boss]
  if t and nowMs() - t.atMs <= FRESH_TELL_MS then
    return realityOfParam(t.param), t.param
  end
  local p = priorTells[boss]
  if p and refMs < p.endedAtMs then
    return realityOfParam(p.param), p.param
  end
  return nil, nil
end

local function parseTell(raw)
  local f = splitLine(raw)
  if #f < 10 or (f[1] ~= "26" and f[1] ~= "30") then return end
  if (f[3] or ""):upper() ~= TELL_STATUS then return end
  -- tell layout: f[8]=boss id, f[9]=name, f[10]=param. Match by NAME: boss entity
  -- ids differ between sessions.
  local bossName = f[9]
  if not BOSS_NAMES[bossName] then return end
  local param = tonumber((f[10] or ""), 16)
  lastActivityMs = nowMs() -- a tell landing or lifting is part of the mechanic sequence
  if f[1] == "30" then
    if tells[bossName] then
      tells[bossName] = nil
    elseif not tellSeen[bossName] and param then
      -- Log started mid-combat: this boss was already holding a tell whose add line
      -- we never saw. Remember it as active-until-now so mechanics that triggered
      -- before this removal can still be attributed to it.
      priorTells[bossName] = { param=param, endedAtMs=nowMs() }
    end
  else
    if param then tells[bossName] = { param=param, atMs=nowMs() } end
  end
  tellSeen[bossName] = true
end

local function parsePrimaryPlayer(raw)
  local f = splitLine(raw)
  -- IINACT line type 2: "2|ts|<charID hex>|<charName>", emitted on zone change.
  if #f < 4 or f[1] ~= "2" then return end
  if (f[3] or "") ~= "" and (f[4] or "") ~= "" then
    MY_ID, MY_NAME = f[3], f[4]
  end
end

local function isMe(id, name)
  return id == MY_ID or name == MY_NAME
end

-- Every carrier's cwfl/bomb apply lands here: the party's debuffs resolve in two
-- simultaneous waves and these records are what reveal where the waves split.
local function notePersonalWave(durS, appliedAtMs)
  if not durS or durS <= 0 then return end
  personalWaves[#personalWaves+1] = { at=appliedAtMs, expire=appliedAtMs + math.floor(durS * 1000 + 0.5) }
  if #personalWaves > 256 then table.remove(personalWaves, 1) end
end

local function parseDebuff(raw)
  local f = splitLine(raw)
  if #f < 9 or (f[1] ~= "26" and f[1] ~= "30") then return end
  local status = (f[3] or ""):upper()
  local info, personalInfo = STATUS_MECH[status], STATUS_PERSONAL[status]
  if not info and not personalInfo then return end
  lastActivityMs = nowMs() -- applies AND removals keep the table up until it resolves

  -- Both line 26 apply and line 30 remove carry the target at f[8]/f[9].
  local targetId, targetName = f[8], f[9]

  if f[1] == "30" then
    -- Only clear markers for YOUR removal: other players' copies of the same
    -- status expire on their own schedule.
    if isMe(targetId, targetName) then
      mine[status] = nil
      personal[status] = nil
    end
    return
  end

  local dur = tonumber(f[5]) or 0
  local appliedAtMs = nowMs()

  if info then
    -- Global: any player's apply line informs the table (latest round wins).
    local mechKey = type(info.mech) == "function" and info.mech(dur) or info.mech
    local r, p = tellReality(info.boss, appliedAtMs)
    -- Never downgrade an already-resolved round to unknown: applies can land
    -- after the boss's tell has lifted, but the cast may have stamped it while
    -- the tell was still fresh.
    if r or not mechs[mechKey] then
      mechs[mechKey] = { reality=r, tellParam=p, atMs=appliedAtMs }
    end
    if isMe(targetId, targetName) then
      mine[status] = { durationS=dur, appliedAtMs=appliedAtMs }
    end
  else
    -- Personal: ANY carrier's apply informs wave timing (see waveClass), and YOUR
    -- debuff pins its own reality the moment it lands; a later round cannot
    -- overwrite it while yours is still up.
    notePersonalWave(dur, appliedAtMs)
    if isMe(targetId, targetName) then
      local r, p = tellReality(personalInfo.boss, appliedAtMs)
      personal[status] = { status=status, boss=personalInfo.boss, row=personalInfo.row, durationS=dur,
                           appliedAtMs=appliedAtMs, reality=r, tellParam=p }
      mine[status] = { durationS=dur, appliedAtMs=appliedAtMs }
    end
  end
end

-- Latest personal entry for a cwfl/ab row (you may hold both water and
-- lightning; the most recently applied one reflects the newest round).
local function personalEntry(row)
  local best
  for _, ent in pairs(personal) do
    if ent.row == row and (not best or ent.appliedAtMs >= best.appliedAtMs) then
      best = ent
    end
  end
  return best
end

-- Resolution words per STATUS and reality. Water and lightning are opposites, as
-- are inferno and tsunami; bomb and shriek are the same for both classes.
local CWFL_WORDS  = { ["15A9"] = { real="STACK", fake="SPREAD" }, -- Compressed Water
                      ["15A8"] = { real="SPREAD", fake="STACK" } } -- Forked Lightning
local AB_WORDS    = { ["15AA"] = { real="STOP",  fake="MOVE" } }   -- Acceleration Bomb
local SHRIEK_WORD = { real="LOOK OUT", fake="LOOK IN" }            -- Cursed Shriek (both classes)
local CHAOS_WORDS = { inferno={ real="OUT", fake="IN" }, tsunami={ real="IN", fake="OUT" } }

-- Which resolution wave does this expiry belong to? Candidates are the party's
-- applies near this entry's own apply time (other pulls' waves never mix in). The
-- expiries form exactly two tight clusters — everyone resolves at the same moment,
-- short-timer debuffs first; anything else is too ambiguous to guess.
local function waveClass(expireAt, appliedAtMs)
  local cands = {}
  for _, e in ipairs(personalWaves) do
    if math.abs(e.at - appliedAtMs) <= 90000 then cands[#cands+1] = e.expire end
  end
  table.sort(cands)
  local starts, i = {}, 1
  while i <= #cands do
    local j = i
    while j < #cands and cands[j+1] - cands[i] <= 5000 do j = j + 1 end
    starts[#starts+1] = cands[i]
    i = j + 1
  end
  if #starts ~= 2 then return nil end
  local boundary = (starts[1] + starts[2]) / 2
  return expireAt <= boundary and "short" or "long"
end

-- The six resolution windows, always all six, in fixed order; entries without a
-- resolved word come back inactive and render dimmed/blank. Windows 1 and 4 get
-- STACK when you hold nothing that resolves there — an empty wave means stack.
-- Your water/lightning/bomb words chain with "+" inside their wave. While any of
-- your debuffs is still unclassifiable (one wave unseen) the defaults are withheld
-- — we cannot know which window yours would land in, so both render inactive.
local function resolutionSlots()
  local shortParts, longParts, unresolved = {}, {}, 0
  for _, ent in pairs(personal) do
    local map = (ent.row == "ab") and AB_WORDS[ent.status] or CWFL_WORDS[ent.status]
    local w = ent.reality and map and map[ent.reality]
    if not w then unresolved = unresolved + 1 else
      local expireAt = ent.appliedAtMs + math.floor(ent.durationS * 1000 + 0.5)
      local cls = waveClass(expireAt, ent.appliedAtMs)
      if cls == "short" then shortParts[#shortParts+1] = w
      elseif cls == "long" then longParts[#longParts+1] = w
      else unresolved = unresolved + 1 end
    end
  end
  table.sort(shortParts) -- pairs() order is arbitrary; keep the line deterministic
  table.sort(longParts)

  local words = {}
  if #shortParts > 0 then words[1] = table.concat(shortParts, " + ")
  elseif unresolved == 0 then words[1] = "STACK" end
  local sm = mechs.csShort
  if sm and sm.reality then words[2] = SHRIEK_WORD[sm.reality] end
  local im = mechs.inferno
  if im and im.reality then words[3] = CHAOS_WORDS.inferno[im.reality] end
  if #longParts > 0 then words[4] = table.concat(longParts, " + ")
  elseif unresolved == 0 then words[4] = "STACK" end
  local lm = mechs.csLong
  if lm and lm.reality then words[5] = SHRIEK_WORD[lm.reality] end
  -- Mana Charge/Release outcome: an element's final cast is REAL iff its charge state
  -- agrees with the release telegraph. All four states land at once when Mana Release
  -- casts — about seven seconds BEFORE the tsunami tell resolves, so show them early;
  -- once Tsunami resolves they ride along on the same line ("6 - OUT, THUNDER ...").
  local tReal, bReal
  if mana.mcT ~= nil and mana.mrT ~= nil then tReal = (mana.mcT == mana.mrT) end
  if mana.mcB ~= nil and mana.mrB ~= nil then bReal = (mana.mcB == mana.mrB) end
  local elemText
  if tReal ~= nil and bReal ~= nil then
    elemText = ", THUNDER " .. (tReal and "REAL" or "FAKE") .. ", BLIZARD " .. (bReal and "REAL" or "FAKE")
  end
  local tm = mechs.tsunami
  if tm and tm.reality then
    words[6] = CHAOS_WORDS.tsunami[tm.reality] .. (elemText or "")
  elseif elemText then
    words[6] = "THUNDER " .. (tReal and "REAL" or "FAKE") .. ", BLIZARD " .. (bReal and "REAL" or "FAKE")
  end

  local out = {}
  for i = 1, 6 do
    if words[i] then out[i] = { text = i .. " - " .. words[i], active = true }
    else out[i] = { text = i .. " -", active = false } end
  end
  return out
end

local function parseCast(raw)
  local f = splitLine(raw)
  if #f < 6 or (f[1] ~= "20" and f[1] ~= "21") then return end
  -- cast layout: f[3]=caster id, f[4]=name, f[5]=action hex, f[6]=ability name.
  local spec = CASTS[(f[5] or ""):upper()]
  if not spec or (f[4] or "") ~= spec.boss then return end
  lastActivityMs = nowMs()
  casts[f[6]] = nowMs()
  for _, key in ipairs(spec.keys) do
    local r, p = tellReality(spec.boss, nowMs())
    -- Never downgrade an already-resolved round to unknown.
    if r or not mechs[key] then
      mechs[key] = { reality=r, tellParam=p, atMs=nowMs() }
    end
  end
end

-- Mana Charge/Release cast lines anchor the sequence: BAA4's caster is the clone that
-- receives all four telegraph markers, so an earlier round's markers on it are ignored.
local function parseManaCast(raw)
  local f = splitLine(raw)
  if #f < 6 or (f[1] ~= "20" and f[1] ~= "21") then return end
  local hex = (f[5] or ""):upper()
  if not MANA_ACTION[hex] then return end
  lastActivityMs = nowMs()
  if f[1] == "20" and hex == "BAA4" then
    mana = freshMana() -- a Mana Charge cast (re)starts the sequence
    mana.holderId = f[3]
  end
end

-- Marker lines (code 27): f[3]=target id, f[7]=marker id. Only the holder's telegraph
-- markers matter. Markers arrive in fixed order per pull — thunder charge, blizzard
-- charge, then the release pair at once — so the first two fill the charge slots and
-- everything after is a release telegraph, assigned by element either way. (A log that
-- starts mid-sequence simply misses some states; the outcome stays hidden until all
-- four are known rather than guessing.)
local function parseManaMarker(raw)
  local f = splitLine(raw)
  if #f < 7 or f[1] ~= "27" then return end
  if not mana.holderId or (f[3] or "") ~= mana.holderId then return end
  local el, real = manaMarker((f[7] or ""):upper())
  if not el then return end
  lastActivityMs = nowMs()
  if not (mana.mcT ~= nil and mana.mcB ~= nil) then
    if el == "t" and mana.mcT == nil then mana.mcT = real
    elseif el == "b" and mana.mcB == nil then mana.mcB = real end
  else
    if el == "t" then mana.mrT = real else mana.mrB = real end
  end
end

onLogLine = function(raw)
  local line = raw or ""
  parsePrimaryPlayer(line)
  parseTell(line)
  parseDebuff(line)
  parseCast(line)
  parseManaCast(line)
  parseManaMarker(line)
end

local ROWS = { "cwfl", "ab", "csShort", "csLong", "inferno", "tsunami" }
local LABELS = {
  cwfl="Compressed Water / Forked Lightning",
  ab="Acceleration Bomb",
  csShort="Cursed Shriek (Short)",
  csLong="Cursed Shriek (Long)",
  inferno="Inferno",
  tsunami="Tsunami",
}

local SIZE = 14
local TITLE_SIZE = 16
local CHAR_W = SIZE * 0.62 -- monospace advance width used by the renderer
local ROW_H = 20
local FOOTER_LINE_H = 16

-- Column offsets from the panel's left edge (name column start) and its total width,
-- so the whole block can be centered in the viewer area.
local VERDICT_OFF = 336
local YOU_OFF     = 422
local PANEL_W     = 470

local function centerText(cx, text, size)
  return cx - #text * size * 0.62 / 2
end

local function verdictText(m)
  if not m then return "-", C_LABEL end
  if m.reality == "real" then return "[REAL]", C_REAL end
  if m.reality == "fake" then return "[FAKE]", C_FAKE end
  return "[???]", C_WARN
end

onFrame = function(_dt)
  local tMs = nowMs()
  for boss, t in pairs(tells) do
    if t.atMs + FRESH_TELL_MS < tMs then tells[boss] = nil end
  end
  -- Unknown mechanics keep re-checking against fresh / pre-log tells.
  for key, m in pairs(mechs) do
    if m.reality == nil then
      local r, p = tellReality(MECH_BOSSES[key], m.atMs)
      if r then m.reality, m.tellParam = r, p end
    end
  end
  for status, ent in pairs(personal) do
    if ent.reality == nil then
      local r, p = tellReality(ent.boss, ent.appliedAtMs)
      if r then ent.reality, ent.tellParam = r, p end
    end
    -- Expired well past duration and no removal line seen.
    if ent.appliedAtMs + math.floor(ent.durationS * 1000 + 0.5) < tMs - 10000 then
      personal[status] = nil
    end
  end
  for status, d in pairs(mine) do
    if d.appliedAtMs + math.floor(d.durationS * 1000 + 0.5) < tMs - 10000 then
      mine[status] = nil -- expired well past duration and no removal line seen
    end
  end

  clearCanvas()

  -- Nothing to show until a mechanic happens; once quiet for CLEAR_MS the whole
  -- round is considered resolved and clears out.
  if lastActivityMs == nil then return end
  if tMs - lastActivityMs > CLEAR_MS then resetAll(); return end

  local w, h = canvasWidth(), canvasHeight()
  local nameX = math.floor(w / 2 - PANEL_W / 2)

  -- Center the whole block (table + resolution lines) in the viewer area, but keep
  -- it clear of the top edge: fillText treats y as the baseline.
  local title = "DMU P4 - debuff tracker (you: " .. MY_NAME .. ")"
  local topH = TITLE_SIZE + 6 + #ROWS * ROW_H + 4 + FOOTER_LINE_H * 2
  local slots = resolutionSlots()
  local lineSize, pitch, leftX = 0, 0, 0
  if #slots > 0 then
    -- Fill the width for the longest line; share the leftover height across lines.
    local longest = 0
    for _, s in ipairs(slots) do
      if #s.text > longest then longest = #s.text end
    end
    lineSize = math.floor(w * 0.94 / (longest * 0.62))
    local perLine = math.floor((h - topH - 18) / (#slots * 1.35))
    if perLine < lineSize then lineSize = perLine end
    if lineSize < 24 then lineSize = 24 end
    pitch = math.floor(lineSize * 1.35)
    -- Left-align every line on the block's left edge so the window numbers stack up.
    leftX = math.floor(w / 2 - (longest * lineSize * 0.62) / 2)
  end
  local panelH = topH + (#slots > 0 and #slots * pitch or 0)
  local y = math.max(26, math.floor((h - panelH) / 2))
  drawText(title, centerText(w / 2, title, TITLE_SIZE), y, TITLE_SIZE, C_TITLE); y = y + TITLE_SIZE + 6

  for _, key in ipairs(ROWS) do
    if key == "cwfl" then
      -- Highlight whichever of the two statuses is on you.
      local a, b = "Compressed Water", "/ Forked Lightning"
      local mineA, mineB = mine["15A9"] ~= nil, mine["15A8"] ~= nil
      drawText(a, nameX, y, SIZE, mineA and C_WARN or (mineB and C_DIMMED or C_NAME))
      drawText(b, nameX + #a * CHAR_W, y, SIZE, mineB and C_WARN or (mineA and C_DIMMED or C_NAME))
    else
      drawText(LABELS[key], nameX, y, SIZE, C_NAME)
    end
    -- cwfl/ab rows show the reality pinned to YOUR debuff; global rows show
    -- the latest round.
    local m = (key == "cwfl" or key == "ab") and personalEntry(key) or mechs[key]
    local v, vc = verdictText(m)
    drawText(v, nameX + VERDICT_OFF, y, SIZE, vc)

    -- "you" indicator: which shriek class is on you + Chaos debuffs.
    local you = false
    if key == "csShort" then you = mine["15A7"] ~= nil and (mine["15A7"].durationS or 0) < 65 end
    if key == "csLong"  then you = mine["15A7"] ~= nil and (mine["15A7"].durationS or 0) >= 65 end
    if key == "inferno" then you = mine["15AB"] ~= nil end
    if key == "tsunami" then you = mine["15AC"] ~= nil end
    if you then drawText("you", nameX + YOU_OFF, y, SIZE, C_WARN) end

    y = y + ROW_H
  end
  y = y + 4

  local castList = {}
  for name in pairs(casts) do castList[#castList+1] = name end
  table.sort(castList)
  drawText("last casts: " .. (next(castList) and table.concat(castList, ", ") or "-"), nameX, y, 13, C_INFO)
  y = y + FOOTER_LINE_H

  local tellParts = {}
  for boss, t in pairs(tells) do
    tellParts[#tellParts+1] = boss .. " " .. tostring(realityOfParam(t.param)) .. " p=" .. t.param
  end
  table.sort(tellParts)
  drawText("boss tells: " .. (next(tellParts) and table.concat(tellParts, ", ") or "-"), nameX, y, 13, C_INFO)

  -- One huge line per resolution window — hard to miss at a glance. All lines
  -- share the same left edge; windows with nothing to resolve stay dimmed.
  for i, s in ipairs(slots) do
    drawText(s.text, leftX, y + 16 + (i - 1) * pitch + math.floor(lineSize * 0.9), lineSize,
      s.active and C_ACCENT or C_DIMMED)
  end
end
`,bs=`-- Kefka P3 limit cut tracker, ported from DMUP4DebuffHelper/P3LimitCutTracker.cs.
--
-- The Kefka clones cast "Ultima Blaster" (action BAE3 = 47843 in current logs; older
-- sessions used BAE4), one per consecutive octagon spot, counter-clockwise. Mirroring
-- the first clone across the arena center gives the new north; the second distinct
-- positioned clone fixes the direction players rotate (opposite to the clones). The
-- full stand table is shown as soon as both are known — after two usable casts, not eight.
--
-- C# reads caster positions from the live object table; in a log replay the movement
-- events (271 fixed layout / 261 key=value) ARE that object-table history and are exact.
-- The pair embedded in the ability line at NF-14/NF-13 is also the caster's position but
-- can be a center placeholder for some casts, so it only serves as fallback. NF-24/NF-23
-- is the TARGET player's position — never usable here (it once produced a wrong north
-- from where two players happened to stand). If the log starts mid-sequence, each
-- unpositioned cast before the first positioned one shifts the inferred start spot 45°
-- further along the firing order.
local PREVIEW_ACTIONS = { BAE3 = true, BAE4 = true } -- "Ultima Blaster" hex ids across patches
local PREVIEW_NAME = 'Ultima Blaster'                -- fallback if the id shifts in a patch
local CENTER_X, CENTER_Z = 100.0, 100.0
-- The positions embedded in these lines are not on a fixed ring, so the sanity
-- bounds stay loose: rejecting early lines starves resolution (the table only
-- appears once two usable lines have arrived).
local MIN_POS_DIST = 3.0    -- closer to center than this and the angle is mostly noise
local MAX_POS_DIST = 60.0   -- outside the arena entirely; treat as garbage
local MIN_WAYMARK_DIST = 8.0
local MAX_MARKER_ANGLE_DEG = 30.0
-- Seconds the display stays up after the last cast (matches the P4 tracker's idle clear).
local DISPLAY_FRESHNESS = 120.0
local STALE_SEQUENCE_AGE = 60.0  -- a cast this long after the previous starts a new sequence

-- Shared visual language across the example scripts — keep these in sync.
local C_TITLE  = '#ffffff'
local C_LABEL  = '#5a627e'
local C_NAME   = '#d0d0e0'
local C_BRIGHT = '#e8ecf8'
local C_INFO   = '#9fd0ff'
local C_ACCENT = '#ffd24c'
local C_REAL   = '#7dff9e'
local C_FAKE   = '#ff8f8f'
local C_WARN   = '#ffd27f'
local C_DIMMED = '#6a6a80'

-- DMU waymark preset, same as the C# original.
local WAYMARKS = {
    { label = 'A', x = 100, z = 88 },
    { label = 'B', x = 112, z = 100 },
    { label = 'C', x = 100, z = 112 },
    { label = 'D', x = 88, z = 100 },
    { label = '1', x = 94, z = 94 },
    { label = '2', x = 106, z = 94 },
    { label = '3', x = 106, z = 106 },
    { label = '4', x = 94, z = 106 },
}

local DIRS = { 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW' }

-- Waymark standing spots in the same clockwise-from-north order as DIRS:
-- A=N, 2=NE, B=E, 3=SE, C=S, 4=SW, D=W, 1=NW.
local SPOTS_BY_DIR = { 'A', '2', 'B', '3', 'C', '4', 'D', '1' }

-- --- state -----------------------------------------------------------------
local firstX, firstZ -- first positioned clone (nil until seen)
local secondSeen     -- rotation resolved once the second distinct clone casts
local lastSeen       -- now() of the last accepted cast
local newNorthLabel = ''
local markerLabel = ''
local rotation = nil -- 'CW' | 'CCW'
local anchorIdx = 0  -- 1-based index into DIRS/SPOTS_BY_DIR of the new-north spot
local cloneCount = 0
local seenKeys = {}
local posOf = {}            -- entity id -> {x, z} from movement events (the object table)
local missingBeforeFirst = 0 -- unpositioned casts before the first positioned one

-- --- math (ports of the C# statics) ----------------------------------------
local function distFromCenter(x, z)
    local dx, dz = x - CENTER_X, z - CENTER_Z
    return math.sqrt(dx * dx + dz * dz)
end

local function distXZ(ax, az, bx, bz)
    local dx, dz = ax - bx, az - bz
    return math.sqrt(dx * dx + dz * dz)
end

-- Degrees clockwise from north (north = -Z). Lua 5.3 has no math.atan2; use atan(y, x).
local function angleFromNorth(x, z)
    local deg = math.atan(x - CENTER_X, -(z - CENTER_Z)) * 180 / math.pi
    if deg < 0 then deg = deg + 360 end
    return deg
end

-- Wrap to (-180, 180].
local function normDeg(d)
    return d - 360 * math.floor((d + 180) / 360)
end

local function dirIndex(angle)
    return (math.floor((angle + 22.5) / 45) % 8) + 1 -- 1-based into DIRS
end

local function markerForAngle(northAngle)
    local bestDiff = math.huge
    local bestLabel = nil
    for _, m in ipairs(WAYMARKS) do
        if distFromCenter(m.x, m.z) >= MIN_WAYMARK_DIST then
            local diff = math.abs(normDeg(angleFromNorth(m.x, m.z) - northAngle))
            if diff < bestDiff then
                bestDiff = diff
                bestLabel = m.label
            end
        end
    end
    if not bestLabel or bestDiff > MAX_MARKER_ANGLE_DEG then return nil end
    return bestLabel
end

local function reset()
    firstX, firstZ = nil, nil
    secondSeen = false
    lastSeen = nil
    newNorthLabel = ''
    markerLabel = ''
    rotation = nil
    anchorIdx = 0
    cloneCount = 0
    seenKeys = {}
    posOf = {}
    missingBeforeFirst = 0
end

-- --- log input ---------------------------------------------------------------
-- Split on '|'. Plain string.find (not patterns): fengari's pattern matcher does not
-- backtrack greedy matches the way PUC Lua does, so gmatch-based splits are unreliable.
local function split(s)
    local out = {}
    local start = 1
    while true do
        local p = s:find('|', start, true)
        if not p then break end
        table.insert(out, s:sub(start, p - 1))
        start = p + 1
    end
    table.insert(out, s:sub(start))
    return out
end

-- Movement events rebuild the object table C# reads. 271 has a fixed layout (id at F3,
-- X/Z at F7/F8); 261 is key=value pairs after "Change|<id>".
local function rememberPosition(raw)
    local f = split(raw)
    if #f < 9 then return end
    if f[1] == '271' then
        local x, z = tonumber(f[7]), tonumber(f[8])
        if f[3] and x and z and (math.abs(x) > 0.001 or math.abs(z) > 0.001) then
            posOf[f[3]] = { x, z }
        end
    elseif f[1] == '261' and f[3] == 'Change' and f[4] then
        local x, z
        for i = 1, #f - 1 do
            if f[i] == 'PosX' then
                x = tonumber(f[i + 1])
            elseif f[i] == 'PosY' then
                z = tonumber(f[i + 1])
            end
        end
        if x and z and (math.abs(x) > 0.001 or math.abs(z) > 0.001) then
            posOf[f[4]] = { x, z }
        end
    end
end

function onLogLine(raw)
    local pipePos = raw:find('|', 1, true)
    if not pipePos then return end
    local code = raw:sub(1, pipePos - 1)
    if code == '261' or code == '271' then
        rememberPosition(raw)
        return
    end

    -- Ability lines only (21 single-target, 22 AoE share the same layout).
    if code ~= '21' and code ~= '22' then return end

    local f = split(raw)
    local nf = #f
    if nf < 30 then return end
    if not (PREVIEW_ACTIONS[f[5]] or f[6] == PREVIEW_NAME) then return end

    local t = now()
    if lastSeen and (t - lastSeen) > STALE_SEQUENCE_AGE then reset() end

    -- Dedupe by caster + global sequence: an entity may legitimately cast several
    -- times (teleporting between spots), but a redelivered line repeats both.
    local key = f[3] .. ':' .. f[nf - 10]
    if seenKeys[key] then return end
    seenKeys[key] = true

    -- Caster position: movement events first (exact ring points), else the pair embedded
    -- in the line at NF-14/NF-13, which can be a center placeholder for some casts.
    local mv = posOf[f[3]]
    local x, z
    if mv then
        x, z = mv[1], mv[2]
    else
        x, z = tonumber(f[nf - 14]), tonumber(f[nf - 13])
    end

    local positioned = false
    if x and z then
        local d = distFromCenter(x, z)
        positioned = d >= MIN_POS_DIST and d <= MAX_POS_DIST
    end
    if not positioned then
        -- No usable position. Before the first positioned cast this means the sequence
        -- started earlier than we can see (log began mid-pull); each such cast shifts
        -- the inferred start spot one octagon slot further along the firing order.
        if firstX == nil then missingBeforeFirst = missingBeforeFirst + 1 end
        return
    end

    lastSeen = t
    cloneCount = cloneCount + 1

    if firstX == nil then
        firstX, firstZ = x, z
        -- Mirror across the center is a 180° turn; each unseen earlier cast adds 45°.
        local northAngle = (angleFromNorth(x, z) + 45 * missingBeforeFirst + 180) % 360
        anchorIdx = dirIndex(northAngle)
        newNorthLabel = DIRS[anchorIdx]
        markerLabel = markerForAngle(northAngle) or ''
        return
    end

    if secondSeen then return end
    -- A different data point is enough to fix the rotation; players can stand close
    -- together, so keep this bar low. Only latch once the angle delta clears the
    -- 1° noise guard — a near-aligned pair must not poison the sequence (it used to
    -- wedge the display on "waiting for second clone" forever).
    if distXZ(x, z, firstX, firstZ) < 1.0 then return end
    local delta = normDeg(angleFromNorth(x, z) - angleFromNorth(firstX, firstZ))
    if math.abs(delta) >= 1.0 then
        secondSeen = true
        -- Players rotate opposite the clone sequence after facing new north.
        rotation = delta > 0 and 'CCW' or 'CW'
    end
end

function onChangeZone()
    reset()
end

-- A re-pull in the SAME zone never fires onChangeZone, and the 60s stale window is
-- easily crossed by a fast re-pull after a wipe. Without this, fight N's latched
-- north/rotation survives into fight N+1 — and recycled entity ids plus the per-combat
-- ability-sequence reset make seenKeys silently drop fight N+1's casts entirely.
function onCombatStart()
    reset()
end

-- --- display -------------------------------------------------------------------
local function centerText(cx, text, size)
    return cx - #text * size * 0.62 / 2
end

-- Player n (1..8) stands in a GAP between two adjacent waymarks. Walk around the ring
-- starting at the new-north marker IN THE ROTATION DIRECTION; player 1 takes the first
-- gap crossed, player 2 the next, ... The new-north marker always sits between players 8 and 1.
local function gapForPlayer(n)
    local step = (rotation == 'CW') and 1 or -1
    local m = anchorIdx - 1 -- 0-based new-north spot index
    local firstGap = (step > 0) and m or (m - 1)
    local k = (firstGap + (n - 1) * step) % 8
    return SPOTS_BY_DIR[k + 1] .. SPOTS_BY_DIR[(k + 1) % 8 + 1]
end

function onFrame(dt)
    clearCanvas()
    local t = now()
    if not lastSeen or (t - lastSeen) > DISPLAY_FRESHNESS then return end

    local w, h = canvasWidth(), canvasHeight()

    -- Shared header style with the P4 tracker: centered title at the top.
    local header = 'DMU P3 - limit cut tracker'
    drawText(header, centerText(w / 2, header, 16), 26, 16, C_TITLE)

    -- Compass rose: waymark with compass direction in parentheses around the ring,
    -- new north highlighted.
    local ccx = math.min(w * 0.30, 420)
    local ccy = h / 2
    local r = math.max(70, math.min(150, h * 0.30))

    drawRectangle(ccx - 4, ccy - 4, 8, 8, C_NAME)
    for i = 1, 8 do
        local a = (i - 1) * 45
        local px = ccx + r * math.sin(math.rad(a))
        local py = ccy - r * math.cos(math.rad(a))
        local label = SPOTS_BY_DIR[i] .. ' (' .. DIRS[i] .. ')'
        if DIRS[i] == newNorthLabel then
            drawText(label, centerText(px, label, 40), py + 14, 40, C_ACCENT)
        else
            drawText(label, centerText(px, label, 22), py + 8, 22, C_LABEL)
        end
    end

    -- Readout panel (left-aligned).
    local x0 = math.max(ccx + r + 48, w * 0.52)
    local y0 = ccy - r
    drawText('NEW NORTH', x0, y0 + 30, 22, C_LABEL)
    -- Waymark first (what the raid calls out), compass direction in parentheses.
    local northText = newNorthLabel
    if markerLabel ~= '' then
        northText = markerLabel .. ' (' .. newNorthLabel .. ')'
    end
    drawText(northText, x0, y0 + 100, 64, C_ACCENT)

    local rotY = y0 + 158
    if rotation == nil then
        drawText('waiting for second clone...', x0, rotY, 24, C_LABEL)
    else
        drawText(rotation == 'CCW' and 'Rotate CCW' or 'Rotate CW', x0, rotY, 28, C_BRIGHT)

        -- Stand list: player N stands in the gap between two waymarks ("N -> XY"),
        -- matching the raid macros. Two columns of four to stay compact.
        local listY = y0 + 200
        drawText('stand between', x0, listY, 16, C_LABEL)
        for i = 1, 8 do
            local col = (i <= 4) and x0 or (x0 + 104)
            local row = ((i - 1) % 4)
            drawText(i .. ' -> ' .. gapForPlayer(i), col, listY + 26 + row * 25, 18, C_BRIGHT)
        end
    end

    -- Footer in the same style as the P4 tracker's info lines.
    drawText('clones seen: ' .. cloneCount, x0, y0 + (rotation and 330 or 196), 13, C_INFO)
end
`,Ts=`-- DMU Phase 3 black hole tracker ("Accretion" debuff).
--
-- Right after limit cut resolves, Kefka slams a black hole onto exactly two players
-- (status "Accretion", ~14s). Their names are drawn as two huge lines in the same
-- oversized style as the P4 tracker's resolution windows; YOUR line is highlighted
-- in accent gold with a [YOU] tag.
--
-- The apply line is a plain status-apply (line 26):
--   "26|ts|<statusId>|Accretion|<dur>|E0000000||<targetId>|<targetName>|.."
-- Matched by status NAME so a patch shifting the hex id cannot starve the tracker.
-- Identity follows the P4 tracker: defaults below, overridden by type-2 lines.
--
-- This display lands while the limit-cut table is still up, so while there is anything
-- fresh to show the script holds a canvas takeover (takeoverCanvas): other scripts'
-- scenes keep updating but are not drawn until this one clears.

-- Shared visual language across the example scripts — keep these in sync.
local C_TITLE  = '#ffffff'
local C_LABEL  = '#5a627e'
local C_NAME   = '#d0d0e0'
local C_BRIGHT = '#e8ecf8'
local C_INFO   = '#9fd0ff'
local C_ACCENT = '#ffd24c'
local C_REAL   = '#7dff9e'
local C_FAKE   = '#ff8f8f'
local C_WARN   = '#ffd27f'
local C_DIMMED = '#6a6a80'

local ACCRETION_NAME = 'Accretion'
local TITLE_SIZE = 16

-- Stays up this long after the last apply line before clearing (same window as P4).
local CLEAR_MS = 120000

-- Applies inside one wave land within milliseconds of each other; separate waves are
-- minutes apart. A gap longer than this starts a new pair even if it reuses a carrier.
local NEW_WAVE_GAP_MS = 30000

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = 'Minda Silva'
local MY_ID   = '10020C04'

-- --- state -----------------------------------------------------------------
local holders = {} -- targetId -> { name=, atMs= } (the black hole pair)
local order   = {} -- targetIds in apply order; max 2
local lastActivityMs = nil

local function nowMs() return math.floor(now() * 1000 + 0.5) end

local function clearHolders()
  holders = {}
  order = {}
end

local function resetAll()
  clearHolders()
  lastActivityMs = nil
  takeoverCanvas(false)
end

-- --- log input ---------------------------------------------------------------
-- Split on '|'. Plain string.find (not patterns): fengari's pattern matcher does not
-- backtrack greedy matches the way PUC Lua does, so gmatch-based splits are unreliable.
local function split(s)
  local out = {}
  local start = 1
  while true do
    local p = s:find('|', start, true)
    if not p then break end
    table.insert(out, s:sub(start, p - 1))
    start = p + 1
  end
  table.insert(out, s:sub(start))
  return out
end

local function parsePrimaryPlayer(raw)
  local f = split(raw)
  -- IINACT line type 2: "2|ts|<charID hex>|<charName>", emitted on zone change.
  if #f < 4 or f[1] ~= '2' then return end
  if (f[3] or '') ~= '' and (f[4] or '') ~= '' then
    MY_ID, MY_NAME = f[3], f[4]
  end
end

local function isMe(id, name)
  return id == MY_ID or name == MY_NAME
end

function onLogLine(raw)
  parsePrimaryPlayer(raw)
  local f = split(raw)
  if #f < 9 then return end
  if f[1] ~= '26' or f[4] ~= ACCRETION_NAME then return end
  local id, name = f[8], f[9]
  if (id == '') or (name == '') then return end

  local tMs = nowMs()
  if lastActivityMs and (tMs - lastActivityMs) > NEW_WAVE_GAP_MS then clearHolders() end
  if holders[id] then
    holders[id].atMs = tMs -- re-apply on the same carrier: refresh only
  else
    if #order >= 2 then clearHolders() end -- a new pair starts; the old one is over
    order[#order + 1] = id
    holders[id] = { name = name, atMs = tMs }
  end
  lastActivityMs = tMs
  takeoverCanvas(true)
end

onChangeZone  = function(_zone) resetAll() end
onCombatEnd   = function(_result, _elapsedMs) resetAll() end
-- A re-pull in the same zone fires this (never onChangeZone); start clean.
onCombatStart = function() resetAll() end

-- --- display -------------------------------------------------------------------
local function centerText(cx, text, size)
  return cx - #text * size * 0.62 / 2
end

function onFrame(dt)
  clearCanvas()
  if lastActivityMs == nil then return end
  local tMs = nowMs()
  if tMs - lastActivityMs > CLEAR_MS then resetAll(); return end

  local w, h = canvasWidth(), canvasHeight()

  -- Two rows: the pair in apply order; a not-yet-seen slot waits dimmed.
  local rows = {}
  for i = 1, 2 do
    local id = order[i]
    if id and holders[id] then
      local mine = isMe(id, holders[id].name)
      rows[#rows + 1] = { text = holders[id].name .. (mine and '  [YOU]' or ''), color = mine and C_ACCENT or C_BRIGHT }
    else
      rows[#rows + 1] = { text = 'waiting...', color = C_DIMMED }
    end
  end

  -- Fill the width for the longest line; share the leftover height across lines.
  local longest = 0
  for _, r in ipairs(rows) do
    if #r.text > longest then longest = #r.text end
  end
  local lineSize = math.floor(w * 0.94 / (longest * 0.62))
  local perLine = math.floor((h - TITLE_SIZE - 18) / (2 * 1.35))
  if perLine < lineSize then lineSize = perLine end
  if lineSize < 24 then lineSize = 24 end
  local pitch = math.floor(lineSize * 1.35)
  -- Left-align both lines on the block's left edge, centered as a whole (P4 style).
  local leftX = math.floor(w / 2 - (longest * lineSize * 0.62) / 2)

  local panelH = TITLE_SIZE + 6 + 2 * pitch
  local y = math.max(26, math.floor((h - panelH) / 2))
  local title = 'DMU P3 - black hole tracker (you: ' .. MY_NAME .. ')'
  drawText(title, centerText(w / 2, title, TITLE_SIZE), y, TITLE_SIZE, C_TITLE); y = y + TITLE_SIZE + 6

  for i, r in ipairs(rows) do
    drawText(r.text, leftX, y + 16 + (i - 1) * pitch + math.floor(lineSize * 0.9), lineSize, r.color)
  end
end
`,Es=`-- DMU Phase 2 Forsaken tracker.
--
-- Latches three facts and shows them as large centered lines:
--   line 1: "<set number> <marker name> <IN|OUT>" — the current marker wave plus YOUR
--           last head marker, e.g. "3 SPREAD OUT". The first set marks all eight
--           players; later sets mark only one group of four, so most waves skip you —
--           your marker then stays at whatever it was (players in a wave can each carry
--           different icons, so the wave's icon is not yours). The counter still
--           increments on every new marker wave.
--   group:  when the FIRST wave lands, the player standing closest to you (positions
--           come from IINACT entity state lines, code 261) is compared against your
--           icon: same icon -> OUT, different -> IN. The groups swap when set 4 goes
--           out and again ~EIGHT_DELAY_MS after set 7 — the counter then advances to a
--           synthetic set 8 for the final mechanic of the cycle.
--   line 2: "PAST" or "FUTURE" — Kefka's most recent Past's End / Future's End cast.
--
-- Marker assignment lines are type 27 with the marker id in field 7:
--   "27|ts|<targetId>|<targetName>|...|<markerId>|...|<uid>"
-- Only the three Forsaken marker ids (02CB/02CC/02CD) are tracked; other marker
-- traffic is ignored. A new set begins when a player who already holds this wave's
-- markers gets marked again, or when a marker line arrives much later than the last
-- one (covers dropped lines). Redelivered copies of the same line share its trailing
-- uid and are deduped so they cannot fake a new set.
-- The cast is an ordinary ability line (type 21) matched by action name in field 6.
--
-- The display latches its values, then fades ~30s after the LAST Forsaken activity
-- (marker line or End cast) — i.e. shortly after the cycle's final marker wave — so
-- it is gone before P3 limit cut takes the canvas. It also resets on combat end /
-- zone change / re-pull, and a new marker wave reactivates it from scratch.

local C_TITLE  = '#ffffff'
local C_BRIGHT = '#e8ecf8'
local C_ACCENT = '#ffd24c'
local C_DIMMED = '#6a6a80'
local TITLE_SIZE = 16

-- PLACEHOLDER marker names — update these to the real icon names.
local MARKER_NAMES = {
  ['02CB'] = 'STACK',
  ['02CC'] = 'SPREAD',
  ['02CD'] = 'CONE',
}

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = 'Minda Silva'
local MY_ID   = '10020C04'

local PAST_CAST_NAME   = "Past's End"
local FUTURE_CAST_NAME = "Future's End"

-- Markers inside one wave land in the same tick; a line arriving this long after
-- the previous marker starts a new set even if none of its targets are marked yet.
local NEW_SET_GAP_MS = 5000

-- Fade window: waves are ~10s apart, so anything quiet for this long is past the
-- cycle's final wave (P3 is starting). Anchored on the last marker line or End cast.
local CLEAR_MS = 30000

-- The cycle's last real marker wave is set 7; the mechanic it sets up lands ~10s
-- later with no new markers. Advance the counter to a synthetic set 8 and swap the
-- groups at that point.
local EIGHT_DELAY_MS = 10000

local SEEN_UID_CAP = 8192

-- --- state -----------------------------------------------------------------
local setNumber    = 0      -- marker waves seen this combat
local setTargets   = {}     -- targetId -> true for the current wave
local myMarkerId   = nil    -- YOUR most recent marker id (persists across sets that skip you)
local lastCast     = nil    -- 'PAST' | 'FUTURE' (Kefka's latest End cast)
local lastMarkerMs = nil    -- marker lines only: feeds the new-set gap rule. Casts
                            -- land ~1s before each wave and must NOT shorten that gap.
local lastActivityMs = nil  -- markers AND casts: feeds the fade window
local seenUids     = {}
local seenUidCount = 0

-- Last-known positions from entity state lines: id -> { x=, y= }, updated on every
-- sample for the whole combat and cleared on each boundary.
local positions    = {}
local myGroup      = nil    -- 'IN' | 'OUT', assigned from the closest-player compare
local nearestId    = nil    -- pinned when the first marker wave lands
local wave1Markers = {}     -- id -> marker id for the first wave (the compare source)
local advancedTo8  = false  -- synthetic set 8 fires once per combat

local function nowMs() return math.floor(now() * 1000 + 0.5) end

local function flip(g) return g == 'IN' and 'OUT' or 'IN' end

-- The player (other than you) nearest to yours by LAST-KNOWN position. Sample age is
-- deliberately ignored: players who stand still emit no updates at all, so a sample's
-- age says nothing about staleness — it is exactly where the player stands when wave 1
-- lands. The table only ever holds this combat's entities (cleared on every boundary)
-- and only player ids (arena NPCs are 40xxxxxx), so no stray entity can win. Nil only
-- if your own position has never been seen this combat.
local function pickNearest()
  local me = positions[MY_ID]
  if me == nil or me.x == nil or me.y == nil then return nil end
  local bestId, bestD2 = nil, nil
  for id, p in pairs(positions) do
    if id ~= MY_ID and p.x ~= nil and p.y ~= nil then
      local dx = p.x - me.x
      local dy = p.y - me.y
      local d2 = dx * dx + dy * dy
      if bestD2 == nil or d2 < bestD2 then bestId, bestD2 = id, d2 end
    end
  end
  return bestId
end

local function resetAll()
  setNumber      = 0
  setTargets     = {}
  myMarkerId     = nil
  lastCast       = nil
  lastMarkerMs   = nil
  lastActivityMs = nil
  seenUids       = {}
  seenUidCount   = 0
  positions      = {}
  myGroup        = nil
  nearestId      = nil
  wave1Markers   = {}
  advancedTo8    = false
end

-- --- log input ---------------------------------------------------------------
-- Split on '|'. Plain string.find (not patterns): fengari's pattern matcher does not
-- backtrack greedy matches the way PUC Lua does, so gmatch-based splits are unreliable.
local function split(s)
  local out = {}
  local start = 1
  while true do
    local p = s:find('|', start, true)
    if not p then break end
    table.insert(out, s:sub(start, p - 1))
    start = p + 1
  end
  table.insert(out, s:sub(start))
  return out
end

local function parsePrimaryPlayer(raw)
  local f = split(raw)
  -- IINACT line type 2: "2|ts|<charID hex>|<charName>", emitted on zone change.
  if #f < 4 or f[1] ~= '2' then return end
  if (f[3] or '') ~= '' and (f[4] or '') ~= '' then
    MY_ID, MY_NAME = f[3], f[4]
  end
end

-- Assign IN/OUT by comparing YOUR icon with the closest player's first-wave icon.
-- If that player never got a wave-1 mark (should not happen — wave 1 marks everyone),
-- fall back to any other marked player once set 2 is underway.
local function tryResolveGroup()
  if myGroup ~= nil or myMarkerId == nil or nearestId == nil then return end
  local theirs = wave1Markers[nearestId]
  if theirs == nil and setNumber >= 2 then
    for id, m in pairs(wave1Markers) do
      if id ~= MY_ID then theirs = m break end
    end
  end
  if theirs ~= nil then myGroup = (theirs == myMarkerId) and 'OUT' or 'IN' end
end

function onLogLine(raw)
  parsePrimaryPlayer(raw)
  local f = split(raw)
  if #f < 7 then return end

  -- Entity state lines (code 261): "Add" snapshots and partial "Change" updates as
  -- key|value pairs; the trailing field is a line uid. Only player-ish ids are kept,
  -- so arena NPCs can never win the closest-player lookup.
  if f[1] == '261' and (f[3] == 'Add' or f[3] == 'Change') then
    local id = f[4]
    if id ~= nil and #id == 8 and id:sub(1, 2) ~= '40' then
      local p = positions[id]
      if p == nil then p = {}; positions[id] = p end
      for i = 5, #f - 1, 2 do
        if f[i] == 'PosX' or f[i] == 'PosY' then
          local v = tonumber(f[i + 1])
          if v ~= nil then
            if f[i] == 'PosX' then p.x = v else p.y = v end
          end
        end
      end
    end
    return
  end

  -- Kefka's End casts (type 21; action name is field 6).
  if f[1] == '21' then
    if f[6] == FUTURE_CAST_NAME then lastCast = 'FUTURE'; lastActivityMs = nowMs()
    elseif f[6] == PAST_CAST_NAME then lastCast = 'PAST'; lastActivityMs = nowMs() end
    return
  end

  -- Marker assignments (type 27; marker id is field 7).
  if f[1] ~= '27' then return end
  local markerId = f[7]
  if MARKER_NAMES[markerId] == nil then return end
  local targetId = f[3]
  if (targetId or '') == '' then return end

  -- Dedupe redelivered copies of the same line by its trailing uid.
  local uid = f[#f]
  if uid ~= '' then
    if seenUids[uid] then return end
    seenUids[uid] = true
    seenUidCount = seenUidCount + 1
    if seenUidCount > SEEN_UID_CAP then seenUids = {}; seenUidCount = 0 end
  end

  local tMs = nowMs()
  local gapStartsSet = lastMarkerMs ~= nil and (tMs - lastMarkerMs) > NEW_SET_GAP_MS
  if setNumber == 0 or setTargets[targetId] or gapStartsSet then
    setNumber = setNumber + 1
    setTargets = {}
    -- The first wave defines the groups: pin down who is standing next to you now,
    -- while positions are still from pre-pull positioning.
    if setNumber == 1 then nearestId = pickNearest() end
    -- Set 4 goes out with the roles swapped.
    if setNumber == 4 and myGroup ~= nil then myGroup = flip(myGroup) end
  end
  setTargets[targetId] = true
  -- Only lines targeting you change YOUR marker; sets that skip you leave it alone.
  if targetId == MY_ID or f[4] == MY_NAME then myMarkerId = markerId end
  -- Record first-wave icons for the closest-player compare (it resolves once both
  -- sides' marks have landed, which may be a few lines apart).
  if setNumber == 1 then wave1Markers[targetId] = markerId end
  tryResolveGroup()
  lastMarkerMs = tMs
  lastActivityMs = tMs
end

onChangeZone  = function(_zone) resetAll() end
onCombatEnd   = function(_result, _elapsedMs) resetAll() end
-- A re-pull in the same zone fires this (never onChangeZone); start clean.
onCombatStart = function() resetAll() end

-- --- display -------------------------------------------------------------------
local function centerText(cx, text, size)
  return cx - #text * size * 0.62 / 2
end

function onFrame(dt)
  clearCanvas()
  if setNumber == 0 and lastCast == nil then return end -- nothing latched yet

  local tMs = nowMs()

  -- The cycle's last real wave is set 7; ~EIGHT_DELAY_MS after it the counter advances
  -- to a synthetic set 8 and the groups swap one final time.
  if not advancedTo8 and setNumber == 7 then
    if lastMarkerMs ~= nil and (tMs - lastMarkerMs) >= EIGHT_DELAY_MS then
      advancedTo8 = true
      setNumber = 8
      if myGroup ~= nil then myGroup = flip(myGroup) end
    end
  end

  -- The cycle is over: quiet for CLEAR_MS means P3 has started — stop rendering so
  -- the limit-cut display (and anything else) gets the canvas back.
  if lastActivityMs ~= nil and (tMs - lastActivityMs) > CLEAR_MS then resetAll(); return end

  local w, h = canvasWidth(), canvasHeight()

  local line1, line2 = 'waiting...', 'waiting...'
  if myMarkerId ~= nil and setNumber > 0 then
    local suffix = ''
    if myGroup ~= nil then suffix = ' ' .. myGroup end
    line1 = tostring(setNumber) .. ' ' .. (MARKER_NAMES[myMarkerId] or '?') .. suffix
  end
  if lastCast ~= nil then line2 = lastCast end

  -- Fill the width for the longest line; share the leftover height across lines.
  local longest = math.max(#line1, #line2)
  local lineSize = math.floor(w * 0.94 / (longest * 0.62))
  local perLine = math.floor((h - TITLE_SIZE - 18) / (2 * 1.35))
  if perLine < lineSize then lineSize = perLine end
  if lineSize < 24 then lineSize = 24 end
  local pitch = math.floor(lineSize * 1.35)

  local panelH = TITLE_SIZE + 6 + 2 * pitch
  local y = math.max(26, math.floor((h - panelH) / 2))
  local title = 'DMU P2 - Forsaken (you: ' .. MY_NAME .. ')'
  drawText(title, centerText(w / 2, title, TITLE_SIZE), y, TITLE_SIZE, C_TITLE); y = y + TITLE_SIZE + 6

  drawText(line1, centerText(w / 2, line1, lineSize), y + 16 + math.floor(lineSize * 0.9),
    lineSize, myMarkerId ~= nil and C_BRIGHT or C_DIMMED)
  drawText(line2, centerText(w / 2, line2, lineSize), y + 16 + pitch + math.floor(lineSize * 0.9),
    lineSize, lastCast ~= nil and C_ACCENT or C_DIMMED)
end
`,ks=`-- DMU Phase 5 Celestriad element tracker (Kefka).
--
-- Kefka's "Celestriad" cast (BB42) assigns six of the eight players one of Fire /
-- Ice / Lightning Resistance Down II; two players get none. Only the INITIAL
-- assignment matters: elements rotate as the mechanic plays out, and those later
-- re-applies must not change what is shown. Displays YOUR element big —
-- FIRE / LIGHTNING / ICE, or NONE if you are one of the clean ones.

local CELESTRIAD_ACTION = "BB42" -- cast start AND land carry this action hex

-- Element per status; hex first, display name as a fallback in case a patch
-- renumbers them. (An earlier phase also applies Lightning Resistance Down II —
-- same status BB6 — so these lines are only ever read while Celestriad is armed.)
local STATUS_ELEMENT = {
  B56 = "FIRE",      ["Fire Resistance Down II"] = "FIRE",
  B57 = "ICE",       ["Ice Resistance Down II"] = "ICE",
  BB6 = "LIGHTNING", ["Lightning Resistance Down II"] = "LIGHTNING",
}

-- All six initial applies land in the same instant as the ability, so once six
-- distinct players are assigned the wave is complete and anyone left out is clean.
local EXPECTED_DEBUFFED = 6
-- Safety net: if a line is dropped and the count never reaches six, finalize
-- anyway this long after the cast (the applies always land at or just after it).
local ARM_WINDOW_MS = 8000

-- Shared visual language across the example scripts — keep these in sync.
local C_TITLE  = "#ffffff"
local C_BRIGHT = "#e8ecf8"
local C_ACCENT = "#ffd24c"
local C_REAL   = "#7dff9e"
local C_DIMMED = "#6a6a80"

-- Identity defaults. A ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change) overrides these while the log is streaming;
-- if no such line ever arrives we just track the default player below.
local MY_NAME = "Minda Silva"
local MY_ID   = "10020C04"

local armedAtMs = nil -- when Celestriad's cast was first seen (nil = not in mechanic)
local assignments = {} -- playerId -> element of their FIRST apply only
local mineElement = nil -- your resolved word: FIRE / LIGHTNING / ICE / NONE

function resetAll()
  armedAtMs = nil
  assignments = {}
  mineElement = nil
end

-- onCombatStart covers the case where a fight ends without a defeat/victory line we
-- see (stream hiccup): every new pull starts from clean state regardless.
onChangeZone    = function(_zone) resetAll() end
onCombatEnd     = function(_result, _elapsedMs) resetAll() end
onCombatStart   = function() resetAll() end

local function nowMs() return math.floor(now() * 1000 + 0.5) end

-- NOTE: Lua's gmatch("[^|]+") silently DROPS empty fields between "||",
-- shifting every later index. Split on literal "|" preserving empties.
local function splitLine(raw)
  local parts, start = {}, 1
  while true do
    local i = raw:find("|", start, true)
    if not i then break end
    parts[#parts+1] = raw:sub(start, i - 1)
    start = i + 1
  end
  parts[#parts+1] = raw:sub(start)
  return parts
end

local function parsePrimaryPlayer(raw)
  local f = splitLine(raw)
  -- IINACT line type 2: "2|ts|<charID hex>|<charName>", emitted on zone change.
  if #f < 4 or f[1] ~= "2" then return end
  if (f[3] or "") ~= "" and (f[4] or "") ~= "" then
    MY_ID, MY_NAME = f[3], f[4]
  end
end

local function isMe(id, name)
  return id == MY_ID or name == MY_NAME
end

-- Celestriad's cast line arms the tracker. A second round later in the fight re-arms
-- once we are past the window; the land line (21) arriving ~5s after the cast start
-- (20) must NOT clear assignments that already landed with it.
local function parseCast(raw)
  local f = splitLine(raw)
  if #f < 6 or (f[1] ~= "20" and f[1] ~= "21") then return end
  if (f[5] or ""):upper() ~= CELESTRIAD_ACTION then return end
  if not armedAtMs or nowMs() - armedAtMs > ARM_WINDOW_MS then
    armedAtMs = nowMs()
    assignments = {}
    mineElement = nil
  end
end

local function parseDebuff(raw)
  local f = splitLine(raw)
  if #f < 9 or f[1] ~= "26" then return end
  local element = STATUS_ELEMENT[(f[3] or ""):upper()] or STATUS_ELEMENT[f[4]]
  if not element then return end
  -- Only the initial wave counts: outside the arm window this is either an earlier
  -- phase's Lightning Resistance Down II or a mid-mechanic rotation re-apply.
  if not armedAtMs or nowMs() - armedAtMs > ARM_WINDOW_MS then return end

  local targetId, targetName = f[8], f[9]
  if isMe(targetId, targetName) and mineElement == nil then
    mineElement = element -- your initial assignment resolves the display immediately
  end
  if not assignments[targetId] then assignments[targetId] = element end
end

onLogLine = function(raw)
  local line = raw or ""
  parsePrimaryPlayer(line)
  parseCast(line)
  parseDebuff(line)
end

local TITLE_SIZE = 16
local PENDING_SIZE = 48

-- Monospace advance width used by the renderer.
local function centerText(cx, text, size)
  return cx - #text * size * 0.62 / 2
end

onFrame = function(_dt)
  clearCanvas()
  if armedAtMs == nil then return end

  local t = nowMs()
  -- You got no element: the word is NONE once the wave has completed (six distinct
  -- players assigned) or the arm window lapsed without your apply line arriving.
  if mineElement == nil then
    local n = 0
    for _ in pairs(assignments) do n = n + 1 end
    if n >= EXPECTED_DEBUFFED or t - armedAtMs > ARM_WINDOW_MS then
      mineElement = "NONE"
    end
  end

  local w, h = canvasWidth(), canvasHeight()
  local title = "DMU P5 - Celestriad (you: " .. MY_NAME .. ")"
  drawText(title, centerText(w / 2, title, TITLE_SIZE), math.max(26, 10 + TITLE_SIZE), TITLE_SIZE, C_TITLE)

  if mineElement then
    -- One huge centered word; sized to fit the width (longest is LIGHTNING).
    local size = math.floor(w * 0.9 / (#mineElement * 0.62))
    if size > h * 0.75 then size = math.floor(h * 0.75) end
    -- NONE means you are clean — green so it reads as "you're safe" at a glance.
    local color = mineElement == "NONE" and C_REAL or C_ACCENT
    drawText(mineElement, centerText(w / 2, mineElement, size), math.floor(h / 2 + size * 0.35), size, color)
  else
    -- Still resolving: a dimmed placeholder so the tracker is visibly waiting.
    drawText("?", centerText(w / 2, "?", PENDING_SIZE), math.floor(h / 2 + PENDING_SIZE * 0.35), PENDING_SIZE, C_DIMMED)
  end
end
`,dl=[{name:"dmu-p4-debuffs.lua",code:ms},{name:"dmu-p3-limit-cut.lua",code:bs},{name:"dmu-p3-blackhole.lua",code:Ts},{name:"dmu-p2-forsaken.lua",code:Es},{name:"dmu-p5-celestriad.lua",code:ks}],Oa=new ns,Sa=document.getElementById("draw-canvas"),hn=Sa.getContext("2d");function Or(){const d=Sa.parentElement.getBoundingClientRect();return[d.width,d.height]}const pn=new As(Or),vr=document.getElementById("player-name"),Os=document.getElementById("zone-name"),vs=document.getElementById("combat-time"),lr=document.getElementById("combat-state"),wr=document.getElementById("app"),Ba=document.getElementById("sidebar-toggle"),yr="ffxiv-raid-viewer-player-name";function ws(d){vr.textContent=d;try{localStorage.setItem(yr,d)}catch{}}try{const d=localStorage.getItem(yr);d&&(vr.textContent=d)}catch{}const rr=document.getElementById("conn-status"),ys=document.getElementById("msg-count"),Ss=document.getElementById("ws-url"),Sr=document.getElementById("connect-btn"),sr=document.getElementById("log-file"),Ns=document.getElementById("file-label"),xs=document.getElementById("replay-speed"),hl=document.getElementById("replay-btn"),Ka=document.getElementById("replay-status"),sl=document.getElementById("event-list"),ol=document.getElementById("lua-file"),Fa=document.getElementById("script-list"),zn=document.getElementById("lua-error"),Rs={[jn.Idle]:"Idle",[jn.Combat]:"In Combat",[jn.Defeated]:"Wiped",[jn.Victory]:"Victory"};function Nr(){vs.textContent=fl(Oa.elapsedMs()),lr.textContent=Rs[Oa.state]??Oa.state,lr.dataset.state=Oa.state}function Wn(d){const o=document.createElement("li"),m=new Date().toLocaleTimeString();for(o.innerHTML=`<span class="stamp">${m}</span> ${d}`,sl.prepend(o);sl.children.length>50;)sl.lastChild.remove()}const Is=ss();function Ms(d){const o=ur(d);o&&xr(o,d)}function xr(d,o){const m=Is(d);if(m){const N=new Date(m.timestampMs).toISOString();if(m.kind==="base-reset")console.info(`[gap] ${N} action-seq base reset +${m.jump} (combat start)`);else{const U=`${N} action-seq +${m.jump} (${m.from.toString(16)} -> ${m.to.toString(16)}) — ~${m.jump} cast line(s) missing`;m.jump>=8?console.warn("[gap]",U):console.info("[gap]",U)}}const E=Oa.handleLine(d);if(E)if(E.kind==="start")Wn("Combat started"),pn.onCombatStart();else if(E.kind==="end"){const N=E.result==="defeat"?"Wiped":"Victory";Wn(`Combat ended — ${N} (${fl(E.elapsedMs)})`),pn.onCombatEnd(E.result,E.elapsedMs)}else E.kind==="zone-reset"&&Wn("Combat reset — zone change");if(d.type===va.ChangeZone){const N=d.fields[1];N&&(Os.textContent=N,pn.onChangeZone(N))}else if(d.type===va.PlayerName){const N=d.fields[1];N&&ws(N)}pn.onLogLine(o)}const Ca=new as({onLogLine:Ms,onMessageCount:d=>{ys.textContent=d?`${d.toLocaleString()} lines`:""},onState:d=>{rr.dataset.state=d,rr.textContent=d[0].toUpperCase()+d.slice(1),Sr.textContent=Ca.connected?"Disconnect":"Connect"}}),or=new Map;function Us(d){if(d.type==="text")hn.font=`${d.size}px monospace`,hn.fillStyle=d.color,hn.fillText(d.text,d.x,d.y);else if(d.type==="rect")hn.fillStyle=d.fill,hn.fillRect(d.x,d.y,d.w,d.h);else if(d.type==="image"){let o=or.get(d.src);o||(o=new Image,o.src=d.src,or.set(d.src,o)),o.complete&&o.naturalWidth>0&&(d.w!==null&&d.h!==null?hn.drawImage(o,d.x,d.y,d.w,d.h):hn.drawImage(o,d.x,d.y))}}function Rr(){const d=window.devicePixelRatio||1,o=Sa.parentElement.getBoundingClientRect();Sa.width=Math.max(1,Math.floor(o.width*d)),Sa.height=Math.max(1,Math.floor(o.height*d)),hn.setTransform(d,0,0,d,0,0)}function Cs(){const[d,o]=Or();hn.clearRect(0,0,d,o);for(const{scene:m}of pn.scenes())for(const E of m)Us(E);pn.size===0&&Oa.running&&(hn.save(),hn.globalAlpha=.35,hn.fillStyle="#cfd8ff",hn.font="28px monospace",hn.fillText(fl(Oa.elapsedMs()),16,o-16),hn.restore())}let ya=0,ul=null,Ir=!1;const Ps=d=>new Promise(o=>setTimeout(o,d));function Ga(d){Ir=d,hl.textContent=d?"Stop":"Replay"}async function Ds(d){const o=++ya;Ca.disconnect(),Ga(!0);const m=[];for(const N of d.split(`
`)){if(!N.trim())continue;const U=ur(N);U&&!Number.isNaN(U.timestampMs)&&m.push({parsed:U,raw:N})}m.sort((N,U)=>N.parsed.timestampMs-U.parsed.timestampMs),Ka.textContent=`${m.length.toLocaleString()} lines`,Wn(`Replay started (${m.length.toLocaleString()} lines)`);let E=null;for(const{parsed:N,raw:U}of m){if(o!==ya)return;const $=Number(xs.value)||1;if(E!==null){const ge=Math.max(0,(N.timestampMs-E)/$);if(ge>0&&await Ps(ge),o!==ya)return}E=N.timestampMs,xr(N,U)}o===ya&&(Ga(!1),Ka.textContent="done",Wn("Replay finished"))}const Mr="ffxiv-raid-viewer-lua-scripts";function Bs(){const d=()=>({custom:new Map,enabled:new Map});let o=null;try{const N=localStorage.getItem(Mr);N&&(o=JSON.parse(N))}catch{}if(!o||typeof o!="object"||Array.isArray(o))return d();const m=d();if(typeof o.custom=="object"&&o.custom!==null){for(const[N,U]of Object.entries(o.custom))typeof U=="string"&&m.custom.set(N,U);if(o.enabled&&typeof o.enabled=="object")for(const[N,U]of Object.entries(o.enabled))typeof U=="boolean"&&m.enabled.set(N,U);return m}const E=new Set(dl.map(N=>N.name));for(const[N,U]of Object.entries(o))typeof U=="string"&&!E.has(N)&&m.custom.set(N,U);return m}const qn=Bs();function Va(){try{localStorage.setItem(Mr,JSON.stringify({custom:Object.fromEntries(qn.custom),enabled:Object.fromEntries(qn.enabled)}))}catch(d){Wn(`Could not save scripts to localStorage: ${d.message}`)}}const Pa=document.createElement("li");Pa.className="script-section";Pa.textContent="Built-in";let da=null;function cl(d,o,{builtin:m=!1,enabled:E=!0}={}){const N=document.createElement("li");N.dataset.scriptId=String(d),m&&(N.dataset.builtin="true");const U=document.createElement("input");U.type="checkbox",U.className="script-toggle",U.checked=E,U.title=m?"Built-in script — enable or disable":"Enable or disable script",U.addEventListener("change",()=>{pn.setEnabled(d,U.checked),qn.enabled.set(o,U.checked),Va(),N.classList.toggle("script-disabled",!U.checked)});const $=document.createElement("span");if($.className="script-name",$.textContent=o,N.append(U,$),!m){const ge=document.createElement("button");ge.className="script-remove",ge.title="Remove script",ge.textContent="✕",ge.addEventListener("click",()=>{pn.remove(d),N.remove(),pn.scripts().some(ie=>ie.name===o)||(qn.custom.delete(o),qn.enabled.delete(o),Va()),Ks(),Wn(`Script removed: ${o}`)}),N.appendChild(ge)}return E||(pn.setEnabled(d,!1),N.classList.add("script-disabled")),N}function Ks(){![...Fa.querySelectorAll("li[data-script-id]")].some(o=>!o.dataset.builtin)&&da&&(da.remove(),da=null)}function Ur(d){da||(da=document.createElement("li"),da.className="script-section",da.textContent="Custom",Pa.before(da)),Pa.before(d)}function Fs(){let d=null;for(const o of pn.scripts()){const m=Fa.querySelector(`li[data-script-id="${o.id}"]`);m&&(m.classList.toggle("script-error",!!o.lastError),o.lastError&&!d&&(d=o))}d?(zn.hidden=!1,zn.textContent=`${d.name}: ${d.lastError}`):(zn.hidden=!0,zn.textContent="")}const Gs=new Set(dl.map(d=>d.name));ol.addEventListener("change",async()=>{for(const d of[...ol.files??[]]){if(Gs.has(d.name)){zn.hidden=!1,zn.textContent=`${d.name} ships with the app — toggle it in the list below`;continue}const o=await d.text(),m=pn.add(d.name,o);m.ok?(qn.custom.set(d.name,o),Va(),Ur(cl(m.id,d.name)),Wn(`Script loaded: ${d.name}`)):(zn.hidden=!1,zn.textContent=`${d.name}: ${m.error}`,Wn(`Script failed to load: ${d.name}`))}ol.value=""});(function(){Fa.appendChild(Pa);let o=0;for(const[m,E]of[...qn.custom]){const N=pn.add(m,E);N.ok?(Ur(cl(N.id,m,{enabled:qn.enabled.get(m)??!0})),o++):qn.custom.delete(m)}for(const m of dl){const E=pn.add(m.name,m.code);if(!E.ok){zn.hidden=!1,zn.textContent=`${m.name}: ${E.error}`;continue}Fa.appendChild(cl(E.id,m.name,{builtin:!0,enabled:qn.enabled.get(m.name)??!0}))}Va(),o>0&&Wn(`Restored ${o} custom script(s) from localStorage`)})();Sr.addEventListener("click",()=>{if(ya++,Ga(!1),Ca.connected){Ca.disconnect();return}Ka.textContent="",Ca.connect(Ss.value.trim())});sr.addEventListener("change",async()=>{var o;const d=(o=sr.files)==null?void 0:o[0];d&&(Ns.textContent=`${d.name} (${(d.size/1e6).toFixed(1)} MB)`,hl.disabled=!1,ul=await d.text())});hl.addEventListener("click",()=>{if(Ir){ya++,Ga(!1),Ka.textContent="stopped";return}ul&&Ds(ul)});let il=null,ir=0;function Cr(d){const o=il===null?0:Math.min(.25,(d-il)/1e3);il=d,Nr(),pn.frame(o),d>=ir&&(Fs(),ir=d+1e3),Cs(),requestAnimationFrame(Cr)}new ResizeObserver(Rr).observe(Sa.parentElement);Rr();const Pr="ffxiv-raid-viewer-sidebar-collapsed";function Dr(d){wr.classList.toggle("sidebar-collapsed",d),Ba.textContent=d?"▶":"◀",Ba.title=d?"Expand sidebar":"Collapse sidebar",Ba.setAttribute("aria-expanded",String(!d));try{localStorage.setItem(Pr,d?"1":"0")}catch{}}Ba.addEventListener("click",()=>{Dr(!wr.classList.contains("sidebar-collapsed"))});let Br=!1;try{Br=localStorage.getItem(Pr)==="1"}catch{}Dr(Br);Nr();requestAnimationFrame(Cr);
