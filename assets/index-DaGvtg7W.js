(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const S of document.querySelectorAll('link[rel="modulepreload"]'))T(S);new MutationObserver(S=>{for(const R of S)if(R.type==="childList")for(const $ of R.addedNodes)$.tagName==="LINK"&&$.rel==="modulepreload"&&T($)}).observe(document,{childList:!0,subtree:!0});function A(S){const R={};return S.integrity&&(R.integrity=S.integrity),S.referrerPolicy&&(R.referrerPolicy=S.referrerPolicy),S.crossOrigin==="use-credentials"?R.credentials="include":S.crossOrigin==="anonymous"?R.credentials="omit":R.credentials="same-origin",R}function T(S){if(S.ep)return;S.ep=!0;const R=A(S);fetch(S.href,R)}})();const va={LogMessage:0,ChangeZone:1,PlayerName:2,NetworkAbility:21,NetworkAOEAbility:22,ActorControl:33},Jr={Damage:29};function Qr(f){if(!f||f.type!==va.LogMessage)return!1;const s=Number(f.fields[0]);return!Number.isNaN(s)&&s===Jr.Damage}const Al={defeat:new Set(["40000005","4000000F","40000010"]),victory:new Set(["40000002","40000003"])};function cr(f){if(typeof f!="string")return null;const s=f.indexOf("|");if(s<=0)return null;const A=f.slice(0,s);if(!/^\d+$/.test(A))return null;const T=f.split("|");if(T.length<2)return null;const S=es(T[1]);return{type:Number(A),typeStr:A,timestampMs:S,fields:T.slice(2),raw:f}}function es(f){if(typeof f!="string")return NaN;const s=f.replace(/(\.\d{3})\d+/,"$1"),A=Date.parse(s);return Number.isNaN(A)?NaN:A}function ts(f){return!f||f.type!==va.ActorControl?null:f.fields[1]??null}function ns(f){const s=ts(f);return s?Al.defeat.has(s)?"defeat":Al.victory.has(s)?"victory":null:null}const zn={Idle:"idle",Combat:"combat",Defeated:"defeat",Victory:"victory"},as=5e3;class ls{constructor(s=()=>Date.now()){this._now=s,this.reset()}reset(){this.state=zn.Idle,this.startTimeMs=null,this.endTimeMs=null,this.finalElapsedMs=0,this.lastEndMs=null}get running(){return this.state===zn.Combat}elapsedMs(s){if(this.running){const A=s??this._now();return Math.max(0,A-this.startTimeMs)}return this.finalElapsedMs}handleLine(s){if(!s)return null;if(s.type===va.ChangeZone&&this.state!==zn.Idle)return this.reset(),{kind:"zone-reset"};if(this.running){const A=ns(s);if(A){const T=this._now();return this.state=A==="defeat"?zn.Defeated:zn.Victory,this.endTimeMs=T,this.finalElapsedMs=Math.max(0,T-this.startTimeMs),this.lastEndMs=T,{kind:"end",result:A,elapsedMs:this.finalElapsedMs}}return null}if(Qr(s)){const A=this._now();return this.lastEndMs!==null&&A-this.lastEndMs<as?null:(this.startTimeMs=A,this.state=zn.Combat,{kind:"start"})}return null}}function fl(f){const s=Math.max(0,f),A=Math.floor(s/100),T=A%10,S=Math.floor(A/10),R=S%60;return`${Math.floor(S/60)}:${String(R).padStart(2,"0")}.${T}`}class rs{constructor({onLogLine:s,onState:A,onMessageCount:T}){this._onLogLine=s,this._onState=A??(()=>{}),this._onMessageCount=T??(()=>{}),this.ws=null,this.url=null,this._shouldRun=!1,this._retryDelayMs=1e3,this._retryTimer=null}connect(s){this.url=s,this._shouldRun=!0,this._open()}disconnect(){if(this._shouldRun=!1,clearTimeout(this._retryTimer),this.ws){this.ws.onclose=null;try{this.ws.close()}catch{}this.ws=null}this._setState("disconnected")}get connected(){return!!this.ws&&this.ws.readyState===WebSocket.OPEN}_open(){if(!this.url||!this._shouldRun)return;this._setState("connecting");let s;try{s=new WebSocket(this.url)}catch(A){console.error("Invalid websocket URL:",A),this._scheduleRetry();return}this.ws=s,s.onopen=()=>{this._retryDelayMs=1e3,this._msgCount=0,this._onMessageCount(0),this._setState("connected");try{s.send(JSON.stringify({call:"subscribe",events:["LogLine"]}))}catch(A){console.error("Failed to send subscribe:",A)}},s.onmessage=A=>this._handleMessage(A.data),s.onerror=()=>{},s.onclose=()=>{this.ws===s&&(this.ws=null,this._setState("disconnected"),this._shouldRun&&this._scheduleRetry())}}_handleMessage(s){this._msgCount=(this._msgCount??0)+1,this._onMessageCount(this._msgCount);let A=null;const T=typeof s=="string"?s:"";try{const S=JSON.parse(T);S&&typeof S.rawLine=="string"?A=S.rawLine:Array.isArray(S.line)&&S.line.length>=2&&(A=S.line.join("|"))}catch{A=T.includes("|")?T:null}A&&this._onLogLine?(this._badMsgs=0,this._onLogLine(A)):(this._badMsgs=(this._badMsgs??0)+1,(this._badMsgs===1||this._badMsgs%500===0)&&console.warn(`[ws] ${this._badMsgs} message(s) without a usable line:`,String(s).slice(0,160)))}_scheduleRetry(){clearTimeout(this._retryTimer),this._setState("reconnecting");const s=this._retryDelayMs;this._retryDelayMs=Math.min(this._retryDelayMs*2,1e4),console.warn(`[ws] reconnecting in ${s}ms`,new Date().toISOString()),this._retryTimer=setTimeout(()=>this._open(),s)}_setState(s){if(this._lastState!==s){const A=this._lastState??"idle";console.info(`[ws] ${A} -> ${s}`,new Date().toISOString()),this._lastState=s,this._onState(s)}}}const ss=/^[0-9a-fA-F]{4,8}$/i,os=1e3;function is(){let f=null;return function(A){if(A.type!==va.NetworkAbility&&A.type!==va.NetworkAOEAbility)return null;const T=A.fields;if(T.length!==53)return null;const S=T[T.length-11];if(!ss.test(S))return null;const R=Number.parseInt(S,16);if(f===null||R<=f)return f=R,null;const $=R-f;return f=R,$<=1?null:{kind:$>=os?"base-reset":"gap",from:f-$,to:R,jump:$,timestampMs:A.timestampMs}}}function us(f){return f&&f.__esModule&&Object.prototype.hasOwnProperty.call(f,"default")?f.default:f}var Qt={},an={},Tt={},Wt={},bl;function vn(){if(bl)return Wt;bl=1;const f={},{LUA_VERSION_MAJOR:s,LUA_VERSION_MINOR:A,to_luastring:T}=rn(),S=";";Wt.LUA_PATH_SEP=S;const R="?";Wt.LUA_PATH_MARK=R;const $="!";Wt.LUA_EXEC_DIR=$;const ge=s+"."+A;Wt.LUA_VDIR=ge;{Wt.LUA_DIRSEP="/";const I="./lua/"+ge+"/";Wt.LUA_LDIR=I;const Oe=I;Wt.LUA_JSDIR=Oe;const Ae=T(I+"?.lua;"+I+"?/init.lua;./?.lua;./?/init.lua");Wt.LUA_PATH_DEFAULT=Ae;const W=T(Oe+"?.js;"+Oe+"loadall.js;./?.js");Wt.LUA_JSPATH_DEFAULT=W}const le=f.LUA_COMPAT_FLOATSTRING||!1,Se=2147483647,q=-2147483648,Z=f.LUAI_MAXSTACK||1e6,Q=f.LUA_IDSIZE||59,Te=function(ae){return String(ae)},J=function(ae){return String(Number(ae.toPrecision(14)))},Me=function(ae){return ae>=q&&ae<-q?ae:!1},Le="",ye="",Ke=`%${Le}d`,ut="%.14g",xe=function(){return 46},Ue=f.LUAL_BUFFERSIZE||8192,Pe=function(ae){if(ae===0)return[ae,0];var I=new DataView(new ArrayBuffer(8));I.setFloat64(0,ae);var Oe=I.getUint32(0)>>>20&2047;Oe===0&&(I.setFloat64(0,ae*Math.pow(2,64)),Oe=(I.getUint32(0)>>>20&2047)-64);var Ae=Oe-1022,W=ce(ae,-Ae);return[W,Ae]},ce=function(ae,I){for(var Oe=Math.min(3,Math.ceil(Math.abs(I)/1023)),Ae=ae,W=0;W<Oe;W++)Ae*=Math.pow(2,Math.floor((I+W)/Oe));return Ae};return Wt.LUAI_MAXSTACK=Z,Wt.LUA_COMPAT_FLOATSTRING=le,Wt.LUA_IDSIZE=Q,Wt.LUA_INTEGER_FMT=Ke,Wt.LUA_INTEGER_FRMLEN=Le,Wt.LUA_MAXINTEGER=Se,Wt.LUA_MININTEGER=q,Wt.LUA_NUMBER_FMT=ut,Wt.LUA_NUMBER_FRMLEN=ye,Wt.LUAL_BUFFERSIZE=Ue,Wt.frexp=Pe,Wt.ldexp=ce,Wt.lua_getlocaledecpoint=xe,Wt.lua_integer2str=Te,Wt.lua_number2str=J,Wt.lua_numbertointeger=Me,Wt}var Tl;function rn(){if(Tl)return Tt;Tl=1;let f;typeof Uint8Array.from=="function"?f=Uint8Array.from.bind(Uint8Array):f=function(ve){let K=0,M=ve.length,O=new Uint8Array(M);for(;M>K;)O[K]=ve[K++];return O};let s;if(typeof new Uint8Array().indexOf=="function")s=function(ve,K,M){return ve.indexOf(K,M)};else{let ve=[].indexOf;if(ve.call(new Uint8Array(1),0)!==0)throw Error("missing .indexOf");s=function(K,M,O){return ve.call(K,M,O)}}let A;typeof Uint8Array.of=="function"?A=Uint8Array.of.bind(Uint8Array):A=function(){return f(arguments)};const T=function(ve){return ve instanceof Uint8Array},S=function(ve,K){if(ve!==K){let M=ve.length;if(M!==K.length)return!1;for(let O=0;O<M;O++)if(ve[O]!==K[O])return!1}return!0},R="cannot convert invalid utf8 to javascript string",$=function(ve,K,M,O){if(!T(ve))throw new TypeError("to_jsstring expects a Uint8Array");M===void 0?M=ve.length:M=Math.min(ve.length,M);let m="";for(let g=K!==void 0?K:0;g<M;){let w=ve[g++];if(w<128)m+=String.fromCharCode(w);else if(w<194||w>244){if(!O)throw RangeError(R);m+="�"}else if(w<=223){if(g>=M){if(!O)throw RangeError(R);m+="�";continue}let B=ve[g++];if((B&192)!==128){if(!O)throw RangeError(R);m+="�";continue}m+=String.fromCharCode(((w&31)<<6)+(B&63))}else if(w<=239){if(g+1>=M){if(!O)throw RangeError(R);m+="�";continue}let B=ve[g++];if((B&192)!==128){if(!O)throw RangeError(R);m+="�";continue}let ue=ve[g++];if((ue&192)!==128){if(!O)throw RangeError(R);m+="�";continue}let ot=((w&15)<<12)+((B&63)<<6)+(ue&63);if(ot<=65535)m+=String.fromCharCode(ot);else{ot-=65536;let st=(ot>>10)+55296,Fe=ot%1024+56320;m+=String.fromCharCode(st,Fe)}}else{if(g+2>=M){if(!O)throw RangeError(R);m+="�";continue}let B=ve[g++];if((B&192)!==128){if(!O)throw RangeError(R);m+="�";continue}let ue=ve[g++];if((ue&192)!==128){if(!O)throw RangeError(R);m+="�";continue}let ot=ve[g++];if((ot&192)!==128){if(!O)throw RangeError(R);m+="�";continue}let st=((w&7)<<18)+((B&63)<<12)+((ue&63)<<6)+(ot&63);st-=65536;let Fe=(st>>10)+55296,y=st%1024+56320;m+=String.fromCharCode(Fe,y)}}return m},ge=";,/?:@&=+$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,-_.!~*'()#".split("").reduce(function(ve,K){return ve[K.charCodeAt(0)]=!0,ve},{}),le=function(ve){if(!T(ve))throw new TypeError("to_uristring expects a Uint8Array");let K="";for(let M=0;M<ve.length;M++){let O=ve[M];ge[O]?K+=String.fromCharCode(O):K+="%"+(O<16?"0":"")+O.toString(16)}return K},Se={},q=function(ve,K){if(typeof ve!="string")throw new TypeError("to_luastring expects a javascript string");if(K){let g=Se[ve];if(T(g))return g}let M=ve.length,O=Array(M),m=0;for(let g=0;g<M;++g){let w=ve.charCodeAt(g);if(w<=127)O[m++]=w;else if(w<=2047)O[m++]=192|w>>6,O[m++]=128|w&63;else{if(w>=55296&&w<=56319&&g+1<M){let B=ve.charCodeAt(g+1);B>=56320&&B<=57343&&(g++,w=(w-55296)*1024+B+9216)}w<=65535?(O[m++]=224|w>>12,O[m++]=128|w>>6&63,O[m++]=128|w&63):(O[m++]=240|w>>18,O[m++]=128|w>>12&63,O[m++]=128|w>>6&63,O[m++]=128|w&63)}}return O=f(O),K&&(Se[ve]=O),O},Z=function(ve){if(!T(ve))if(typeof ve=="string")ve=q(ve);else throw new TypeError("expects an array of bytes or javascript string");return ve};Tt.luastring_from=f,Tt.luastring_indexOf=s,Tt.luastring_of=A,Tt.is_luastring=T,Tt.luastring_eq=S,Tt.to_jsstring=$,Tt.to_uristring=le,Tt.to_luastring=q,Tt.from_userstring=Z;const Q=q("\x1BLua"),Te="5",J="3",Me=503,Le="4",ye="Lua "+Te+"."+J,Ke=ye+"."+Le,ut=Ke+"  Copyright (C) 1994-2017 Lua.org, PUC-Rio",xe="R. Ierusalimschy, L. H. de Figueiredo, W. Celes";Tt.LUA_SIGNATURE=Q,Tt.LUA_VERSION_MAJOR=Te,Tt.LUA_VERSION_MINOR=J,Tt.LUA_VERSION_NUM=Me,Tt.LUA_VERSION_RELEASE=Le,Tt.LUA_VERSION=ye,Tt.LUA_RELEASE=Ke,Tt.LUA_COPYRIGHT=ut,Tt.LUA_AUTHORS=xe;const Ue={LUA_OK:0,LUA_YIELD:1,LUA_ERRRUN:2,LUA_ERRSYNTAX:3,LUA_ERRMEM:4,LUA_ERRGCMM:5,LUA_ERRERR:6},Pe={LUA_TNONE:-1,LUA_TNIL:0,LUA_TBOOLEAN:1,LUA_TLIGHTUSERDATA:2,LUA_TNUMBER:3,LUA_TSTRING:4,LUA_TTABLE:5,LUA_TFUNCTION:6,LUA_TUSERDATA:7,LUA_TTHREAD:8,LUA_NUMTAGS:9};Pe.LUA_TSHRSTR=Pe.LUA_TSTRING|0,Pe.LUA_TLNGSTR=Pe.LUA_TSTRING|16,Pe.LUA_TNUMFLT=Pe.LUA_TNUMBER|0,Pe.LUA_TNUMINT=Pe.LUA_TNUMBER|16,Pe.LUA_TLCL=Pe.LUA_TFUNCTION|0,Pe.LUA_TLCF=Pe.LUA_TFUNCTION|16,Pe.LUA_TCCL=Pe.LUA_TFUNCTION|32;const ce=0,ae=1,I=2,Oe=3,Ae=4,W=5,_e=6,H=7,D=8,Ce=9,we=10,je=11,de=12,Ye=13,$e=0,x=1,Y=2,X=20,{LUAI_MAXSTACK:he}=vn(),ee=-he-1e3,ne=function(ve){return ee-ve},ze=1,nt=2,at=nt;class ft{constructor(){this.event=NaN,this.name=null,this.namewhat=null,this.what=null,this.source=null,this.currentline=NaN,this.linedefined=NaN,this.lastlinedefined=NaN,this.nups=NaN,this.nparams=NaN,this.isvararg=NaN,this.istailcall=NaN,this.short_src=null,this.i_ci=null}}const ct=0,ht=1,pt=2,Et=3,bt=4,Ze=1<<ct,St=1<<ht,tt=1<<pt,gt=1<<Et;return Tt.LUA_HOOKCALL=ct,Tt.LUA_HOOKCOUNT=Et,Tt.LUA_HOOKLINE=pt,Tt.LUA_HOOKRET=ht,Tt.LUA_HOOKTAILCALL=bt,Tt.LUA_MASKCALL=Ze,Tt.LUA_MASKCOUNT=gt,Tt.LUA_MASKLINE=tt,Tt.LUA_MASKRET=St,Tt.LUA_MINSTACK=X,Tt.LUA_MULTRET=-1,Tt.LUA_OPADD=ce,Tt.LUA_OPBAND=H,Tt.LUA_OPBNOT=Ye,Tt.LUA_OPBOR=D,Tt.LUA_OPBXOR=Ce,Tt.LUA_OPDIV=W,Tt.LUA_OPEQ=$e,Tt.LUA_OPIDIV=_e,Tt.LUA_OPLE=Y,Tt.LUA_OPLT=x,Tt.LUA_OPMOD=Oe,Tt.LUA_OPMUL=I,Tt.LUA_OPPOW=Ae,Tt.LUA_OPSHL=we,Tt.LUA_OPSHR=je,Tt.LUA_OPSUB=ae,Tt.LUA_OPUNM=de,Tt.LUA_REGISTRYINDEX=ee,Tt.LUA_RIDX_GLOBALS=nt,Tt.LUA_RIDX_LAST=at,Tt.LUA_RIDX_MAINTHREAD=ze,Tt.constant_types=Pe,Tt.lua_Debug=ft,Tt.lua_upvalueindex=ne,Tt.thread_status=Ue,Tt}var El;function In(){if(El)return an;El=1;const f=rn(),s="0",A="1",T=1,S="5",R="Fengari "+s+"."+A,$=R+"."+S,ge="B. Giannangeli, Daurnimator",le=$+"  Copyright (C) 2017-2019 "+ge+`
Based on: `+f.LUA_COPYRIGHT;return an.FENGARI_AUTHORS=ge,an.FENGARI_COPYRIGHT=le,an.FENGARI_RELEASE=$,an.FENGARI_VERSION=R,an.FENGARI_VERSION_MAJOR=s,an.FENGARI_VERSION_MINOR=A,an.FENGARI_VERSION_NUM=T,an.FENGARI_VERSION_RELEASE=S,an.is_luastring=f.is_luastring,an.luastring_eq=f.luastring_eq,an.luastring_from=f.luastring_from,an.luastring_indexOf=f.luastring_indexOf,an.luastring_of=f.luastring_of,an.to_jsstring=f.to_jsstring,an.to_luastring=f.to_luastring,an.to_uristring=f.to_uristring,an.from_userstring=f.from_userstring,an}var z={},Ge={},na={},kl;function yn(){if(kl)return na;kl=1;const f=function(ge){if(!ge)throw Error("assertion failed")};na.lua_assert=f;const s=function(ge,le,Se){if(!le)throw Error(Se)};na.api_check=s;const A=200;na.LUAI_MAXCCALLS=A;const T=32;na.LUA_MINBUFFER=T;const S=function(ge,le,Se){let q=le%Se;return q*Se<0&&(q+=Se),q};na.luai_nummod=S;const R=2147483647;na.MAX_INT=R;const $=-2147483648;return na.MIN_INT=$,na}var ln={},en={},aa={},Zt={},_a={},Ol;function fr(){if(Ol)return _a;Ol=1;const{luastring_of:f}=rn(),s=f(0,0,0,0,0,0,0,0,0,0,8,8,8,8,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,22,22,22,22,22,22,22,22,22,22,4,4,4,4,4,4,4,21,21,21,21,21,21,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,5,4,21,21,21,21,21,21,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),A=0,T=1,S=2,R=3,$=4,ge=function(Te){return(s[Te+1]&1<<T)!==0},le=function(Te){return(s[Te+1]&1<<$)!==0},Se=function(Te){return(s[Te+1]&1<<S)!==0},q=function(Te){return(s[Te+1]&1<<R)!==0},Z=function(Te){return(s[Te+1]&1<<A)!==0},Q=function(Te){return(s[Te+1]&(1<<A|1<<T))!==0};return _a.lisdigit=ge,_a.lislalnum=Q,_a.lislalpha=Z,_a.lisprint=Se,_a.lisspace=q,_a.lisxdigit=le,_a}var tn={},xn={},la={},wl;function ra(){if(wl)return la;wl=1;const{is_luastring:f,luastring_eq:s,luastring_from:A,to_luastring:T}=rn(),{lua_assert:S}=yn();class R{constructor(Te,J){this.hash=null,this.realstring=J}getstr(){return this.realstring}tsslen(){return this.realstring.length}}const $=function(Q,Te){return S(Q instanceof R),S(Te instanceof R),Q==Te||s(Q.realstring,Te.realstring)},ge=function(Q){S(f(Q));let Te=Q.length,J="|";for(let Me=0;Me<Te;Me++)J+=Q[Me].toString(16);return J},le=function(Q){return S(Q instanceof R),Q.hash===null&&(Q.hash=ge(Q.getstr())),Q.hash},Se=function(Q,Te){return S(Te instanceof Uint8Array),new R(Q,Te)},q=function(Q,Te){return Se(Q,A(Te))},Z=function(Q,Te){return Se(Q,T(Te))};return la.luaS_eqlngstr=$,la.luaS_hash=ge,la.luaS_hashlongstr=le,la.luaS_bless=Se,la.luaS_new=q,la.luaS_newliteral=Z,la.TString=R,la}var vl;function sa(){if(vl)return xn;vl=1;const{constant_types:{LUA_TBOOLEAN:f,LUA_TCCL:s,LUA_TLCF:A,LUA_TLCL:T,LUA_TLIGHTUSERDATA:S,LUA_TLNGSTR:R,LUA_TNIL:$,LUA_TNUMFLT:ge,LUA_TNUMINT:le,LUA_TSHRSTR:Se,LUA_TTABLE:q,LUA_TTHREAD:Z,LUA_TUSERDATA:Q},to_luastring:Te}=rn(),{LUA_MAXINTEGER:J}=vn(),{lua_assert:Me}=yn(),Le=pa(),ye=Mn(),{luaS_hashlongstr:Ke,TString:ut}=ra(),xe=ha();let Ue=new WeakMap;const Pe=function(x){let Y=Ue.get(x);return Y||(Y={},Ue.set(x,Y)),Y},ce=function(x,Y){switch(Y.type){case $:return Le.luaG_runerror(x,Te("table index is nil",!0));case ge:if(isNaN(Y.value))return Le.luaG_runerror(x,Te("table index is NaN",!0));case le:case f:case q:case T:case A:case s:case Q:case Z:return Y.value;case Se:case R:return Ke(Y.tsvalue());case S:{let X=Y.value;switch(typeof X){case"string":return"*"+X;case"number":return"#"+X;case"boolean":return X?"?true":"?false";case"function":return Pe(X);case"object":if(X instanceof xe.lua_State&&X.l_G===x.l_G||X instanceof ae||X instanceof ye.Udata||X instanceof ye.LClosure||X instanceof ye.CClosure)return Pe(X);default:return X}}default:throw new Error("unknown key type: "+Y.type)}};class ae{constructor(Y){this.id=Y.l_G.id_counter++,this.strong=new Map,this.dead_strong=new Map,this.dead_weak=void 0,this.f=void 0,this.l=void 0,this.metatable=null,this.flags=-1}}const I=function(x){x.flags=0},Oe=function(x,Y,X,he){x.dead_strong.clear(),x.dead_weak=void 0;let ee=null,ne={key:X,value:he,p:ee=x.l,n:void 0};x.f||(x.f=ne),ee&&(ee.n=ne),x.strong.set(Y,ne),x.l=ne},Ae=function(x){return typeof x=="object"?x!==null:typeof x=="function"},W=function(x,Y){let X=x.strong.get(Y);if(X){X.key.setdeadvalue(),X.value=void 0;let he=X.n,ee=X.p;X.p=void 0,ee&&(ee.n=he),he&&(he.p=ee),x.f===X&&(x.f=he),x.l===X&&(x.l=ee),x.strong.delete(Y),Ae(Y)?(x.dead_weak||(x.dead_weak=new WeakMap),x.dead_weak.set(Y,X)):x.dead_strong.set(Y,X)}},_e=function(x){return new ae(x)},H=function(x,Y){let X=x.strong.get(Y);return X?X.value:ye.luaO_nilobject},D=function(x,Y){return Me(typeof Y=="number"&&(Y|0)===Y),H(x,Y)},Ce=function(x,Y){return Me(Y instanceof ut),H(x,Ke(Y))},we=function(x,Y,X){return Me(X instanceof ye.TValue),X.ttisnil()||X.ttisfloat()&&isNaN(X.value)?ye.luaO_nilobject:H(Y,ce(x,X))},je=function(x,Y,X){Me(typeof Y=="number"&&(Y|0)===Y&&X instanceof ye.TValue);let he=Y;if(X.ttisnil()){W(x,he);return}let ee=x.strong.get(he);if(ee)ee.value.setfrom(X);else{let ne=new ye.TValue(le,Y),ze=new ye.TValue(X.type,X.value);Oe(x,he,ne,ze)}},de=function(x,Y,X,he){Me(X instanceof ye.TValue);let ee=ce(x,X);if(he.ttisnil()){W(Y,ee);return}let ne=Y.strong.get(ee);if(ne)ne.value.setfrom(he);else{let ze,nt=X.value;X.ttisfloat()&&(nt|0)===nt?ze=new ye.TValue(le,nt):ze=new ye.TValue(X.type,nt);let at=new ye.TValue(he.type,he.value);Oe(Y,ee,ze,at)}},Ye=function(x){let Y=0,X=x.strong.size+1;for(;!D(x,X).ttisnil();){if(Y=X,X>J/2){for(Y=1;!D(x,Y).ttisnil();)Y++;return Y-1}X*=2}for(;X-Y>1;){let he=Math.floor((Y+X)/2);D(x,he).ttisnil()?X=he:Y=he}return Y},$e=function(x,Y,X){let he=x.stack[X],ee;if(he.type===$){if(ee=Y.f,!ee)return!1}else{let ne=ce(x,he);if(ee=Y.strong.get(ne),ee){if(ee=ee.n,!ee)return!1}else{if(ee=Y.dead_weak&&Y.dead_weak.get(ne)||Y.dead_strong.get(ne),!ee)return Le.luaG_runerror(x,Te("invalid key to 'next'"));do if(ee=ee.n,!ee)return!1;while(ee.key.ttisdeadkey())}}return ye.setobj2s(x,X,ee.key),ye.setobj2s(x,X+1,ee.value),!0};return xn.invalidateTMcache=I,xn.luaH_get=we,xn.luaH_getint=D,xn.luaH_getn=Ye,xn.luaH_getstr=Ce,xn.luaH_setfrom=de,xn.luaH_setint=je,xn.luaH_new=_e,xn.luaH_next=$e,xn.Table=ae,xn}var wn={},Jt={},At={},yl;function xa(){if(yl)return At;yl=1;const f=["MOVE","LOADK","LOADKX","LOADBOOL","LOADNIL","GETUPVAL","GETTABUP","GETTABLE","SETTABUP","SETUPVAL","SETTABLE","NEWTABLE","SELF","ADD","SUB","MUL","MOD","POW","DIV","IDIV","BAND","BOR","BXOR","SHL","SHR","UNM","BNOT","NOT","LEN","CONCAT","JMP","EQ","LT","LE","TEST","TESTSET","CALL","TAILCALL","RETURN","FORLOOP","FORPREP","TFORCALL","TFORLOOP","SETLIST","CLOSURE","VARARG","EXTRAARG"],s={OP_MOVE:0,OP_LOADK:1,OP_LOADKX:2,OP_LOADBOOL:3,OP_LOADNIL:4,OP_GETUPVAL:5,OP_GETTABUP:6,OP_GETTABLE:7,OP_SETTABUP:8,OP_SETUPVAL:9,OP_SETTABLE:10,OP_NEWTABLE:11,OP_SELF:12,OP_ADD:13,OP_SUB:14,OP_MUL:15,OP_MOD:16,OP_POW:17,OP_DIV:18,OP_IDIV:19,OP_BAND:20,OP_BOR:21,OP_BXOR:22,OP_SHL:23,OP_SHR:24,OP_UNM:25,OP_BNOT:26,OP_NOT:27,OP_LEN:28,OP_CONCAT:29,OP_JMP:30,OP_EQ:31,OP_LT:32,OP_LE:33,OP_TEST:34,OP_TESTSET:35,OP_CALL:36,OP_TAILCALL:37,OP_RETURN:38,OP_FORLOOP:39,OP_FORPREP:40,OP_TFORCALL:41,OP_TFORLOOP:42,OP_SETLIST:43,OP_CLOSURE:44,OP_VARARG:45,OP_EXTRAARG:46},A=0,T=1,S=2,R=3,$=0,ge=1,le=2,Se=3,q=[64|S<<4|A<<2|$,64|R<<4|A<<2|ge,64|A<<4|A<<2|ge,64|T<<4|T<<2|$,64|T<<4|A<<2|$,64|T<<4|A<<2|$,64|T<<4|R<<2|$,64|S<<4|R<<2|$,0|R<<4|R<<2|$,0|T<<4|A<<2|$,0|R<<4|R<<2|$,64|T<<4|T<<2|$,64|S<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|R<<4|R<<2|$,64|S<<4|A<<2|$,64|S<<4|A<<2|$,64|S<<4|A<<2|$,64|S<<4|A<<2|$,64|S<<4|S<<2|$,0|S<<4|A<<2|le,128|R<<4|R<<2|$,128|R<<4|R<<2|$,128|R<<4|R<<2|$,128|A<<4|T<<2|$,192|S<<4|T<<2|$,64|T<<4|T<<2|$,64|T<<4|T<<2|$,0|T<<4|A<<2|$,64|S<<4|A<<2|le,64|S<<4|A<<2|le,0|A<<4|T<<2|$,64|S<<4|A<<2|le,0|T<<4|T<<2|$,64|T<<4|A<<2|ge,64|T<<4|A<<2|$,0|T<<4|T<<2|Se],Z=function(g){return q[g]&3},Q=function(g){return q[g]>>4&3},Te=function(g){return q[g]>>2&3},J=function(g){return q[g]&64},Me=function(g){return q[g]&128},Le=9,ye=9,Ke=Le+ye,ut=8,xe=Le+ye+ut,Ue=6,Pe=0,ce=Pe+Ue,ae=ce+ut,I=ae+Le,Oe=ae,Ae=ce,W=(1<<Ke)-1,_e=W>>1,H=(1<<xe)-1,D=(1<<ut)-1,Ce=(1<<ye)-1,we=(1<<Le)-1,je=1<<ye-1,de=je-1,Ye=D,$e=function(g){return g&je},x=function(g){return g&~je},Y=function(g){return g|je},X=function(g,w){return~(-1<<g)<<w},he=function(g,w){return~X(g,w)},ee=function(g){return g.opcode},ne=function(g,w){return g.code=g.code&he(Ue,Pe)|w<<Pe&X(Ue,Pe),ve(g)},ze=function(g,w,B,ue){return g.code=g.code&he(ue,B)|w<<B&X(ue,B),ve(g)},nt=function(g){return g.A},at=function(g,w){return ze(g,w,ce,ut)},ft=function(g){return g.B},ct=function(g,w){return ze(g,w,I,ye)},ht=function(g){return g.C},pt=function(g,w){return ze(g,w,ae,Le)},Et=function(g){return g.Bx},bt=function(g,w){return ze(g,w,Oe,Ke)},Ze=function(g){return g.Ax},St=function(g,w){return ze(g,w,Ae,xe)},tt=function(g){return g.sBx},gt=function(g,w){return bt(g,w+_e)},ve=function(g){if(typeof g=="number")return{code:g,opcode:g>>Pe&X(Ue,0),A:g>>ce&X(ut,0),B:g>>I&X(ye,0),C:g>>ae&X(Le,0),Bx:g>>Oe&X(Ke,0),Ax:g>>Ae&X(xe,0),sBx:(g>>Oe&X(Ke,0))-_e};{let w=g.code;return g.opcode=w>>Pe&X(Ue,0),g.A=w>>ce&X(ut,0),g.B=w>>I&X(ye,0),g.C=w>>ae&X(Le,0),g.Bx=w>>Oe&X(Ke,0),g.Ax=w>>Ae&X(xe,0),g.sBx=(w>>Oe&X(Ke,0))-_e,g}},K=function(g,w,B,ue){return ve(g<<Pe|w<<ce|B<<I|ue<<ae)},M=function(g,w,B){return ve(g<<Pe|w<<ce|B<<Oe)},O=function(g,w){return ve(g<<Pe|w<<Ae)},m=50;return At.BITRK=je,At.CREATE_ABC=K,At.CREATE_ABx=M,At.CREATE_Ax=O,At.GET_OPCODE=ee,At.GETARG_A=nt,At.GETARG_B=ft,At.GETARG_C=ht,At.GETARG_Bx=Et,At.GETARG_Ax=Ze,At.GETARG_sBx=tt,At.INDEXK=x,At.ISK=$e,At.LFIELDS_PER_FLUSH=m,At.MAXARG_A=D,At.MAXARG_Ax=H,At.MAXARG_B=Ce,At.MAXARG_Bx=W,At.MAXARG_C=we,At.MAXARG_sBx=_e,At.MAXINDEXRK=de,At.NO_REG=Ye,At.OpArgK=R,At.OpArgN=A,At.OpArgR=S,At.OpArgU=T,At.OpCodes=f,At.OpCodesI=s,At.POS_A=ce,At.POS_Ax=Ae,At.POS_B=I,At.POS_Bx=Oe,At.POS_C=ae,At.POS_OP=Pe,At.RKASK=Y,At.SETARG_A=at,At.SETARG_Ax=St,At.SETARG_B=ct,At.SETARG_Bx=bt,At.SETARG_C=pt,At.SETARG_sBx=gt,At.SET_OPCODE=ne,At.SIZE_A=ut,At.SIZE_Ax=xe,At.SIZE_B=ye,At.SIZE_Bx=Ke,At.SIZE_C=Le,At.SIZE_OP=Ue,At.fullins=ve,At.getBMode=Q,At.getCMode=Te,At.getOpMode=Z,At.iABC=$,At.iABx=ge,At.iAsBx=le,At.iAx=Se,At.testAMode=J,At.testTMode=Me,At}var Sl;function Ia(){if(Sl)return Jt;Sl=1;const{LUA_MASKLINE:f,LUA_MASKCOUNT:s,LUA_MULTRET:A,constant_types:{LUA_TBOOLEAN:T,LUA_TLCF:S,LUA_TLIGHTUSERDATA:R,LUA_TLNGSTR:$,LUA_TNIL:ge,LUA_TNUMBER:le,LUA_TNUMFLT:Se,LUA_TNUMINT:q,LUA_TSHRSTR:Z,LUA_TTABLE:Q,LUA_TUSERDATA:Te},to_luastring:J}=rn(),{INDEXK:Me,ISK:Le,LFIELDS_PER_FLUSH:ye,OpCodesI:{OP_ADD:Ke,OP_BAND:ut,OP_BNOT:xe,OP_BOR:Ue,OP_BXOR:Pe,OP_CALL:ce,OP_CLOSURE:ae,OP_CONCAT:I,OP_DIV:Oe,OP_EQ:Ae,OP_EXTRAARG:W,OP_FORLOOP:_e,OP_FORPREP:H,OP_GETTABLE:D,OP_GETTABUP:Ce,OP_GETUPVAL:we,OP_IDIV:je,OP_JMP:de,OP_LE:Ye,OP_LEN:$e,OP_LOADBOOL:x,OP_LOADK:Y,OP_LOADKX:X,OP_LOADNIL:he,OP_LT:ee,OP_MOD:ne,OP_MOVE:ze,OP_MUL:nt,OP_NEWTABLE:at,OP_NOT:ft,OP_POW:ct,OP_RETURN:ht,OP_SELF:pt,OP_SETLIST:Et,OP_SETTABLE:bt,OP_SETTABUP:Ze,OP_SETUPVAL:St,OP_SHL:tt,OP_SHR:gt,OP_SUB:ve,OP_TAILCALL:K,OP_TEST:M,OP_TESTSET:O,OP_TFORCALL:m,OP_TFORLOOP:g,OP_UNM:w,OP_VARARG:B}}=xa(),{LUA_MAXINTEGER:ue,LUA_MININTEGER:ot,lua_numbertointeger:st}=vn(),{lua_assert:Fe,luai_nummod:y}=yn(),V=Mn(),me=Ua(),De=ha(),{luaS_bless:qe,luaS_eqlngstr:d,luaS_hashlongstr:te}=ra(),P=Yn(),oe=Ma(),Ne=sa(),it=pa(),Qe=function(_){let G=_.ci,be=G.l_base,pe=G.l_code[G.l_savedpc-1],Xe=pe.opcode;switch(Xe){case Ke:case ve:case nt:case Oe:case je:case ut:case Ue:case Pe:case tt:case gt:case ne:case ct:case w:case xe:case $e:case Ce:case D:case pt:{V.setobjs2s(_,be+pe.A,_.top-1),delete _.stack[--_.top];break}case Ye:case ee:case Ae:{let ke=!_.stack[_.top-1].l_isfalse();delete _.stack[--_.top],G.callstatus&De.CIST_LEQ&&(Fe(Xe===Ye),G.callstatus^=De.CIST_LEQ,ke=!ke),Fe(G.l_code[G.l_savedpc].opcode===de),ke!==!!pe.A&&G.l_savedpc++;break}case I:{let ke=_.top-1,Ie=pe.B,Mt=ke-1-(be+Ie);V.setobjs2s(_,ke-2,ke),Mt>1&&(_.top=ke-1,Kt(_,Mt)),V.setobjs2s(_,G.l_base+pe.A,_.top-1),P.adjust_top(_,G.top);break}case m:{Fe(G.l_code[G.l_savedpc].opcode===g),P.adjust_top(_,G.top);break}case ce:{pe.C-1>=0&&P.adjust_top(_,G.top);break}}},xt=function(_,G,be){return G+be.A},kt=function(_,G,be){return G+be.B},yt=function(_,G,be,pe){return Le(pe.B)?be[Me(pe.B)]:_.stack[G+pe.B]},wt=function(_,G,be,pe){return Le(pe.C)?be[Me(pe.C)]:_.stack[G+pe.C]},Yt=function(_){let G=_.ci;G.callstatus|=De.CIST_FRESH;e:for(;;){Fe(G===_.ci);let be=G.func.value,pe=be.p.k,Xe=G.l_base,ke=G.l_code[G.l_savedpc++];_.hookmask&(f|s)&&it.luaG_traceexec(_);let Ie=xt(_,Xe,ke);switch(ke.opcode){case ze:{V.setobjs2s(_,Ie,kt(_,Xe,ke));break}case Y:{let re=pe[ke.Bx];V.setobj2s(_,Ie,re);break}case X:{Fe(G.l_code[G.l_savedpc].opcode===W);let re=pe[G.l_code[G.l_savedpc++].Ax];V.setobj2s(_,Ie,re);break}case x:{_.stack[Ie].setbvalue(ke.B!==0),ke.C!==0&&G.l_savedpc++;break}case he:{for(let re=0;re<=ke.B;re++)_.stack[Ie+re].setnilvalue();break}case we:{let re=ke.B;V.setobj2s(_,Ie,be.upvals[re]);break}case Ce:{let re=be.upvals[ke.B],Be=wt(_,Xe,pe,ke);sn(_,re,Be,Ie);break}case D:{let re=_.stack[kt(_,Xe,ke)],Be=wt(_,Xe,pe,ke);sn(_,re,Be,Ie);break}case Ze:{let re=be.upvals[ke.A],Be=yt(_,Xe,pe,ke),Je=wt(_,Xe,pe,ke);jt(_,re,Be,Je);break}case St:{be.upvals[ke.B].setfrom(_.stack[Ie]);break}case bt:{let re=_.stack[Ie],Be=yt(_,Xe,pe,ke),Je=wt(_,Xe,pe,ke);jt(_,re,Be,Je);break}case at:{_.stack[Ie].sethvalue(Ne.luaH_new(_));break}case pt:{let re=kt(_,Xe,ke),Be=wt(_,Xe,pe,ke);V.setobjs2s(_,Ie+1,re),sn(_,_.stack[re],Be,Ie);break}case Ke:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;re.ttisinteger()&&Be.ttisinteger()?_.stack[Ie].setivalue(re.value+Be.value|0):(Je=E(re))!==!1&&(Ot=E(Be))!==!1?_.stack[Ie].setfltvalue(Je+Ot):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_ADD);break}case ve:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;re.ttisinteger()&&Be.ttisinteger()?_.stack[Ie].setivalue(re.value-Be.value|0):(Je=E(re))!==!1&&(Ot=E(Be))!==!1?_.stack[Ie].setfltvalue(Je-Ot):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_SUB);break}case nt:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;re.ttisinteger()&&Be.ttisinteger()?_.stack[Ie].setivalue(ie(re.value,Be.value)):(Je=E(re))!==!1&&(Ot=E(Be))!==!1?_.stack[Ie].setfltvalue(Je*Ot):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_MUL);break}case ne:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;re.ttisinteger()&&Be.ttisinteger()?_.stack[Ie].setivalue(mt(_,re.value,Be.value)):(Je=E(re))!==!1&&(Ot=E(Be))!==!1?_.stack[Ie].setfltvalue(y(_,Je,Ot)):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_MOD);break}case ct:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;(Je=E(re))!==!1&&(Ot=E(Be))!==!1?_.stack[Ie].setfltvalue(Math.pow(Je,Ot)):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_POW);break}case Oe:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;(Je=E(re))!==!1&&(Ot=E(Be))!==!1?_.stack[Ie].setfltvalue(Je/Ot):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_DIV);break}case je:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;re.ttisinteger()&&Be.ttisinteger()?_.stack[Ie].setivalue(He(_,re.value,Be.value)):(Je=E(re))!==!1&&(Ot=E(Be))!==!1?_.stack[Ie].setfltvalue(Math.floor(Je/Ot)):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_IDIV);break}case ut:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;(Je=F(re))!==!1&&(Ot=F(Be))!==!1?_.stack[Ie].setivalue(Je&Ot):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_BAND);break}case Ue:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;(Je=F(re))!==!1&&(Ot=F(Be))!==!1?_.stack[Ie].setivalue(Je|Ot):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_BOR);break}case Pe:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;(Je=F(re))!==!1&&(Ot=F(Be))!==!1?_.stack[Ie].setivalue(Je^Ot):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_BXOR);break}case tt:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;(Je=F(re))!==!1&&(Ot=F(Be))!==!1?_.stack[Ie].setivalue(n(Je,Ot)):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_SHL);break}case gt:{let re=yt(_,Xe,pe,ke),Be=wt(_,Xe,pe,ke),Je,Ot;(Je=F(re))!==!1&&(Ot=F(Be))!==!1?_.stack[Ie].setivalue(n(Je,-Ot)):oe.luaT_trybinTM(_,re,Be,_.stack[Ie],oe.TMS.TM_SHR);break}case w:{let re=_.stack[kt(_,Xe,ke)],Be;re.ttisinteger()?_.stack[Ie].setivalue(-re.value|0):(Be=E(re))!==!1?_.stack[Ie].setfltvalue(-Be):oe.luaT_trybinTM(_,re,re,_.stack[Ie],oe.TMS.TM_UNM);break}case xe:{let re=_.stack[kt(_,Xe,ke)];re.ttisinteger()?_.stack[Ie].setivalue(~re.value):oe.luaT_trybinTM(_,re,re,_.stack[Ie],oe.TMS.TM_BNOT);break}case ft:{let re=_.stack[kt(_,Xe,ke)];_.stack[Ie].setbvalue(re.l_isfalse());break}case $e:{fe(_,_.stack[Ie],_.stack[kt(_,Xe,ke)]);break}case I:{let re=ke.B,Be=ke.C;_.top=Xe+Be+1,Kt(_,Be-re+1);let Je=Xe+re;V.setobjs2s(_,Ie,Je),P.adjust_top(_,G.top);break}case de:{Vt(_,G,ke,0);break}case Ae:{Xt(_,yt(_,Xe,pe,ke),wt(_,Xe,pe,ke))!==ke.A?G.l_savedpc++:Nt(_,G);break}case ee:{Bt(_,yt(_,Xe,pe,ke),wt(_,Xe,pe,ke))!==ke.A?G.l_savedpc++:Nt(_,G);break}case Ye:{Ht(_,yt(_,Xe,pe,ke),wt(_,Xe,pe,ke))!==ke.A?G.l_savedpc++:Nt(_,G);break}case M:{(ke.C?_.stack[Ie].l_isfalse():!_.stack[Ie].l_isfalse())?G.l_savedpc++:Nt(_,G);break}case O:{let re=kt(_,Xe,ke),Be=_.stack[re];(ke.C?Be.l_isfalse():!Be.l_isfalse())?G.l_savedpc++:(V.setobjs2s(_,Ie,re),Nt(_,G));break}case ce:{let re=ke.B,Be=ke.C-1;if(re!==0&&P.adjust_top(_,Ie+re),P.luaD_precall(_,Ie,Be))Be>=0&&P.adjust_top(_,G.top);else{G=_.ci;continue e}break}case K:{let re=ke.B;if(re!==0&&P.adjust_top(_,Ie+re),!P.luaD_precall(_,Ie,A)){let Be=_.ci,Je=Be.previous,Ot=Be.func,nn=Be.funcOff,un=Je.funcOff,gn=Be.l_base+Ot.value.p.numparams;be.p.p.length>0&&me.luaF_close(_,Je.l_base);for(let Sn=0;nn+Sn<gn;Sn++)V.setobjs2s(_,un+Sn,nn+Sn);Je.l_base=un+(Be.l_base-nn),Je.top=un+(_.top-nn),P.adjust_top(_,Je.top),Je.l_code=Be.l_code,Je.l_savedpc=Be.l_savedpc,Je.callstatus|=De.CIST_TAIL,Je.next=null,G=_.ci=Je,Fe(_.top===Je.l_base+_.stack[un].value.p.maxstacksize);continue e}break}case ht:{be.p.p.length>0&&me.luaF_close(_,Xe);let re=P.luaD_poscall(_,G,Ie,ke.B!==0?ke.B-1:_.top-Ie);if(G.callstatus&De.CIST_FRESH)return;G=_.ci,re&&P.adjust_top(_,G.top),Fe(G.callstatus&De.CIST_LUA),Fe(G.l_code[G.l_savedpc-1].opcode===ce);continue e}case _e:{if(_.stack[Ie].ttisinteger()){let re=_.stack[Ie+2].value,Be=_.stack[Ie].value+re|0,Je=_.stack[Ie+1].value;(0<re?Be<=Je:Je<=Be)&&(G.l_savedpc+=ke.sBx,_.stack[Ie].chgivalue(Be),_.stack[Ie+3].setivalue(Be))}else{let re=_.stack[Ie+2].value,Be=_.stack[Ie].value+re,Je=_.stack[Ie+1].value;(0<re?Be<=Je:Je<=Be)&&(G.l_savedpc+=ke.sBx,_.stack[Ie].chgfltvalue(Be),_.stack[Ie+3].setfltvalue(Be))}break}case H:{let re=_.stack[Ie],Be=_.stack[Ie+1],Je=_.stack[Ie+2],Ot;if(re.ttisinteger()&&Je.ttisinteger()&&(Ot=Ft(Be,Je.value))){let nn=Ot.stopnow?0:re.value;Be.value=Ot.ilimit,re.value=nn-Je.value|0}else{let nn,un,gn;(nn=E(Be))===!1&&it.luaG_runerror(_,J("'for' limit must be a number",!0)),_.stack[Ie+1].setfltvalue(nn),(un=E(Je))===!1&&it.luaG_runerror(_,J("'for' step must be a number",!0)),_.stack[Ie+2].setfltvalue(un),(gn=E(re))===!1&&it.luaG_runerror(_,J("'for' initial value must be a number",!0)),_.stack[Ie].setfltvalue(gn-un)}G.l_savedpc+=ke.sBx;break}case m:{let re=Ie+3;V.setobjs2s(_,re+2,Ie+2),V.setobjs2s(_,re+1,Ie+1),V.setobjs2s(_,re,Ie),P.adjust_top(_,re+3),P.luaD_call(_,re,ke.C),P.adjust_top(_,G.top),ke=G.l_code[G.l_savedpc++],Ie=xt(_,Xe,ke),Fe(ke.opcode===g)}case g:{_.stack[Ie+1].ttisnil()||(V.setobjs2s(_,Ie,Ie+1),G.l_savedpc+=ke.sBx);break}case Et:{let re=ke.B,Be=ke.C;re===0&&(re=_.top-Ie-1),Be===0&&(Fe(G.l_code[G.l_savedpc].opcode===W),Be=G.l_code[G.l_savedpc++].Ax);let Je=_.stack[Ie].value,Ot=(Be-1)*ye+re;for(;re>0;re--)Ne.luaH_setint(Je,Ot--,_.stack[Ie+re]);P.adjust_top(_,G.top);break}case ae:{let re=be.p.p[ke.Bx],Be=u(re,be.upvals,_.stack,Xe);Be===null?o(_,re,be.upvals,Xe,Ie):_.stack[Ie].setclLvalue(Be);break}case B:{let re=ke.B-1,Be=Xe-G.funcOff-be.p.numparams-1,Je;for(Be<0&&(Be=0),re<0&&(re=Be,P.luaD_checkstack(_,Be),P.adjust_top(_,Ie+Be)),Je=0;Je<re&&Je<Be;Je++)V.setobjs2s(_,Ie+Je,Xe-Be+Je);for(;Je<re;Je++)_.stack[Ie+Je].setnilvalue();break}case W:throw Error("invalid opcode")}}},Vt=function(_,G,be,pe){let Xe=be.A;Xe!==0&&me.luaF_close(_,G.l_base+Xe-1),G.l_savedpc+=be.sBx+pe},Nt=function(_,G){Vt(_,G,G.l_code[G.l_savedpc],1)},Bt=function(_,G,be){if(G.ttisnumber()&&be.ttisnumber())return Ee(G,be)?1:0;if(G.ttisstring()&&be.ttisstring())return b(G.tsvalue(),be.tsvalue())<0?1:0;{let pe=oe.luaT_callorderTM(_,G,be,oe.TMS.TM_LT);return pe===null&&it.luaG_ordererror(_,G,be),pe?1:0}},Ht=function(_,G,be){let pe;return G.ttisnumber()&&be.ttisnumber()?We(G,be)?1:0:G.ttisstring()&&be.ttisstring()?b(G.tsvalue(),be.tsvalue())<=0?1:0:(pe=oe.luaT_callorderTM(_,G,be,oe.TMS.TM_LE),pe!==null?pe?1:0:(_.ci.callstatus|=De.CIST_LEQ,pe=oe.luaT_callorderTM(_,be,G,oe.TMS.TM_LT),_.ci.callstatus^=De.CIST_LEQ,pe===null&&it.luaG_ordererror(_,G,be),pe?0:1))},Xt=function(_,G,be){if(G.ttype()!==be.ttype())return G.ttnov()!==be.ttnov()||G.ttnov()!==le?0:G.value===be.value?1:0;let pe;switch(G.ttype()){case ge:return 1;case T:return G.value==be.value?1:0;case R:case q:case Se:case S:return G.value===be.value?1:0;case Z:case $:return d(G.tsvalue(),be.tsvalue())?1:0;case Te:case Q:if(G.value===be.value)return 1;if(_===null)return 0;pe=oe.fasttm(_,G.value.metatable,oe.TMS.TM_EQ),pe===null&&(pe=oe.fasttm(_,be.value.metatable,oe.TMS.TM_EQ));break;default:return G.value===be.value?1:0}if(pe===null)return 0;let Xe=new V.TValue;return oe.luaT_callTM(_,pe,G,be,Xe,1),Xe.l_isfalse()?0:1},$t=function(_,G){return Xt(null,_,G)},Ft=function(_,G){let be=!1,pe=zt(_,G<0?2:1);if(pe===!1){let Xe=E(_);if(Xe===!1)return!1;0<Xe?(pe=ue,G<0&&(be=!0)):(pe=ot,G>=0&&(be=!0))}return{stopnow:be,ilimit:pe}},zt=function(_,G){if(_.ttisfloat()){let be=_.value,pe=Math.floor(be);if(be!==pe){if(G===0)return!1;G>1&&(pe+=1)}return st(pe)}else{if(_.ttisinteger())return _.value;if(se(_)){let be=new V.TValue;if(V.luaO_str2num(_.svalue(),be)===_.vslen()+1)return zt(be,G)}}return!1},F=function(_){return _.ttisinteger()?_.value:zt(_,0)},E=function(_){if(_.ttnov()===le)return _.value;if(se(_)){let G=new V.TValue;if(V.luaO_str2num(_.svalue(),G)===_.vslen()+1)return G.value}return!1},Ee=function(_,G){return _.value<G.value},We=function(_,G){return _.value<=G.value},b=function(_,G){let be=te(_),pe=te(G);return be===pe?0:be<pe?-1:1},fe=function(_,G,be){let pe;switch(be.ttype()){case Q:{let Xe=be.value;if(pe=oe.fasttm(_,Xe.metatable,oe.TMS.TM_LEN),pe!==null)break;G.setivalue(Ne.luaH_getn(Xe));return}case Z:case $:G.setivalue(be.vslen());return;default:{pe=oe.luaT_gettmbyobj(_,be,oe.TMS.TM_LEN),pe.ttisnil()&&it.luaG_typeerror(_,be,J("get length of",!0));break}}oe.luaT_callTM(_,pe,be,be,G,1)},ie=Math.imul||function(_,G){let be=_>>>16&65535,pe=_&65535,Xe=G>>>16&65535,ke=G&65535;return pe*ke+(be*ke+pe*Xe<<16>>>0)|0},He=function(_,G,be){return be===0&&it.luaG_runerror(_,J("attempt to divide by zero")),Math.floor(G/be)|0},mt=function(_,G,be){return be===0&&it.luaG_runerror(_,J("attempt to perform 'n%%0'")),G-Math.floor(G/be)*be|0},l=32,n=function(_,G){return G<0?G<=-l?0:_>>>-G:G>=l?0:_<<G},u=function(_,G,be,pe){let Xe=_.cache;if(Xe!==null){let ke=_.upvalues,Ie=ke.length;for(let Mt=0;Mt<Ie;Mt++){let re=ke[Mt].instack?be[pe+ke[Mt].idx]:G[ke[Mt].idx];if(Xe.upvals[Mt]!==re)return null}}return Xe},o=function(_,G,be,pe,Xe){let ke=G.upvalues.length,Ie=G.upvalues,Mt=new V.LClosure(_,ke);Mt.p=G,_.stack[Xe].setclLvalue(Mt);for(let re=0;re<ke;re++)Ie[re].instack?Mt.upvals[re]=me.luaF_findupval(_,pe+Ie[re].idx):Mt.upvals[re]=be[Ie[re].idx];G.cache=Mt},C=function(_){return _.ttisnumber()},se=function(_){return _.ttisstring()},Ve=function(_,G){let be=_.stack[G];return be.ttisstring()?!0:C(be)?(V.luaO_tostring(_,be),!0):!1},dt=function(_){return _.ttisstring()&&_.vslen()===0},Dt=function(_,G,be,pe){let Xe=0;do{let ke=_.stack[G-be],Ie=ke.vslen(),Mt=ke.svalue();pe.set(Mt,Xe),Xe+=Ie}while(--be>0)},Kt=function(_,G){Fe(G>=2);do{let be=_.top,pe=2;if(!(_.stack[be-2].ttisstring()||C(_.stack[be-2]))||!Ve(_,be-1))oe.luaT_trybinTM(_,_.stack[be-2],_.stack[be-1],_.stack[be-2],oe.TMS.TM_CONCAT);else if(dt(_.stack[be-1]))Ve(_,be-2);else if(dt(_.stack[be-2]))V.setobjs2s(_,be-2,be-1);else{let Xe=_.stack[be-1].vslen();for(pe=1;pe<G&&Ve(_,be-pe-1);pe++){let Mt=_.stack[be-pe-1].vslen();Xe+=Mt}let ke=new Uint8Array(Xe);Dt(_,be,pe,ke);let Ie=qe(_,ke);V.setsvalue2s(_,be-pe,Ie)}for(G-=pe-1;_.top>be-(pe-1);)delete _.stack[--_.top]}while(G>1)},Gt=2e3,sn=function(_,G,be,pe){for(let Xe=0;Xe<Gt;Xe++){let ke;if(!G.ttistable())ke=oe.luaT_gettmbyobj(_,G,oe.TMS.TM_INDEX),ke.ttisnil()&&it.luaG_typeerror(_,G,J("index",!0));else{let Ie=Ne.luaH_get(_,G.value,be);if(Ie.ttisnil()){if(ke=oe.fasttm(_,G.value.metatable,oe.TMS.TM_INDEX),ke===null){_.stack[pe].setnilvalue();return}}else{V.setobj2s(_,pe,Ie);return}}if(ke.ttisfunction()){oe.luaT_callTM(_,ke,G,be,_.stack[pe],1);return}G=ke}it.luaG_runerror(_,J("'__index' chain too long; possible loop",!0))},jt=function(_,G,be,pe){for(let Xe=0;Xe<Gt;Xe++){let ke;if(G.ttistable()){let Ie=G.value;if(!Ne.luaH_get(_,Ie,be).ttisnil()||(ke=oe.fasttm(_,Ie.metatable,oe.TMS.TM_NEWINDEX))===null){Ne.luaH_setfrom(_,Ie,be,pe),Ne.invalidateTMcache(Ie);return}}else(ke=oe.luaT_gettmbyobj(_,G,oe.TMS.TM_NEWINDEX)).ttisnil()&&it.luaG_typeerror(_,G,J("index",!0));if(ke.ttisfunction()){oe.luaT_callTM(_,ke,G,be,pe,0);return}G=ke}it.luaG_runerror(_,J("'__newindex' chain too long; possible loop",!0))};return Jt.cvt2str=C,Jt.cvt2num=se,Jt.luaV_gettable=sn,Jt.luaV_concat=Kt,Jt.luaV_div=He,Jt.luaV_equalobj=Xt,Jt.luaV_execute=Yt,Jt.luaV_finishOp=Qe,Jt.luaV_imul=ie,Jt.luaV_lessequal=Ht,Jt.luaV_lessthan=Bt,Jt.luaV_mod=mt,Jt.luaV_objlen=fe,Jt.luaV_rawequalobj=$t,Jt.luaV_shiftl=n,Jt.luaV_tointeger=zt,Jt.settable=jt,Jt.tointeger=F,Jt.tonumber=E,Jt}var Nl;function Ma(){if(Nl)return wn;Nl=1;const{constant_types:{LUA_TTABLE:f,LUA_TUSERDATA:s},to_luastring:A}=rn(),{lua_assert:T}=yn(),S=Mn(),R=Yn(),$=ha(),{luaS_bless:ge,luaS_new:le}=ra(),Se=sa(),q=pa(),Z=Ia(),Q=["no value","nil","boolean","userdata","number","string","table","function","userdata","thread","proto"].map(I=>A(I)),Te=function(I){return Q[I+1]},J={TM_INDEX:0,TM_NEWINDEX:1,TM_GC:2,TM_MODE:3,TM_LEN:4,TM_EQ:5,TM_ADD:6,TM_SUB:7,TM_MUL:8,TM_MOD:9,TM_POW:10,TM_DIV:11,TM_IDIV:12,TM_BAND:13,TM_BOR:14,TM_BXOR:15,TM_SHL:16,TM_SHR:17,TM_UNM:18,TM_BNOT:19,TM_LT:20,TM_LE:21,TM_CONCAT:22,TM_CALL:23,TM_N:24},Me=function(I){I.l_G.tmname[J.TM_INDEX]=new le(I,A("__index",!0)),I.l_G.tmname[J.TM_NEWINDEX]=new le(I,A("__newindex",!0)),I.l_G.tmname[J.TM_GC]=new le(I,A("__gc",!0)),I.l_G.tmname[J.TM_MODE]=new le(I,A("__mode",!0)),I.l_G.tmname[J.TM_LEN]=new le(I,A("__len",!0)),I.l_G.tmname[J.TM_EQ]=new le(I,A("__eq",!0)),I.l_G.tmname[J.TM_ADD]=new le(I,A("__add",!0)),I.l_G.tmname[J.TM_SUB]=new le(I,A("__sub",!0)),I.l_G.tmname[J.TM_MUL]=new le(I,A("__mul",!0)),I.l_G.tmname[J.TM_MOD]=new le(I,A("__mod",!0)),I.l_G.tmname[J.TM_POW]=new le(I,A("__pow",!0)),I.l_G.tmname[J.TM_DIV]=new le(I,A("__div",!0)),I.l_G.tmname[J.TM_IDIV]=new le(I,A("__idiv",!0)),I.l_G.tmname[J.TM_BAND]=new le(I,A("__band",!0)),I.l_G.tmname[J.TM_BOR]=new le(I,A("__bor",!0)),I.l_G.tmname[J.TM_BXOR]=new le(I,A("__bxor",!0)),I.l_G.tmname[J.TM_SHL]=new le(I,A("__shl",!0)),I.l_G.tmname[J.TM_SHR]=new le(I,A("__shr",!0)),I.l_G.tmname[J.TM_UNM]=new le(I,A("__unm",!0)),I.l_G.tmname[J.TM_BNOT]=new le(I,A("__bnot",!0)),I.l_G.tmname[J.TM_LT]=new le(I,A("__lt",!0)),I.l_G.tmname[J.TM_LE]=new le(I,A("__le",!0)),I.l_G.tmname[J.TM_CONCAT]=new le(I,A("__concat",!0)),I.l_G.tmname[J.TM_CALL]=new le(I,A("__call",!0))},Le=A("__name",!0),ye=function(I,Oe){let Ae;if(Oe.ttistable()&&(Ae=Oe.value.metatable)!==null||Oe.ttisfulluserdata()&&(Ae=Oe.value.metatable)!==null){let W=Se.luaH_getstr(Ae,ge(I,Le));if(W.ttisstring())return W.svalue()}return Te(Oe.ttnov())},Ke=function(I,Oe,Ae,W,_e,H){let D=I.top;if(S.pushobj2s(I,Oe),S.pushobj2s(I,Ae),S.pushobj2s(I,W),H||S.pushobj2s(I,_e),I.ci.callstatus&$.CIST_LUA?R.luaD_call(I,D,H):R.luaD_callnoyield(I,D,H),H){let Ce=I.stack[I.top-1];delete I.stack[--I.top],_e.setfrom(Ce)}},ut=function(I,Oe,Ae,W,_e){let H=ae(I,Oe,_e);return H.ttisnil()&&(H=ae(I,Ae,_e)),H.ttisnil()?!1:(Ke(I,H,Oe,Ae,W,1),!0)},xe=function(I,Oe,Ae,W,_e){if(!ut(I,Oe,Ae,W,_e))switch(_e){case J.TM_CONCAT:return q.luaG_concaterror(I,Oe,Ae);case J.TM_BAND:case J.TM_BOR:case J.TM_BXOR:case J.TM_SHL:case J.TM_SHR:case J.TM_BNOT:{let H=Z.tonumber(Oe),D=Z.tonumber(Ae);return H!==!1&&D!==!1?q.luaG_tointerror(I,Oe,Ae):q.luaG_opinterror(I,Oe,Ae,A("perform bitwise operation on",!0))}default:return q.luaG_opinterror(I,Oe,Ae,A("perform arithmetic on",!0))}},Ue=function(I,Oe,Ae,W){let _e=new S.TValue;return ut(I,Oe,Ae,_e,W)?!_e.l_isfalse():null},Pe=function(I,Oe,Ae){return Oe===null||Oe.flags&1<<Ae?null:ce(Oe,Ae,I.l_G.tmname[Ae])},ce=function(I,Oe,Ae){const W=Se.luaH_getstr(I,Ae);return T(Oe<=J.TM_EQ),W.ttisnil()?(I.flags|=1<<Oe,null):W},ae=function(I,Oe,Ae){let W;switch(Oe.ttnov()){case f:case s:W=Oe.value.metatable;break;default:W=I.l_G.mt[Oe.ttnov()]}return W?Se.luaH_getstr(W,I.l_G.tmname[Ae]):S.luaO_nilobject};return wn.fasttm=Pe,wn.TMS=J,wn.luaT_callTM=Ke,wn.luaT_callbinTM=ut,wn.luaT_trybinTM=xe,wn.luaT_callorderTM=Ue,wn.luaT_gettm=ce,wn.luaT_gettmbyobj=ae,wn.luaT_init=Me,wn.luaT_objtypename=ye,wn.ttypename=Te,wn}var Rl;function ha(){if(Rl)return tn;Rl=1;const{LUA_MINSTACK:f,LUA_RIDX_GLOBALS:s,LUA_RIDX_MAINTHREAD:A,constant_types:{LUA_NUMTAGS:T,LUA_TNIL:S,LUA_TTABLE:R,LUA_TTHREAD:$},thread_status:{LUA_OK:ge}}=rn(),le=Mn(),Se=Yn(),q=Xa(),Z=sa(),Q=Ma(),Te=5,J=2*f;class Me{constructor(){this.func=null,this.funcOff=NaN,this.top=NaN,this.previous=null,this.next=null,this.l_base=NaN,this.l_code=null,this.l_savedpc=NaN,this.c_k=null,this.c_old_errfunc=null,this.c_ctx=null,this.nresults=NaN,this.callstatus=NaN}}class Le{constructor(H){this.id=H.id_counter++,this.base_ci=new Me,this.top=NaN,this.stack_last=NaN,this.oldpc=NaN,this.l_G=H,this.stack=null,this.ci=null,this.errorJmp=null,this.nCcalls=0,this.hook=null,this.hookmask=0,this.basehookcount=0,this.allowhook=1,this.hookcount=this.basehookcount,this.nny=1,this.status=ge,this.errfunc=0}}class ye{constructor(){this.id_counter=1,this.ids=new WeakMap,this.mainthread=null,this.l_registry=new le.TValue(S,null),this.panic=null,this.atnativeerror=null,this.version=null,this.tmname=new Array(Q.TMS.TM_N),this.mt=new Array(T)}}const Ke=function(_e){let H=new Me;return _e.ci.next=H,H.previous=_e.ci,H.next=null,_e.ci=H,H},ut=function(_e){let H=_e.ci;H.next=null},xe=function(_e,H){_e.stack=new Array(J),_e.top=0,_e.stack_last=J-Te;let D=_e.base_ci;D.next=D.previous=null,D.callstatus=0,D.funcOff=_e.top,D.func=_e.stack[_e.top],_e.stack[_e.top++]=new le.TValue(S,null),D.top=_e.top+f,_e.ci=D},Ue=function(_e){_e.ci=_e.base_ci,ut(_e),_e.stack=null},Pe=function(_e,H){let D=Z.luaH_new(_e);H.l_registry.sethvalue(D),Z.luaH_setint(D,A,new le.TValue($,_e)),Z.luaH_setint(D,s,new le.TValue(R,Z.luaH_new(_e)))},ce=function(_e){let H=_e.l_G;xe(_e),Pe(_e,H),Q.luaT_init(_e),H.version=q.lua_version(null)},ae=function(_e){let H=_e.l_G,D=new Le(H);return _e.stack[_e.top]=new le.TValue($,D),q.api_incr_top(_e),D.hookmask=_e.hookmask,D.basehookcount=_e.basehookcount,D.hook=_e.hook,D.hookcount=D.basehookcount,xe(D),D},I=function(_e,H){Ue(H)},Oe=function(){let _e=new ye,H=new Le(_e);return _e.mainthread=H,Se.luaD_rawrunprotected(H,ce,null)!==ge&&(H=null),H},Ae=function(_e){Ue(_e)},W=function(_e){_e=_e.l_G.mainthread,Ae(_e)};return tn.lua_State=Le,tn.CallInfo=Me,tn.CIST_OAH=1,tn.CIST_LUA=2,tn.CIST_HOOKED=4,tn.CIST_FRESH=8,tn.CIST_YPCALL=16,tn.CIST_TAIL=32,tn.CIST_HOOKYIELD=64,tn.CIST_LEQ=128,tn.CIST_FIN=256,tn.EXTRA_STACK=Te,tn.lua_close=W,tn.lua_newstate=Oe,tn.lua_newthread=ae,tn.luaE_extendCI=Ke,tn.luaE_freeCI=ut,tn.luaE_freethread=I,tn}var xl;function Mn(){if(xl)return Zt;xl=1;const{LUA_OPADD:f,LUA_OPBAND:s,LUA_OPBNOT:A,LUA_OPBOR:T,LUA_OPBXOR:S,LUA_OPDIV:R,LUA_OPIDIV:$,LUA_OPMOD:ge,LUA_OPMUL:le,LUA_OPPOW:Se,LUA_OPSHL:q,LUA_OPSHR:Z,LUA_OPSUB:Q,LUA_OPUNM:Te,constant_types:{LUA_NUMTAGS:J,LUA_TBOOLEAN:Me,LUA_TCCL:Le,LUA_TFUNCTION:ye,LUA_TLCF:Ke,LUA_TLCL:ut,LUA_TLIGHTUSERDATA:xe,LUA_TLNGSTR:Ue,LUA_TNIL:Pe,LUA_TNUMBER:ce,LUA_TNUMFLT:ae,LUA_TNUMINT:I,LUA_TSHRSTR:Oe,LUA_TSTRING:Ae,LUA_TTABLE:W,LUA_TTHREAD:_e,LUA_TUSERDATA:H},from_userstring:D,luastring_indexOf:Ce,luastring_of:we,to_jsstring:je,to_luastring:de}=rn(),{lisdigit:Ye,lisprint:$e,lisspace:x,lisxdigit:Y}=fr(),X=pa(),he=Yn(),ee=ha(),{luaS_bless:ne,luaS_new:ze}=ra(),nt=sa(),{LUA_COMPAT_FLOATSTRING:at,ldexp:ft,lua_integer2str:ct,lua_number2str:ht}=vn(),pt=Ia(),{MAX_INT:Et,luai_nummod:bt,lua_assert:Ze}=yn(),St=Ma(),tt=J,gt=J+1;class ve{constructor(E,Ee){this.type=E,this.value=Ee}ttype(){return this.type&63}ttnov(){return this.type&15}checktag(E){return this.type===E}checktype(E){return this.ttnov()===E}ttisnumber(){return this.checktype(ce)}ttisfloat(){return this.checktag(ae)}ttisinteger(){return this.checktag(I)}ttisnil(){return this.checktag(Pe)}ttisboolean(){return this.checktag(Me)}ttislightuserdata(){return this.checktag(xe)}ttisstring(){return this.checktype(Ae)}ttisshrstring(){return this.checktag(Oe)}ttislngstring(){return this.checktag(Ue)}ttistable(){return this.checktag(W)}ttisfunction(){return this.checktype(ye)}ttisclosure(){return(this.type&31)===ye}ttisCclosure(){return this.checktag(Le)}ttisLclosure(){return this.checktag(ut)}ttislcf(){return this.checktag(Ke)}ttisfulluserdata(){return this.checktag(H)}ttisthread(){return this.checktag(_e)}ttisdeadkey(){return this.checktag(gt)}l_isfalse(){return this.ttisnil()||this.ttisboolean()&&this.value===!1}setfltvalue(E){this.type=ae,this.value=E}chgfltvalue(E){Ze(this.type==ae),this.value=E}setivalue(E){this.type=I,this.value=E}chgivalue(E){Ze(this.type==I),this.value=E}setnilvalue(){this.type=Pe,this.value=null}setfvalue(E){this.type=Ke,this.value=E}setpvalue(E){this.type=xe,this.value=E}setbvalue(E){this.type=Me,this.value=E}setsvalue(E){this.type=Ue,this.value=E}setuvalue(E){this.type=H,this.value=E}setthvalue(E){this.type=_e,this.value=E}setclLvalue(E){this.type=ut,this.value=E}setclCvalue(E){this.type=Le,this.value=E}sethvalue(E){this.type=W,this.value=E}setdeadvalue(){this.type=gt,this.value=null}setfrom(E){this.type=E.type,this.value=E.value}tsvalue(){return Ze(this.ttisstring()),this.value}svalue(){return this.tsvalue().getstr()}vslen(){return this.tsvalue().tsslen()}jsstring(E,Ee){return je(this.svalue(),E,Ee,!0)}}const K=function(F,E){F.stack[F.top++]=new ve(E.type,E.value)},M=function(F,E){F.stack[F.top++]=new ve(Ue,E)},O=function(F,E,Ee){F.stack[E].setfrom(F.stack[Ee])},m=function(F,E,Ee){F.stack[E].setfrom(Ee)},g=function(F,E,Ee){F.stack[E].setsvalue(Ee)},w=new ve(Pe,null);Object.freeze(w),Zt.luaO_nilobject=w;class B{constructor(E,Ee){this.id=E.l_G.id_counter++,this.p=null,this.nupvalues=Ee,this.upvals=new Array(Ee)}}class ue{constructor(E,Ee,We){for(this.id=E.l_G.id_counter++,this.f=Ee,this.nupvalues=We,this.upvalue=new Array(We);We--;)this.upvalue[We]=new ve(Pe,null)}}class ot{constructor(E,Ee){this.id=E.l_G.id_counter++,this.metatable=null,this.uservalue=new ve(Pe,null),this.len=Ee,this.data=Object.create(null)}}class st{constructor(){this.varname=null,this.startpc=NaN,this.endpc=NaN}}const Fe=de("..."),y=de('[string "'),V=de('"]'),me=function(F,E){let Ee=F.length,We;if(F[0]===61)Ee<E?(We=new Uint8Array(Ee-1),We.set(F.subarray(1))):(We=new Uint8Array(E),We.set(F.subarray(1,E+1)));else if(F[0]===64)Ee<=E?(We=new Uint8Array(Ee-1),We.set(F.subarray(1))):(We=new Uint8Array(E),We.set(Fe),E-=Fe.length,We.set(F.subarray(Ee-E),Fe.length));else{We=new Uint8Array(E);let b=Ce(F,10);We.set(y);let fe=y.length;E-=y.length+Fe.length+V.length,Ee<E&&b===-1?(We.set(F,fe),fe+=F.length):(b!==-1&&(Ee=b),Ee>E&&(Ee=E),We.set(F.subarray(0,Ee),fe),fe+=Ee,We.set(Fe,fe),fe+=Fe.length),We.set(V,fe),fe+=V.length,We=We.subarray(0,fe)}return We},De=function(F){return Ye(F)?F-48:(F&223)-55},qe=8,d=function(F,E){let Ee=1;if(Ze(E<=1114111),E<128)F[qe-1]=E;else{let We=63;do F[qe-Ee++]=128|E&63,E>>=6,We>>=1;while(E>We);F[qe-Ee]=~We<<1|E}return Ee},te=30,P=function(F){let E=0,Ee=0,We=0,b=0,fe=0,ie,He=!1;for(;x(F[E]);)E++;if(((ie=F[E]===45)||F[E]===43)&&E++,!(F[E]===48&&(F[E+1]===120||F[E+1]===88)))return null;for(E+=2;;E++)if(F[E]===46){if(He)break;He=!0}else if(Y(F[E]))We===0&&F[E]===48?b++:++We<=te?Ee=Ee*16+De(F[E]):fe++,He&&fe--;else break;if(b+We===0)return null;if(fe*=4,F[E]===112||F[E]===80){let mt=0,l;if(E++,((l=F[E]===45)||F[E]===43)&&E++,!Ye(F[E]))return null;for(;Ye(F[E]);)mt=mt*10+F[E++]-48;l&&(mt=-mt),fe+=mt}return ie&&(Ee=-Ee),{n:ft(Ee,fe),i:E}},oe=function(F){try{F=je(F)}catch{return null}let E=/^[\t\v\f \n\r]*[+-]?(?:[0-9]+\.?[0-9]*|\.[0-9]*)(?:[eE][+-]?[0-9]+)?/.exec(F);if(!E)return null;let Ee=parseFloat(E[0]);return isNaN(Ee)?null:{n:Ee,i:E[0].length}},Ne=function(F,E){let Ee=E==="x"?P(F):oe(F);if(Ee===null)return null;for(;x(F[Ee.i]);)Ee.i++;return Ee.i===F.length||F[Ee.i]===0?Ee:null},it=[46,120,88,110,78],Qe={46:".",120:"x",88:"x",110:"n",78:"n"},xt=function(F){let E=F.length,Ee=0;for(let fe=0;fe<E;fe++){let ie=F[fe];if(it.indexOf(ie)!==-1){Ee=ie;break}}let We=Qe[Ee];return We==="n"?null:Ne(F,We)},kt=Math.floor(Et/10),yt=Et%10,wt=function(F){let E=0,Ee=0,We=!0,b;for(;x(F[E]);)E++;if(((b=F[E]===45)||F[E]===43)&&E++,F[E]===48&&(F[E+1]===120||F[E+1]===88))for(E+=2;E<F.length&&Y(F[E]);E++)Ee=Ee*16+De(F[E])|0,We=!1;else for(;E<F.length&&Ye(F[E]);E++){let fe=F[E]-48;if(Ee>=kt&&(Ee>kt||fe>yt+b))return null;Ee=Ee*10+fe|0,We=!1}for(;E<F.length&&x(F[E]);)E++;return We||E!==F.length&&F[E]!==0?null:{n:(b?-Ee:Ee)|0,i:E}},Yt=function(F,E){let Ee=wt(F);return Ee!==null?(E.setivalue(Ee.n),Ee.i+1):(Ee=xt(F),Ee!==null?(E.setfltvalue(Ee.n),Ee.i+1):0)},Vt=function(F,E){let Ee;if(E.ttisinteger())Ee=de(ct(E.value));else{let We=ht(E.value);!at&&/^[-0123456789]+$/.test(We)&&(We+=".0"),Ee=de(We)}E.setsvalue(ne(F,Ee))},Nt=function(F,E){he.luaD_inctop(F),g(F,F.top-1,ze(F,E))},Bt=function(F,E,Ee){let We=0,b=0,fe=0,ie;for(;ie=Ce(E,37,b),ie!=-1;){switch(Nt(F,E.subarray(b,ie)),E[ie+1]){case 115:{let He=Ee[fe++];if(He===null)He=de("(null)",!0);else{He=D(He);let mt=Ce(He,0);mt!==-1&&(He=He.subarray(0,mt))}Nt(F,He);break}case 99:{let He=Ee[fe++];$e(He)?Nt(F,we(He)):Ht(F,de("<\\%d>",!0),He);break}case 100:case 73:he.luaD_inctop(F),F.stack[F.top-1].setivalue(Ee[fe++]),Vt(F,F.stack[F.top-1]);break;case 102:he.luaD_inctop(F),F.stack[F.top-1].setfltvalue(Ee[fe++]),Vt(F,F.stack[F.top-1]);break;case 112:{let He=Ee[fe++];if(He instanceof ee.lua_State||He instanceof nt.Table||He instanceof ot||He instanceof B||He instanceof ue)Nt(F,de("0x"+He.id.toString(16)));else switch(typeof He){case"undefined":Nt(F,de("undefined"));break;case"number":Nt(F,de("Number("+He+")"));break;case"string":Nt(F,de("String("+JSON.stringify(He)+")"));break;case"boolean":Nt(F,de(He?"Boolean(true)":"Boolean(false)"));break;case"object":if(He===null){Nt(F,de("null"));break}case"function":{let mt=F.l_G.ids.get(He);mt||(mt=F.l_G.id_counter++,F.l_G.ids.set(He,mt)),Nt(F,de("0x"+mt.toString(16)));break}default:Nt(F,de("<id NYI>"))}break}case 85:{let He=new Uint8Array(qe),mt=d(He,Ee[fe++]);Nt(F,He.subarray(qe-mt));break}case 37:Nt(F,de("%",!0));break;default:X.luaG_runerror(F,de("invalid option '%%%c' to 'lua_pushfstring'"),E[ie+1])}We+=2,b=ie+2}return he.luaD_checkstack(F,1),Nt(F,E.subarray(b)),We>0&&pt.luaV_concat(F,We+1),F.stack[F.top-1].svalue()},Ht=function(F,E,...Ee){return Bt(F,E,Ee)},Xt=function(F){let E=0;if(F<8)return F;for(;F>=128;)F=F+15>>4,E+=4;for(;F>=16;)F=F+1>>1,E++;return E+1<<3|F-8},$t=function(F,E,Ee,We){switch(E){case f:return Ee+We|0;case Q:return Ee-We|0;case le:return pt.luaV_imul(Ee,We);case ge:return pt.luaV_mod(F,Ee,We);case $:return pt.luaV_div(F,Ee,We);case s:return Ee&We;case T:return Ee|We;case S:return Ee^We;case q:return pt.luaV_shiftl(Ee,We);case Z:return pt.luaV_shiftl(Ee,-We);case Te:return 0-Ee|0;case A:return-1^Ee;default:Ze(0)}},Ft=function(F,E,Ee,We){switch(E){case f:return Ee+We;case Q:return Ee-We;case le:return Ee*We;case R:return Ee/We;case Se:return Math.pow(Ee,We);case $:return Math.floor(Ee/We);case Te:return-Ee;case ge:return bt(F,Ee,We);default:Ze(0)}},zt=function(F,E,Ee,We,b){let fe=typeof b=="number"?F.stack[b]:b;switch(E){case s:case T:case S:case q:case Z:case A:{let ie,He;if((ie=pt.tointeger(Ee))!==!1&&(He=pt.tointeger(We))!==!1){fe.setivalue($t(F,E,ie,He));return}else break}case R:case Se:{let ie,He;if((ie=pt.tonumber(Ee))!==!1&&(He=pt.tonumber(We))!==!1){fe.setfltvalue(Ft(F,E,ie,He));return}else break}default:{let ie,He;if(Ee.ttisinteger()&&We.ttisinteger()){fe.setivalue($t(F,E,Ee.value,We.value));return}else if((ie=pt.tonumber(Ee))!==!1&&(He=pt.tonumber(We))!==!1){fe.setfltvalue(Ft(F,E,ie,He));return}else break}}Ze(F!==null),St.luaT_trybinTM(F,Ee,We,b,E-f+St.TMS.TM_ADD)};return Zt.CClosure=ue,Zt.LClosure=B,Zt.LUA_TDEADKEY=gt,Zt.LUA_TPROTO=tt,Zt.LocVar=st,Zt.TValue=ve,Zt.Udata=ot,Zt.UTF8BUFFSZ=qe,Zt.luaO_arith=zt,Zt.luaO_chunkid=me,Zt.luaO_hexavalue=De,Zt.luaO_int2fb=Xt,Zt.luaO_pushfstring=Ht,Zt.luaO_pushvfstring=Bt,Zt.luaO_str2num=Yt,Zt.luaO_tostring=Vt,Zt.luaO_utf8esc=d,Zt.numarith=Ft,Zt.pushobj2s=K,Zt.pushsvalue2s=M,Zt.setobjs2s=O,Zt.setobj2s=m,Zt.setsvalue2s=g,Zt}var Il;function Ua(){if(Il)return aa;Il=1;const{constant_types:{LUA_TNIL:f}}=rn(),s=Mn();class A{constructor(Se){this.id=Se.l_G.id_counter++,this.k=[],this.p=[],this.code=[],this.cache=null,this.lineinfo=[],this.upvalues=[],this.numparams=0,this.is_vararg=!1,this.maxstacksize=0,this.locvars=[],this.linedefined=0,this.lastlinedefined=0,this.source=null}}const T=function(le,Se){return new s.LClosure(le,Se)},S=function(le,Se){return le.stack[Se]},R=function(le,Se){for(let q=Se;q<le.top;q++){let Z=le.stack[q];le.stack[q]=new s.TValue(Z.type,Z.value)}},$=function(le,Se){for(let q=0;q<Se.nupvalues;q++)Se.upvals[q]=new s.TValue(f,null)},ge=function(le,Se,q){for(let Z=0;Z<le.locvars.length&&le.locvars[Z].startpc<=q;Z++)if(q<le.locvars[Z].endpc&&(Se--,Se===0))return le.locvars[Z].varname.getstr();return null};return aa.MAXUPVAL=255,aa.Proto=A,aa.luaF_findupval=S,aa.luaF_close=R,aa.luaF_getlocalname=ge,aa.luaF_initupvals=$,aa.luaF_newLclosure=T,aa}var ka={},Rt={},En={},Kn={},Ml;function Ha(){if(Ml)return Kn;Ml=1;const{lua_assert:f}=yn();class s{constructor(){this.buffer=null,this.n=0}}const A=function(q){return q.buffer.subarray(0,q.n)},T=function(q,Z){q.n-=Z},S=function(q){q.n=0},R=function(q,Z,Q){let Te=new Uint8Array(Q);Z.buffer&&Te.set(Z.buffer),Z.buffer=Te};class ${constructor(Z,Q,Te){this.L=Z,f(typeof Q=="function","ZIO requires a reader"),this.reader=Q,this.data=Te,this.n=0,this.buffer=null,this.off=0}zgetc(){return this.n-- >0?this.buffer[this.off++]:le(this)}}const ge=-1,le=function(q){let Z=q.reader(q.L,q.data);if(Z===null)return ge;f(Z instanceof Uint8Array,"Should only load binary of array of bytes");let Q=Z.length;return Q===0?ge:(q.buffer=Z,q.off=0,q.n=Q-1,q.buffer[q.off++])},Se=function(q,Z,Q,Te){for(;Te;){if(q.n===0){if(le(q)===ge)return Te;q.n++,q.off--}let J=Te<=q.n?Te:q.n;for(let Me=0;Me<J;Me++)Z[Q++]=q.buffer[q.off++];q.n-=J,q.n===0&&(q.buffer=null),Te-=J}return 0};return Kn.EOZ=ge,Kn.luaZ_buffer=A,Kn.luaZ_buffremove=T,Kn.luaZ_fill=le,Kn.luaZ_read=Se,Kn.luaZ_resetbuffer=S,Kn.luaZ_resizebuffer=R,Kn.MBuffer=s,Kn.ZIO=$,Kn}var Ul;function _l(){if(Ul)return En;Ul=1;const{constant_types:{LUA_TBOOLEAN:f,LUA_TLNGSTR:s},thread_status:{LUA_ERRSYNTAX:A},to_luastring:T}=rn(),{LUA_MINBUFFER:S,MAX_INT:R,lua_assert:$}=yn(),ge=pa(),le=Yn(),{lisdigit:Se,lislalnum:q,lislalpha:Z,lisspace:Q,lisxdigit:Te}=fr(),J=Mn(),{luaS_bless:Me,luaS_hash:Le,luaS_hashlongstr:ye,luaS_new:Ke}=ra(),ut=sa(),{EOZ:xe,luaZ_buffer:Ue,luaZ_buffremove:Pe,luaZ_resetbuffer:ce,luaZ_resizebuffer:ae}=Ha(),I=257,Oe=T("_ENV",!0),Ae=I,W=I+1,_e=I+2,H=I+3,D=I+4,Ce=I+5,we=I+6,je=I+7,de=I+8,Ye=I+9,$e=I+10,x=I+11,Y=I+12,X=I+13,he=I+14,ee=I+15,ne=I+16,ze=I+17,nt=I+18,at=I+19,ft=I+20,ct=I+21,ht=I+22,pt=I+23,Et=I+24,bt=I+25,Ze=I+26,St=I+27,tt=I+28,gt=I+29,ve=I+30,K=I+31,M=I+32,O=I+33,m=I+34,g=I+35,w=I+36,B={TK_AND:Ae,TK_BREAK:W,TK_DO:_e,TK_ELSE:H,TK_ELSEIF:D,TK_END:Ce,TK_FALSE:we,TK_FOR:je,TK_FUNCTION:de,TK_GOTO:Ye,TK_IF:$e,TK_IN:x,TK_LOCAL:Y,TK_NIL:X,TK_NOT:he,TK_OR:ee,TK_REPEAT:ne,TK_RETURN:ze,TK_THEN:nt,TK_TRUE:at,TK_UNTIL:ft,TK_WHILE:ct,TK_IDIV:ht,TK_CONCAT:pt,TK_DOTS:Et,TK_EQ:bt,TK_GE:Ze,TK_LE:St,TK_NE:tt,TK_SHL:gt,TK_SHR:ve,TK_DBCOLON:K,TK_EOS:M,TK_FLT:O,TK_INT:m,TK_NAME:g,TK_STRING:w},ue=["and","break","do","else","elseif","end","false","for","function","goto","if","in","local","nil","not","or","repeat","return","then","true","until","while","//","..","...","==",">=","<=","~=","<<",">>","::","<eof>","<number>","<integer>","<name>","<string>"].map((b,fe)=>T(b));class ot{constructor(){this.r=NaN,this.i=NaN,this.ts=null}}class st{constructor(){this.token=NaN,this.seminfo=new ot}}class Fe{constructor(){this.current=NaN,this.linenumber=NaN,this.lastline=NaN,this.t=new st,this.lookahead=new st,this.fs=null,this.L=null,this.z=null,this.buff=null,this.h=null,this.dyd=null,this.source=null,this.envn=null}}const y=function(b,fe){let ie=b.buff;if(ie.n+1>ie.buffer.length){ie.buffer.length>=R/2&&kt(b,T("lexical element too long",!0),0);let He=ie.buffer.length*2;ae(b.L,ie,He)}ie.buffer[ie.n++]=fe<0?255+fe+1:fe},V=function(b,fe){if(fe<I)return J.luaO_pushfstring(b.L,T("'%c'",!0),fe);{let ie=ue[fe-I];return fe<M?J.luaO_pushfstring(b.L,T("'%s'",!0),ie):ie}},me=function(b){return b.current===10||b.current===13},De=function(b){b.current=b.z.zgetc()},qe=function(b){y(b,b.current),De(b)},d=new J.TValue(f,!0),te=function(b,fe){let ie=b.L,He=Ke(ie,fe),mt=b.h.strong.get(ye(He));if(mt)He=mt.key.tsvalue();else{let l=new J.TValue(s,He);ut.luaH_setfrom(ie,b.h,l,d)}return He},P=function(b){let fe=b.current;$(me(b)),De(b),me(b)&&b.current!==fe&&De(b),++b.linenumber>=R&&kt(b,T("chunk has too many lines",!0),0)},oe=function(b,fe,ie,He,mt){fe.t={token:0,seminfo:new ot},fe.L=b,fe.current=mt,fe.lookahead={token:M,seminfo:new ot},fe.z=ie,fe.fs=null,fe.linenumber=1,fe.lastline=1,fe.source=He,fe.envn=Me(b,Oe),ae(b,fe.buff,S)},Ne=function(b,fe){return b.current===fe?(De(b),!0):!1},it=function(b,fe){return b.current===fe[0].charCodeAt(0)||b.current===fe[1].charCodeAt(0)?(qe(b),!0):!1},Qe=function(b,fe){let ie="Ee",He=b.current;for($(Se(b.current)),qe(b),He===48&&it(b,"xX")&&(ie="Pp");;)if(it(b,ie)&&it(b,"-+"),Te(b.current))qe(b);else if(b.current===46)qe(b);else break;let mt=new J.TValue;return J.luaO_str2num(Ue(b.buff),mt)===0&&kt(b,T("malformed number",!0),O),mt.ttisinteger()?(fe.i=mt.value,m):($(mt.ttisfloat()),fe.r=mt.value,O)},xt=function(b,fe){switch(fe){case g:case w:case O:case m:return J.luaO_pushfstring(b.L,T("'%s'",!0),Ue(b.buff));default:return V(b,fe)}},kt=function(b,fe,ie){fe=ge.luaG_addinfo(b.L,fe,b.source,b.linenumber),ie&&J.luaO_pushfstring(b.L,T("%s near %s"),fe,xt(b,ie)),le.luaD_throw(b.L,A)},yt=function(b,fe){kt(b,fe,b.t.token)},wt=function(b){let fe=0,ie=b.current;for($(ie===91||ie===93),qe(b);b.current===61;)qe(b),fe++;return b.current===ie?fe:-fe-1},Yt=function(b,fe,ie){let He=b.linenumber;qe(b),me(b)&&P(b);let mt=!1;for(;!mt;)switch(b.current){case xe:{let n=`unfinished long ${fe?"string":"comment"} (starting at line ${He})`;kt(b,T(n),M);break}case 93:{wt(b)===ie&&(qe(b),mt=!0);break}case 10:case 13:{y(b,10),P(b),fe||ce(b.buff);break}default:fe?qe(b):De(b)}fe&&(fe.ts=te(b,b.buff.buffer.subarray(2+ie,b.buff.n-(2+ie))))},Vt=function(b,fe,ie){fe||(b.current!==xe&&qe(b),kt(b,ie,w))},Nt=function(b){return qe(b),Vt(b,Te(b.current),T("hexadecimal digit expected",!0)),J.luaO_hexavalue(b.current)},Bt=function(b){let fe=Nt(b);return fe=(fe<<4)+Nt(b),Pe(b.buff,2),fe},Ht=function(b){let fe=4;qe(b),Vt(b,b.current===123,T("missing '{'",!0));let ie=Nt(b);for(qe(b);Te(b.current);)fe++,ie=(ie<<4)+J.luaO_hexavalue(b.current),Vt(b,ie<=1114111,T("UTF-8 value too large",!0)),qe(b);return Vt(b,b.current===125,T("missing '}'",!0)),De(b),Pe(b.buff,fe),ie},Xt=function(b){let fe=new Uint8Array(J.UTF8BUFFSZ),ie=J.luaO_utf8esc(fe,Ht(b));for(;ie>0;ie--)y(b,fe[J.UTF8BUFFSZ-ie])},$t=function(b){let fe=0,ie;for(ie=0;ie<3&&Se(b.current);ie++)fe=10*fe+b.current-48,qe(b);return Vt(b,fe<=255,T("decimal escape too large",!0)),Pe(b.buff,ie),fe},Ft=function(b,fe,ie){for(qe(b);b.current!==fe;)switch(b.current){case xe:kt(b,T("unfinished string",!0),M);break;case 10:case 13:kt(b,T("unfinished string",!0),w);break;case 92:{qe(b);let He,mt;switch(b.current){case 97:mt=7,He="read_save";break;case 98:mt=8,He="read_save";break;case 102:mt=12,He="read_save";break;case 110:mt=10,He="read_save";break;case 114:mt=13,He="read_save";break;case 116:mt=9,He="read_save";break;case 118:mt=11,He="read_save";break;case 120:mt=Bt(b),He="read_save";break;case 117:Xt(b),He="no_save";break;case 10:case 13:P(b),mt=10,He="only_save";break;case 92:case 34:case 39:mt=b.current,He="read_save";break;case xe:He="no_save";break;case 122:{for(Pe(b.buff,1),De(b);Q(b.current);)me(b)?P(b):De(b);He="no_save";break}default:{Vt(b,Se(b.current),T("invalid escape sequence",!0)),mt=$t(b),He="only_save";break}}He==="read_save"&&De(b),(He==="read_save"||He==="only_save")&&(Pe(b.buff,1),y(b,mt));break}default:qe(b)}qe(b),ie.ts=te(b,b.buff.buffer.subarray(1,b.buff.n-1))},zt=Object.create(null);ue.forEach((b,fe)=>zt[Le(b)]=fe);const F=function(b){let fe=zt[ye(b)];return fe!==void 0&&fe<=22},E=function(b,fe){for(ce(b.buff);;)switch($(typeof b.current=="number"),b.current){case 10:case 13:{P(b);break}case 32:case 12:case 9:case 11:{De(b);break}case 45:{if(De(b),b.current!==45)return 45;if(De(b),b.current===91){let ie=wt(b);if(ce(b.buff),ie>=0){Yt(b,null,ie),ce(b.buff);break}}for(;!me(b)&&b.current!==xe;)De(b);break}case 91:{let ie=wt(b);return ie>=0?(Yt(b,fe,ie),w):(ie!==-1&&kt(b,T("invalid long string delimiter",!0),w),91)}case 61:return De(b),Ne(b,61)?bt:61;case 60:return De(b),Ne(b,61)?St:Ne(b,60)?gt:60;case 62:return De(b),Ne(b,61)?Ze:Ne(b,62)?ve:62;case 47:return De(b),Ne(b,47)?ht:47;case 126:return De(b),Ne(b,61)?tt:126;case 58:return De(b),Ne(b,58)?K:58;case 34:case 39:return Ft(b,b.current,fe),w;case 46:return qe(b),Ne(b,46)?Ne(b,46)?Et:pt:Se(b.current)?Qe(b,fe):46;case 48:case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:return Qe(b,fe);case xe:return M;default:if(Z(b.current)){do qe(b);while(q(b.current));let ie=te(b,Ue(b.buff));fe.ts=ie;let He=zt[ye(ie)];return He!==void 0&&He<=22?He+I:g}else{let ie=b.current;return De(b),ie}}},Ee=function(b){b.lastline=b.linenumber,b.lookahead.token!==M?(b.t.token=b.lookahead.token,b.t.seminfo.i=b.lookahead.seminfo.i,b.t.seminfo.r=b.lookahead.seminfo.r,b.t.seminfo.ts=b.lookahead.seminfo.ts,b.lookahead.token=M):b.t.token=E(b,b.t.seminfo)},We=function(b){return $(b.lookahead.token===M),b.lookahead.token=E(b,b.lookahead.seminfo),b.lookahead.token};return En.FIRST_RESERVED=I,En.LUA_ENV=Oe,En.LexState=Fe,En.RESERVED=B,En.isreserved=F,En.luaX_lookahead=We,En.luaX_newstring=te,En.luaX_next=Ee,En.luaX_setinput=oe,En.luaX_syntaxerror=yt,En.luaX_token2str=V,En.luaX_tokens=ue,En}var Cl;function cs(){if(Cl)return Rt;Cl=1;const{LUA_MULTRET:f,LUA_OPADD:s,LUA_OPBAND:A,LUA_OPBNOT:T,LUA_OPBOR:S,LUA_OPBXOR:R,LUA_OPDIV:$,LUA_OPIDIV:ge,LUA_OPMOD:le,LUA_OPSHL:Se,LUA_OPSHR:q,LUA_OPUNM:Z,constant_types:{LUA_TBOOLEAN:Q,LUA_TLIGHTUSERDATA:Te,LUA_TLNGSTR:J,LUA_TNIL:Me,LUA_TNUMFLT:Le,LUA_TNUMINT:ye,LUA_TTABLE:Ke},to_luastring:ut}=rn(),{lua_assert:xe}=yn(),Ue=_l(),Pe=Mn(),ce=xa(),ae=_r(),I=sa(),Oe=Ia(),Ae=ce.OpCodesI,W=Pe.TValue,_e=255,H=-1,D={OPR_ADD:0,OPR_SUB:1,OPR_MUL:2,OPR_MOD:3,OPR_POW:4,OPR_DIV:5,OPR_IDIV:6,OPR_BAND:7,OPR_BOR:8,OPR_BXOR:9,OPR_SHL:10,OPR_SHR:11,OPR_CONCAT:12,OPR_EQ:13,OPR_LT:14,OPR_LE:15,OPR_NE:16,OPR_GT:17,OPR_GE:18,OPR_AND:19,OPR_OR:20,OPR_NOBINOPR:21},Ce={OPR_MINUS:0,OPR_BNOT:1,OPR_NOT:2,OPR_LEN:3,OPR_NOUNOPR:4},we=function(l){return l.t!==l.f},je=function(l,n){let u=ae.expkind;if(we(l))return!1;switch(l.k){case u.VKINT:return n?new W(ye,l.u.ival):!0;case u.VKFLT:return n?new W(Le,l.u.nval):!0;default:return!1}},de=function(l,n,u){let o,C=n+u-1;if(l.pc>l.lasttarget&&(o=l.f.code[l.pc-1],o.opcode===Ae.OP_LOADNIL)){let se=o.A,Ve=se+o.B;if(se<=n&&n<=Ve+1||n<=se&&se<=C+1){se<n&&(n=se),Ve>C&&(C=Ve),ce.SETARG_A(o,n),ce.SETARG_B(o,C-n);return}}tt(l,Ae.OP_LOADNIL,n,u-1,0)},Ye=function(l,n){return l.f.code[n.u.info]},$e=function(l,n){let u=l.f.code[n].sBx;return u===H?H:n+1+u},x=function(l,n,u){let o=l.f.code[n],C=u-(n+1);xe(u!==H),Math.abs(C)>ce.MAXARG_sBx&&Ue.luaX_syntaxerror(l.ls,ut("control structure too long",!0)),ce.SETARG_sBx(o,C)},Y=function(l,n,u){if(u===H)return n;if(n===H)n=u;else{let o=n,C=$e(l,o);for(;C!==H;)o=C,C=$e(l,o);x(l,o,u)}return n},X=function(l){let n=l.jpc;l.jpc=H;let u=ve(l,Ae.OP_JMP,0,H);return u=Y(l,u,n),u},he=function(l,n){return bt(l,X(l),n)},ee=function(l,n,u){tt(l,Ae.OP_RETURN,n,u+1,0)},ne=function(l,n,u,o,C){return tt(l,n,u,o,C),X(l)},ze=function(l){return l.lasttarget=l.pc,l.pc},nt=function(l,n){return n>=1&&ce.testTMode(l.f.code[n-1].opcode)?n-1:n},at=function(l,n){return l.f.code[nt(l,n)]},ft=function(l,n,u){let o=nt(l,n),C=l.f.code[o];return C.opcode!==Ae.OP_TESTSET?!1:(u!==ce.NO_REG&&u!==C.B?ce.SETARG_A(C,u):l.f.code[o]=ce.CREATE_ABC(Ae.OP_TEST,C.B,0,C.C),!0)},ct=function(l,n){for(;n!==H;n=$e(l,n))ft(l,n,ce.NO_REG)},ht=function(l,n,u,o,C){for(;n!==H;){let se=$e(l,n);ft(l,n,o)?x(l,n,u):x(l,n,C),n=se}},pt=function(l){ht(l,l.jpc,l.pc,ce.NO_REG,l.pc),l.jpc=H},Et=function(l,n){ze(l),l.jpc=Y(l,l.jpc,n)},bt=function(l,n,u){u===l.pc?Et(l,n):(xe(u<l.pc),ht(l,n,u,ce.NO_REG,u))},Ze=function(l,n,u){for(u++;n!==H;n=$e(l,n)){let o=l.f.code[n];xe(o.opcode===Ae.OP_JMP&&(o.A===0||o.A>=u)),ce.SETARG_A(o,u)}},St=function(l,n){let u=l.f;return pt(l),u.code[l.pc]=n,u.lineinfo[l.pc]=l.ls.lastline,l.pc++},tt=function(l,n,u,o,C){return xe(ce.getOpMode(n)===ce.iABC),xe(ce.getBMode(n)!==ce.OpArgN||o===0),xe(ce.getCMode(n)!==ce.OpArgN||C===0),xe(u<=ce.MAXARG_A&&o<=ce.MAXARG_B&&C<=ce.MAXARG_C),St(l,ce.CREATE_ABC(n,u,o,C))},gt=function(l,n,u,o){return xe(ce.getOpMode(n)===ce.iABx||ce.getOpMode(n)===ce.iAsBx),xe(ce.getCMode(n)===ce.OpArgN),xe(u<=ce.MAXARG_A&&o<=ce.MAXARG_Bx),St(l,ce.CREATE_ABx(n,u,o))},ve=function(l,n,u,o){return gt(l,n,u,o+ce.MAXARG_sBx)},K=function(l,n){return xe(n<=ce.MAXARG_Ax),St(l,ce.CREATE_Ax(Ae.OP_EXTRAARG,n))},M=function(l,n,u){if(u<=ce.MAXARG_Bx)return gt(l,Ae.OP_LOADK,n,u);{let o=gt(l,Ae.OP_LOADKX,n,0);return K(l,u),o}},O=function(l,n){let u=l.freereg+n;u>l.f.maxstacksize&&(u>=_e&&Ue.luaX_syntaxerror(l.ls,ut("function or expression needs too many registers",!0)),l.f.maxstacksize=u)},m=function(l,n){O(l,n),l.freereg+=n},g=function(l,n){!ce.ISK(n)&&n>=l.nactvar&&(l.freereg--,xe(n===l.freereg))},w=function(l,n){n.k===ae.expkind.VNONRELOC&&g(l,n.u.info)},B=function(l,n,u){let o=n.k===ae.expkind.VNONRELOC?n.u.info:-1,C=u.k===ae.expkind.VNONRELOC?u.u.info:-1;o>C?(g(l,o),g(l,C)):(g(l,C),g(l,o))},ue=function(l,n,u){let o=l.f,C=I.luaH_get(l.L,l.ls.h,n);if(C.ttisinteger()){let Ve=C.value;if(Ve<l.nk&&o.k[Ve].ttype()===u.ttype()&&o.k[Ve].value===u.value)return Ve}let se=l.nk;return I.luaH_setfrom(l.L,l.ls.h,n,new Pe.TValue(ye,se)),o.k[se]=u,l.nk++,se},ot=function(l,n){let u=new W(J,n);return ue(l,u,u)},st=function(l,n){let u=new W(Te,n),o=new W(ye,n);return ue(l,u,o)},Fe=function(l,n){let u=new W(Le,n);return ue(l,u,u)},y=function(l,n){let u=new W(Q,n);return ue(l,u,u)},V=function(l){let n=new W(Me,null),u=new W(Ke,l.ls.h);return ue(l,u,n)},me=function(l,n,u){let o=ae.expkind;if(n.k===o.VCALL)ce.SETARG_C(Ye(l,n),u+1);else if(n.k===o.VVARARG){let C=Ye(l,n);ce.SETARG_B(C,u+1),ce.SETARG_A(C,l.freereg),m(l,1)}else xe(u===f)},De=function(l,n){me(l,n,f)},qe=function(l,n){let u=ae.expkind;n.k===u.VCALL?(xe(Ye(l,n).C===2),n.k=u.VNONRELOC,n.u.info=Ye(l,n).A):n.k===u.VVARARG&&(ce.SETARG_B(Ye(l,n),2),n.k=u.VRELOCABLE)},d=function(l,n){let u=ae.expkind;switch(n.k){case u.VLOCAL:{n.k=u.VNONRELOC;break}case u.VUPVAL:{n.u.info=tt(l,Ae.OP_GETUPVAL,0,n.u.info,0),n.k=u.VRELOCABLE;break}case u.VINDEXED:{let o;g(l,n.u.ind.idx),n.u.ind.vt===u.VLOCAL?(g(l,n.u.ind.t),o=Ae.OP_GETTABLE):(xe(n.u.ind.vt===u.VUPVAL),o=Ae.OP_GETTABUP),n.u.info=tt(l,o,0,n.u.ind.t,n.u.ind.idx),n.k=u.VRELOCABLE;break}case u.VVARARG:case u.VCALL:{qe(l,n);break}}},te=function(l,n,u,o){return ze(l),tt(l,Ae.OP_LOADBOOL,n,u,o)},P=function(l,n,u){let o=ae.expkind;switch(d(l,n),n.k){case o.VNIL:{de(l,u,1);break}case o.VFALSE:case o.VTRUE:{tt(l,Ae.OP_LOADBOOL,u,n.k===o.VTRUE,0);break}case o.VK:{M(l,u,n.u.info);break}case o.VKFLT:{M(l,u,Fe(l,n.u.nval));break}case o.VKINT:{M(l,u,st(l,n.u.ival));break}case o.VRELOCABLE:{let C=Ye(l,n);ce.SETARG_A(C,u);break}case o.VNONRELOC:{u!==n.u.info&&tt(l,Ae.OP_MOVE,u,n.u.info,0);break}default:{xe(n.k===o.VJMP);return}}n.u.info=u,n.k=o.VNONRELOC},oe=function(l,n){n.k!==ae.expkind.VNONRELOC&&(m(l,1),P(l,n,l.freereg-1))},Ne=function(l,n){for(;n!==H;n=$e(l,n))if(at(l,n).opcode!==Ae.OP_TESTSET)return!0;return!1},it=function(l,n,u){let o=ae.expkind;if(P(l,n,u),n.k===o.VJMP&&(n.t=Y(l,n.t,n.u.info)),we(n)){let C,se=H,Ve=H;if(Ne(l,n.t)||Ne(l,n.f)){let dt=n.k===o.VJMP?H:X(l);se=te(l,u,0,1),Ve=te(l,u,1,0),Et(l,dt)}C=ze(l),ht(l,n.f,C,u,se),ht(l,n.t,C,u,Ve)}n.f=n.t=H,n.u.info=u,n.k=o.VNONRELOC},Qe=function(l,n){d(l,n),w(l,n),m(l,1),it(l,n,l.freereg-1)},xt=function(l,n){if(d(l,n),n.k===ae.expkind.VNONRELOC){if(!we(n))return n.u.info;if(n.u.info>=l.nactvar)return it(l,n,n.u.info),n.u.info}return Qe(l,n),n.u.info},kt=function(l,n){(n.k!==ae.expkind.VUPVAL||we(n))&&xt(l,n)},yt=function(l,n){we(n)?xt(l,n):d(l,n)},wt=function(l,n){let u=ae.expkind,o=!1;switch(yt(l,n),n.k){case u.VTRUE:n.u.info=y(l,!0),o=!0;break;case u.VFALSE:n.u.info=y(l,!1),o=!0;break;case u.VNIL:n.u.info=V(l),o=!0;break;case u.VKINT:n.u.info=st(l,n.u.ival),o=!0;break;case u.VKFLT:n.u.info=Fe(l,n.u.nval),o=!0;break;case u.VK:o=!0;break}return o&&(n.k=u.VK,n.u.info<=ce.MAXINDEXRK)?ce.RKASK(n.u.info):xt(l,n)},Yt=function(l,n,u){let o=ae.expkind;switch(n.k){case o.VLOCAL:{w(l,u),it(l,u,n.u.info);return}case o.VUPVAL:{let C=xt(l,u);tt(l,Ae.OP_SETUPVAL,C,n.u.info,0);break}case o.VINDEXED:{let C=n.u.ind.vt===o.VLOCAL?Ae.OP_SETTABLE:Ae.OP_SETTABUP,se=wt(l,u);tt(l,C,n.u.ind.t,n.u.ind.idx,se);break}}w(l,u)},Vt=function(l,n,u){xt(l,n);let o=n.u.info;w(l,n),n.u.info=l.freereg,n.k=ae.expkind.VNONRELOC,m(l,2),tt(l,Ae.OP_SELF,n.u.info,o,wt(l,u)),w(l,u)},Nt=function(l,n){let u=at(l,n.u.info);xe(ce.testTMode(u.opcode)&&u.opcode!==Ae.OP_TESTSET&&u.opcode!==Ae.OP_TEST),ce.SETARG_A(u,!u.A)},Bt=function(l,n,u){if(n.k===ae.expkind.VRELOCABLE){let o=Ye(l,n);if(o.opcode===Ae.OP_NOT)return l.pc--,ne(l,Ae.OP_TEST,o.B,0,!u)}return oe(l,n),w(l,n),ne(l,Ae.OP_TESTSET,ce.NO_REG,n.u.info,u)},Ht=function(l,n){let u=ae.expkind,o;switch(d(l,n),n.k){case u.VJMP:{Nt(l,n),o=n.u.info;break}case u.VK:case u.VKFLT:case u.VKINT:case u.VTRUE:{o=H;break}default:{o=Bt(l,n,0);break}}n.f=Y(l,n.f,o),Et(l,n.t),n.t=H},Xt=function(l,n){let u=ae.expkind,o;switch(d(l,n),n.k){case u.VJMP:{o=n.u.info;break}case u.VNIL:case u.VFALSE:{o=H;break}default:{o=Bt(l,n,1);break}}n.t=Y(l,n.t,o),Et(l,n.f),n.f=H},$t=function(l,n){let u=ae.expkind;switch(d(l,n),n.k){case u.VNIL:case u.VFALSE:{n.k=u.VTRUE;break}case u.VK:case u.VKFLT:case u.VKINT:case u.VTRUE:{n.k=u.VFALSE;break}case u.VJMP:{Nt(l,n);break}case u.VRELOCABLE:case u.VNONRELOC:{oe(l,n),w(l,n),n.u.info=tt(l,Ae.OP_NOT,0,n.u.info,0),n.k=u.VRELOCABLE;break}}{let o=n.f;n.f=n.t,n.t=o}ct(l,n.f),ct(l,n.t)},Ft=function(l,n,u){let o=ae.expkind;xe(!we(n)&&(ae.vkisinreg(n.k)||n.k===o.VUPVAL)),n.u.ind.t=n.u.info,n.u.ind.idx=wt(l,u),n.u.ind.vt=n.k===o.VUPVAL?o.VUPVAL:o.VLOCAL,n.k=o.VINDEXED},zt=function(l,n,u){switch(l){case A:case S:case R:case Se:case q:case T:return Oe.tointeger(n)!==!1&&Oe.tointeger(u)!==!1;case $:case ge:case le:return u.value!==0;default:return 1}},F=function(l,n,u){let o=ae.expkind,C,se;if(!(C=je(n,!0))||!(se=je(u,!0))||!zt(l,C,se))return 0;let Ve=new W;if(Pe.luaO_arith(null,l,C,se,Ve),Ve.ttisinteger())n.k=o.VKINT,n.u.ival=Ve.value;else{let dt=Ve.value;if(isNaN(dt)||dt===0)return!1;n.k=o.VKFLT,n.u.nval=dt}return!0},E=function(l,n,u,o){let C=xt(l,u);w(l,u),u.u.info=tt(l,n,0,C,0),u.k=ae.expkind.VRELOCABLE,He(l,o)},Ee=function(l,n,u,o,C){let se=wt(l,o),Ve=wt(l,u);B(l,u,o),u.u.info=tt(l,n,0,Ve,se),u.k=ae.expkind.VRELOCABLE,He(l,C)},We=function(l,n,u,o){let C=ae.expkind,se;u.k===C.VK?se=ce.RKASK(u.u.info):(xe(u.k===C.VNONRELOC),se=u.u.info);let Ve=wt(l,o);switch(B(l,u,o),n){case D.OPR_NE:{u.u.info=ne(l,Ae.OP_EQ,0,se,Ve);break}case D.OPR_GT:case D.OPR_GE:{let dt=n-D.OPR_NE+Ae.OP_EQ;u.u.info=ne(l,dt,1,Ve,se);break}default:{let dt=n-D.OPR_EQ+Ae.OP_EQ;u.u.info=ne(l,dt,1,se,Ve);break}}u.k=C.VJMP},b=function(l,n,u,o){let C=new ae.expdesc;switch(C.k=ae.expkind.VKINT,C.u.ival=C.u.nval=C.u.info=0,C.t=H,C.f=H,n){case Ce.OPR_MINUS:case Ce.OPR_BNOT:if(F(n+Z,u,C))break;case Ce.OPR_LEN:E(l,n+Ae.OP_UNM,u,o);break;case Ce.OPR_NOT:$t(l,u);break}},fe=function(l,n,u){switch(n){case D.OPR_AND:{Ht(l,u);break}case D.OPR_OR:{Xt(l,u);break}case D.OPR_CONCAT:{Qe(l,u);break}case D.OPR_ADD:case D.OPR_SUB:case D.OPR_MUL:case D.OPR_DIV:case D.OPR_IDIV:case D.OPR_MOD:case D.OPR_POW:case D.OPR_BAND:case D.OPR_BOR:case D.OPR_BXOR:case D.OPR_SHL:case D.OPR_SHR:{je(u,!1)||wt(l,u);break}default:{wt(l,u);break}}},ie=function(l,n,u,o,C){let se=ae.expkind;switch(n){case D.OPR_AND:{xe(u.t===H),d(l,o),o.f=Y(l,o.f,u.f),u.to(o);break}case D.OPR_OR:{xe(u.f===H),d(l,o),o.t=Y(l,o.t,u.t),u.to(o);break}case D.OPR_CONCAT:{yt(l,o);let Ve=Ye(l,o);o.k===se.VRELOCABLE&&Ve.opcode===Ae.OP_CONCAT?(xe(u.u.info===Ve.B-1),w(l,u),ce.SETARG_B(Ve,u.u.info),u.k=se.VRELOCABLE,u.u.info=o.u.info):(Qe(l,o),Ee(l,Ae.OP_CONCAT,u,o,C));break}case D.OPR_ADD:case D.OPR_SUB:case D.OPR_MUL:case D.OPR_DIV:case D.OPR_IDIV:case D.OPR_MOD:case D.OPR_POW:case D.OPR_BAND:case D.OPR_BOR:case D.OPR_BXOR:case D.OPR_SHL:case D.OPR_SHR:{F(n+s,u,o)||Ee(l,n+Ae.OP_ADD,u,o,C);break}case D.OPR_EQ:case D.OPR_LT:case D.OPR_LE:case D.OPR_NE:case D.OPR_GT:case D.OPR_GE:{We(l,n,u,o);break}}return u},He=function(l,n){l.f.lineinfo[l.pc-1]=n},mt=function(l,n,u,o){let C=(u-1)/ce.LFIELDS_PER_FLUSH+1,se=o===f?0:o;xe(o!==0&&o<=ce.LFIELDS_PER_FLUSH),C<=ce.MAXARG_C?tt(l,Ae.OP_SETLIST,n,se,C):C<=ce.MAXARG_Ax?(tt(l,Ae.OP_SETLIST,n,se,0),K(l,C)):Ue.luaX_syntaxerror(l.ls,ut("constructor too long",!0)),l.freereg=n+1};return Rt.BinOpr=D,Rt.NO_JUMP=H,Rt.UnOpr=Ce,Rt.getinstruction=Ye,Rt.luaK_checkstack=O,Rt.luaK_code=St,Rt.luaK_codeABC=tt,Rt.luaK_codeABx=gt,Rt.luaK_codeAsBx=ve,Rt.luaK_codek=M,Rt.luaK_concat=Y,Rt.luaK_dischargevars=d,Rt.luaK_exp2RK=wt,Rt.luaK_exp2anyreg=xt,Rt.luaK_exp2anyregup=kt,Rt.luaK_exp2nextreg=Qe,Rt.luaK_exp2val=yt,Rt.luaK_fixline=He,Rt.luaK_getlabel=ze,Rt.luaK_goiffalse=Xt,Rt.luaK_goiftrue=Ht,Rt.luaK_indexed=Ft,Rt.luaK_infix=fe,Rt.luaK_intK=st,Rt.luaK_jump=X,Rt.luaK_jumpto=he,Rt.luaK_nil=de,Rt.luaK_numberK=Fe,Rt.luaK_patchclose=Ze,Rt.luaK_patchlist=bt,Rt.luaK_patchtohere=Et,Rt.luaK_posfix=ie,Rt.luaK_prefix=b,Rt.luaK_reserveregs=m,Rt.luaK_ret=ee,Rt.luaK_self=Vt,Rt.luaK_setlist=mt,Rt.luaK_setmultret=De,Rt.luaK_setoneret=qe,Rt.luaK_setreturns=me,Rt.luaK_storevar=Yt,Rt.luaK_stringK=ot,Rt}var Pl;function _r(){if(Pl)return ka;Pl=1;const{LUA_MULTRET:f,to_luastring:s}=rn(),{BinOpr:{OPR_ADD:A,OPR_AND:T,OPR_BAND:S,OPR_BOR:R,OPR_BXOR:$,OPR_CONCAT:ge,OPR_DIV:le,OPR_EQ:Se,OPR_GE:q,OPR_GT:Z,OPR_IDIV:Q,OPR_LE:Te,OPR_LT:J,OPR_MOD:Me,OPR_MUL:Le,OPR_NE:ye,OPR_NOBINOPR:Ke,OPR_OR:ut,OPR_POW:xe,OPR_SHL:Ue,OPR_SHR:Pe,OPR_SUB:ce},UnOpr:{OPR_BNOT:ae,OPR_LEN:I,OPR_MINUS:Oe,OPR_NOT:Ae,OPR_NOUNOPR:W},NO_JUMP:_e,getinstruction:H,luaK_checkstack:D,luaK_codeABC:Ce,luaK_codeABx:we,luaK_codeAsBx:je,luaK_codek:de,luaK_concat:Ye,luaK_dischargevars:$e,luaK_exp2RK:x,luaK_exp2anyreg:Y,luaK_exp2anyregup:X,luaK_exp2nextreg:he,luaK_exp2val:ee,luaK_fixline:ne,luaK_getlabel:ze,luaK_goiffalse:nt,luaK_goiftrue:at,luaK_indexed:ft,luaK_infix:ct,luaK_intK:ht,luaK_jump:pt,luaK_jumpto:Et,luaK_nil:bt,luaK_patchclose:Ze,luaK_patchlist:St,luaK_patchtohere:tt,luaK_posfix:gt,luaK_prefix:ve,luaK_reserveregs:K,luaK_ret:M,luaK_self:O,luaK_setlist:m,luaK_setmultret:g,luaK_setoneret:w,luaK_setreturns:B,luaK_storevar:ue,luaK_stringK:ot}=cs(),st=Yn(),Fe=Ua(),y=_l(),{LUAI_MAXCCALLS:V,MAX_INT:me,lua_assert:De}=yn(),qe=Mn(),{OpCodesI:{OP_CALL:d,OP_CLOSURE:te,OP_FORLOOP:P,OP_FORPREP:oe,OP_GETUPVAL:Ne,OP_MOVE:it,OP_NEWTABLE:Qe,OP_SETTABLE:xt,OP_TAILCALL:kt,OP_TFORCALL:yt,OP_TFORLOOP:wt,OP_VARARG:Yt},LFIELDS_PER_FLUSH:Vt,SETARG_B:Nt,SETARG_C:Bt,SET_OPCODE:Ht}=xa(),{luaS_eqlngstr:Xt,luaS_new:$t,luaS_newliteral:Ft}=ra(),zt=sa(),F=Fe.Proto,E=y.RESERVED,Ee=200,We=function(a){return a===ie.VCALL||a===ie.VVARARG},b=function(a,h){return Xt(a,h)};class fe{constructor(){this.previous=null,this.firstlabel=NaN,this.firstgoto=NaN,this.nactvar=NaN,this.upval=NaN,this.isloop=NaN}}const ie={VVOID:0,VNIL:1,VTRUE:2,VFALSE:3,VK:4,VKFLT:5,VKINT:6,VNONRELOC:7,VLOCAL:8,VUPVAL:9,VINDEXED:10,VJMP:11,VRELOCABLE:12,VCALL:13,VVARARG:14},He=function(a){return ie.VLOCAL<=a&&a<=ie.VINDEXED},mt=function(a){return a===ie.VNONRELOC||a===ie.VLOCAL};class l{constructor(){this.k=NaN,this.u={ival:NaN,nval:NaN,info:NaN,ind:{idx:NaN,t:NaN,vt:NaN}},this.t=NaN,this.f=NaN}to(h){this.k=h.k,this.u=h.u,this.t=h.t,this.f=h.f}}class n{constructor(){this.f=null,this.prev=null,this.ls=null,this.bl=null,this.pc=NaN,this.lasttarget=NaN,this.jpc=NaN,this.nk=NaN,this.np=NaN,this.firstlocal=NaN,this.nlocvars=NaN,this.nactvar=NaN,this.nups=NaN,this.freereg=NaN}}class u{constructor(){this.idx=NaN}}class o{constructor(){this.name=null,this.pc=NaN,this.line=NaN,this.nactvar=NaN}}class C{constructor(){this.arr=[],this.n=NaN,this.size=NaN}}class se{constructor(){this.actvar={arr:[],n:NaN,size:NaN},this.gt=new C,this.label=new C}}const Ve=function(a,h){a.t.token=0,y.luaX_syntaxerror(a,h)},dt=function(a,h){y.luaX_syntaxerror(a,qe.luaO_pushfstring(a.L,s("%s expected",!0),y.luaX_token2str(a,h)))},Dt=function(a,h,N){let L=a.ls.L,Re=a.f.linedefined,et=Re===0?s("main function",!0):qe.luaO_pushfstring(L,s("function at line %d",!0),Re),vt=qe.luaO_pushfstring(L,s("too many %s (limit is %d) in %s",!0),N,h,et);y.luaX_syntaxerror(a.ls,vt)},Kt=function(a,h,N,L){h>N&&Dt(a,N,L)},Gt=function(a,h){return a.t.token===h?(y.luaX_next(a),!0):!1},sn=function(a,h){a.t.token!==h&&dt(a,h)},jt=function(a,h){sn(a,h),y.luaX_next(a)},_=function(a,h,N){h||y.luaX_syntaxerror(a,N)},G=function(a,h,N,L){Gt(a,h)||(L===a.linenumber?dt(a,h):y.luaX_syntaxerror(a,qe.luaO_pushfstring(a.L,s("%s expected (to close %s at line %d)"),y.luaX_token2str(a,h),y.luaX_token2str(a,N),L)))},be=function(a){sn(a,E.TK_NAME);let h=a.t.seminfo.ts;return y.luaX_next(a),h},pe=function(a,h,N){a.f=a.t=_e,a.k=h,a.u.info=N},Xe=function(a,h,N){pe(h,ie.VK,ot(a.fs,N))},ke=function(a,h){Xe(a,h,be(a))},Ie=function(a,h){let N=a.fs,L=N.f;return L.locvars[N.nlocvars]=new qe.LocVar,L.locvars[N.nlocvars].varname=h,N.nlocvars++},Mt=function(a,h){let N=a.fs,L=a.dyd,Re=Ie(a,h);Kt(N,L.actvar.n+1-N.firstlocal,Ee,s("local variables",!0)),L.actvar.arr[L.actvar.n]=new u,L.actvar.arr[L.actvar.n].idx=Re,L.actvar.n++},re=function(a,h){Mt(a,y.luaX_newstring(a,s(h,!0)))},Be=function(a,h){let N=a.ls.dyd.actvar.arr[a.firstlocal+h].idx;return De(N<a.nlocvars),a.f.locvars[N]},Je=function(a,h){let N=a.fs;for(N.nactvar=N.nactvar+h;h;h--)Be(N,N.nactvar-h).startpc=N.pc},Ot=function(a,h){for(a.ls.dyd.actvar.n-=a.nactvar-h;a.nactvar>h;)Be(a,--a.nactvar).endpc=a.pc},nn=function(a,h){let N=a.f.upvalues;for(let L=0;L<a.nups;L++)if(b(N[L].name,h))return L;return-1},un=function(a,h,N){let L=a.f;return Kt(a,a.nups+1,Fe.MAXUPVAL,s("upvalues",!0)),L.upvalues[a.nups]={instack:N.k===ie.VLOCAL,idx:N.u.info,name:h},a.nups++},gn=function(a,h){for(let N=a.nactvar-1;N>=0;N--)if(b(h,Be(a,N).varname))return N;return-1},Sn=function(a,h){let N=a.bl;for(;N.nactvar>h;)N=N.previous;N.upval=1},cn=function(a,h,N,L){if(a===null)pe(N,ie.VVOID,0);else{let Re=gn(a,h);if(Re>=0)pe(N,ie.VLOCAL,Re),L||Sn(a,Re);else{let et=nn(a,h);if(et<0){if(cn(a.prev,h,N,0),N.k===ie.VVOID)return;et=un(a,h,N)}pe(N,ie.VUPVAL,et)}}},Fn=function(a,h){let N=be(a),L=a.fs;if(cn(L,N,h,1),h.k===ie.VVOID){let Re=new l;cn(L,a.envn,h,1),De(h.k!==ie.VVOID),Xe(a,Re,N),ft(L,h,Re)}},Zn=function(a,h,N,L){let Re=a.fs,et=h-N;if(We(L.k))et++,et<0&&(et=0),B(Re,L,et),et>1&&K(Re,et-1);else if(L.k!==ie.VVOID&&he(Re,L),et>0){let vt=Re.freereg;K(Re,et),bt(Re,vt,et)}N>h&&(a.fs.freereg-=N-h)},On=function(a){let h=a.L;++h.nCcalls,Kt(a.fs,h.nCcalls,V,s("JS levels",!0))},Gn=function(a){return a.L.nCcalls--},Vn=function(a,h,N){let L=a.fs,Re=a.dyd.gt,et=Re.arr[h];if(De(b(et.name,N.name)),et.nactvar<N.nactvar){let vt=Be(L,et.nactvar).varname,Tn=qe.luaO_pushfstring(a.L,s("<goto %s> at line %d jumps into the scope of local '%s'"),et.name.getstr(),et.line,vt.getstr());Ve(a,Tn)}St(L,et.pc,N.pc);for(let vt=h;vt<Re.n-1;vt++)Re.arr[vt]=Re.arr[vt+1];Re.n--},oa=function(a,h){let N=a.fs.bl,L=a.dyd,Re=L.gt.arr[h];for(let et=N.firstlabel;et<L.label.n;et++){let vt=L.label.arr[et];if(b(vt.name,Re.name))return Re.nactvar>vt.nactvar&&(N.upval||L.label.n>N.firstlabel)&&Ze(a.fs,Re.pc,vt.nactvar),Vn(a,h,vt),!0}return!1},mn=function(a,h,N,L,Re){let et=h.n;return h.arr[et]=new o,h.arr[et].name=N,h.arr[et].line=L,h.arr[et].nactvar=a.fs.nactvar,h.arr[et].pc=Re,h.n=et+1,et},Ln=function(a,h){let N=a.dyd.gt,L=a.fs.bl.firstgoto;for(;L<N.n;)b(N.arr[L].name,h.name)?Vn(a,L,h):L++},ga=function(a,h){let N=h.firstgoto,L=a.ls.dyd.gt;for(;N<L.n;){let Re=L.arr[N];Re.nactvar>h.nactvar&&(h.upval&&Ze(a,Re.pc,h.nactvar),Re.nactvar=h.nactvar),oa(a.ls,N)||N++}},fn=function(a,h,N){h.isloop=N,h.nactvar=a.nactvar,h.firstlabel=a.ls.dyd.label.n,h.firstgoto=a.ls.dyd.gt.n,h.upval=0,h.previous=a.bl,a.bl=h,De(a.freereg===a.nactvar)},ia=function(a){let h=Ft(a.L,"break"),N=mn(a,a.dyd.label,h,0,a.fs.pc);Ln(a,a.dyd.label.arr[N])},$n=function(a,h){let N=y.isreserved(h.name)?"<%s> at line %d not inside a loop":"no visible label '%s' for <goto> at line %d";N=qe.luaO_pushfstring(a.L,s(N),h.name.getstr(),h.line),Ve(a,N)},Jn=function(a){let h=a.L,N=new F(h),L=a.fs,Re=L.f;return Re.p[L.np++]=N,N},ma=function(a,h){let N=a.fs.prev;pe(h,ie.VRELOCABLE,we(N,te,0,N.np-1)),he(N,h)},ua=function(a,h,N){h.prev=a.fs,h.ls=a,a.fs=h,h.pc=0,h.lasttarget=0,h.jpc=_e,h.freereg=0,h.nk=0,h.np=0,h.nups=0,h.nlocvars=0,h.nactvar=0,h.firstlocal=a.dyd.actvar.n,h.bl=null;let L=h.f;L.source=a.source,L.maxstacksize=2,fn(h,N,!1)},_n=function(a){let h=a.bl,N=a.ls;if(h.previous&&h.upval){let L=pt(a);Ze(a,L,h.nactvar),tt(a,L)}h.isloop&&ia(N),a.bl=h.previous,Ot(a,h.nactvar),De(h.nactvar===a.nactvar),a.freereg=a.nactvar,N.dyd.label.n=h.firstlabel,h.previous?ga(a,h):h.firstgoto<N.dyd.gt.n&&$n(N,N.dyd.gt.arr[h.firstgoto])},Hn=function(a){let h=a.fs;M(h,0,0),_n(h),De(h.bl===null),a.fs=h.prev},Nn=function(a,h){switch(a.t.token){case E.TK_ELSE:case E.TK_ELSEIF:case E.TK_END:case E.TK_EOS:return!0;case E.TK_UNTIL:return h;default:return!1}},Cn=function(a){for(;!Nn(a,1);){if(a.t.token===E.TK_RETURN){ja(a);return}ja(a)}},Qn=function(a,h){let N=a.fs,L=new l;X(N,h),y.luaX_next(a),ke(a,L),ft(N,h,L)},hn=function(a,h){y.luaX_next(a),r(a,h),ee(a.fs,h),jt(a,93)};class Pn{constructor(){this.v=new l,this.t=new l,this.nh=NaN,this.na=NaN,this.tostore=NaN}}const Rn=function(a,h){let N=a.fs,L=a.fs.freereg,Re=new l,et=new l;a.t.token===E.TK_NAME?(Kt(N,h.nh,me,s("items in a constructor",!0)),ke(a,Re)):hn(a,Re),h.nh++,jt(a,61);let vt=x(N,Re);r(a,et),Ce(N,xt,h.t.u.info,vt,x(N,et)),N.freereg=L},Aa=function(a,h){h.v.k!==ie.VVOID&&(he(a,h.v),h.v.k=ie.VVOID,h.tostore===Vt&&(m(a,h.t.u.info,h.na,h.tostore),h.tostore=0))},Dn=function(a,h){h.tostore!==0&&(We(h.v.k)?(g(a,h.v),m(a,h.t.u.info,h.na,f),h.na--):(h.v.k!==ie.VVOID&&he(a,h.v),m(a,h.t.u.info,h.na,h.tostore)))},An=function(a,h){r(a,h.v),Kt(a.fs,h.na,me,s("items in a constructor",!0)),h.na++,h.tostore++},ca=function(a,h){switch(a.t.token){case E.TK_NAME:{y.luaX_lookahead(a)!==61?An(a,h):Rn(a,h);break}case 91:{Rn(a,h);break}default:{An(a,h);break}}},ea=function(a,h){let N=a.fs,L=a.linenumber,Re=Ce(N,Qe,0,0,0),et=new Pn;et.na=et.nh=et.tostore=0,et.t=h,pe(h,ie.VRELOCABLE,Re),pe(et.v,ie.VVOID,0),he(a.fs,h),jt(a,123);do{if(De(et.v.k===ie.VVOID||et.tostore>0),a.t.token===125)break;Aa(N,et),ca(a,et)}while(Gt(a,44)||Gt(a,59));G(a,125,123,L),Dn(N,et),Nt(N.f.code[Re],qe.luaO_int2fb(et.na)),Bt(N.f.code[Re],qe.luaO_int2fb(et.nh))},ba=function(a){let h=a.fs,N=h.f,L=0;if(N.is_vararg=!1,a.t.token!==41)do switch(a.t.token){case E.TK_NAME:{Mt(a,be(a)),L++;break}case E.TK_DOTS:{y.luaX_next(a),N.is_vararg=!0;break}default:y.luaX_syntaxerror(a,s("<name> or '...' expected",!0))}while(!N.is_vararg&&Gt(a,44));Je(a,L),N.numparams=h.nactvar,K(h,h.nactvar)},Bn=function(a,h,N,L){let Re=new n,et=new fe;Re.f=Jn(a),Re.f.linedefined=L,ua(a,Re,et),jt(a,40),N&&(re(a,"self"),Je(a,1)),ba(a),jt(a,41),Cn(a),Re.f.lastlinedefined=a.linenumber,G(a,E.TK_END,E.TK_FUNCTION,L),ma(a,h),Hn(a)},bn=function(a,h){let N=1;for(r(a,h);Gt(a,44);)he(a.fs,h),r(a,h),N++;return N},fa=function(a,h,N){let L=a.fs,Re=new l;switch(a.t.token){case 40:{y.luaX_next(a),a.t.token===41?Re.k=ie.VVOID:(bn(a,Re),g(L,Re)),G(a,41,40,N);break}case 123:{ea(a,Re);break}case E.TK_STRING:{Xe(a,Re,a.t.seminfo.ts),y.luaX_next(a);break}default:y.luaX_syntaxerror(a,s("function arguments expected",!0))}De(h.k===ie.VNONRELOC);let et,vt=h.u.info;We(Re.k)?et=f:(Re.k!==ie.VVOID&&he(L,Re),et=L.freereg-(vt+1)),pe(h,ie.VCALL,Ce(L,d,vt,et+1,2)),ne(L,N),L.freereg=vt+1},Ta=function(a,h){switch(a.t.token){case 40:{let N=a.linenumber;y.luaX_next(a),r(a,h),G(a,41,40,N),$e(a.fs,h);return}case E.TK_NAME:{Fn(a,h);return}default:y.luaX_syntaxerror(a,s("unexpected symbol",!0))}},Xn=function(a,h){let N=a.fs,L=a.linenumber;for(Ta(a,h);;)switch(a.t.token){case 46:{Qn(a,h);break}case 91:{let Re=new l;X(N,h),hn(a,Re),ft(N,h,Re);break}case 58:{let Re=new l;y.luaX_next(a),ke(a,Re),O(N,h,Re),fa(a,h,L);break}case 40:case E.TK_STRING:case 123:{he(N,h),fa(a,h,L);break}default:return}},Ea=function(a,h){switch(a.t.token){case E.TK_FLT:{pe(h,ie.VKFLT,0),h.u.nval=a.t.seminfo.r;break}case E.TK_INT:{pe(h,ie.VKINT,0),h.u.ival=a.t.seminfo.i;break}case E.TK_STRING:{Xe(a,h,a.t.seminfo.ts);break}case E.TK_NIL:{pe(h,ie.VNIL,0);break}case E.TK_TRUE:{pe(h,ie.VTRUE,0);break}case E.TK_FALSE:{pe(h,ie.VFALSE,0);break}case E.TK_DOTS:{let N=a.fs;_(a,N.f.is_vararg,s("cannot use '...' outside a vararg function",!0)),pe(h,ie.VVARARG,Ce(N,Yt,0,1,0));break}case 123:{ea(a,h);return}case E.TK_FUNCTION:{y.luaX_next(a),Bn(a,h,0,a.linenumber);return}default:{Xn(a,h);return}}y.luaX_next(a)},p=function(a){switch(a){case E.TK_NOT:return Ae;case 45:return Oe;case 126:return ae;case 35:return I;default:return W}},v=function(a){switch(a){case 43:return A;case 45:return ce;case 42:return Le;case 37:return Me;case 94:return xe;case 47:return le;case E.TK_IDIV:return Q;case 38:return S;case 124:return R;case 126:return $;case E.TK_SHL:return Ue;case E.TK_SHR:return Pe;case E.TK_CONCAT:return ge;case E.TK_NE:return ye;case E.TK_EQ:return Se;case 60:return J;case E.TK_LE:return Te;case 62:return Z;case E.TK_GE:return q;case E.TK_AND:return T;case E.TK_OR:return ut;default:return Ke}},e=[{left:10,right:10},{left:10,right:10},{left:11,right:11},{left:11,right:11},{left:14,right:13},{left:11,right:11},{left:11,right:11},{left:6,right:6},{left:4,right:4},{left:5,right:5},{left:7,right:7},{left:7,right:7},{left:9,right:8},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:3,right:3},{left:2,right:2},{left:1,right:1}],i=12,t=function(a,h,N){On(a);let L=p(a.t.token);if(L!==W){let et=a.linenumber;y.luaX_next(a),t(a,h,i),ve(a.fs,L,h,et)}else Ea(a,h);let Re=v(a.t.token);for(;Re!==Ke&&e[Re].left>N;){let et=new l,vt=a.linenumber;y.luaX_next(a),ct(a.fs,Re,h);let Tn=t(a,et,e[Re].right);gt(a.fs,Re,h,et,vt),Re=Tn}return Gn(a),Re},r=function(a,h){t(a,h,0)},c=function(a){let h=a.fs,N=new fe;fn(h,N,0),Cn(a),_n(h)};class k{constructor(){this.prev=null,this.v=new l}}const U=function(a,h,N){let L=a.fs,Re=L.freereg,et=!1;for(;h;h=h.prev)h.v.k===ie.VINDEXED&&(h.v.u.ind.vt===N.k&&h.v.u.ind.t===N.u.info&&(et=!0,h.v.u.ind.vt=ie.VLOCAL,h.v.u.ind.t=Re),N.k===ie.VLOCAL&&h.v.u.ind.idx===N.u.info&&(et=!0,h.v.u.ind.idx=Re));if(et){let vt=N.k===ie.VLOCAL?it:Ne;Ce(L,vt,Re,N.u.info,0),K(L,1)}},j=function(a,h,N){let L=new l;if(_(a,He(h.v.k),s("syntax error",!0)),Gt(a,44)){let Re=new k;Re.prev=h,Xn(a,Re.v),Re.v.k!==ie.VINDEXED&&U(a,h,Re.v),Kt(a.fs,N+a.L.nCcalls,V,s("JS levels",!0)),j(a,Re,N+1)}else{jt(a,61);let Re=bn(a,L);if(Re!==N)Zn(a,N,Re,L);else{w(a.fs,L),ue(a.fs,h.v,L);return}}pe(L,ie.VNONRELOC,a.fs.freereg-1),ue(a.fs,h.v,L)},lt=function(a){let h=new l;return r(a,h),h.k===ie.VNIL&&(h.k=ie.VFALSE),at(a.fs,h),h.f},rt=function(a,h){let N=a.linenumber,L;Gt(a,E.TK_GOTO)?L=be(a):(y.luaX_next(a),L=Ft(a.L,"break"));let Re=mn(a,a.dyd.gt,L,N,h);oa(a,Re)},Ct=function(a,h,N){for(let L=a.bl.firstlabel;L<h.n;L++)if(b(N,h.arr[L].name)){let Re=qe.luaO_pushfstring(a.ls.L,s("label '%s' already defined on line %d",!0),N.getstr(),h.arr[L].line);Ve(a.ls,Re)}},qt=function(a){for(;a.t.token===59||a.t.token===E.TK_DBCOLON;)ja(a)},It=function(a,h,N){let L=a.fs,Re=a.dyd.label,et;Ct(L,Re,h),jt(a,E.TK_DBCOLON),et=mn(a,Re,h,N,ze(L)),qt(a),Nn(a,0)&&(Re.arr[et].nactvar=L.bl.nactvar),Ln(a,Re.arr[et])},Ut=function(a,h){let N=a.fs,L=new fe;y.luaX_next(a);let Re=ze(N),et=lt(a);fn(N,L,1),jt(a,E.TK_DO),c(a),Et(N,Re),G(a,E.TK_END,E.TK_WHILE,h),_n(N),tt(N,et)},ta=function(a,h){let N=a.fs,L=ze(N),Re=new fe,et=new fe;fn(N,Re,1),fn(N,et,0),y.luaX_next(a),Cn(a),G(a,E.TK_UNTIL,E.TK_REPEAT,h);let vt=lt(a);et.upval&&Ze(N,vt,et.nactvar),_n(N),St(N,vt,L),_n(N)},za=function(a){let h=new l;return r(a,h),he(a.fs,h),De(h.k===ie.VNONRELOC),h.u.info},gl=function(a,h,N,L,Re){let et=new fe,vt=a.fs,Tn;Je(a,3),jt(a,E.TK_DO);let ya=Re?je(vt,oe,h,_e):pt(vt);fn(vt,et,0),Je(a,L),K(vt,L),c(a),_n(vt),tt(vt,ya),Re?Tn=je(vt,P,h,_e):(Ce(vt,yt,h,0,L),ne(vt,N),Tn=je(vt,wt,h+2,_e)),St(vt,Tn,ya+1),ne(vt,N)},Gr=function(a,h,N){let L=a.fs,Re=L.freereg;re(a,"(for index)"),re(a,"(for limit)"),re(a,"(for step)"),Mt(a,h),jt(a,61),za(a),jt(a,44),za(a),Gt(a,44)?za(a):(de(L,L.freereg,ht(L,1)),K(L,1)),gl(a,Re,N,1,1)},Vr=function(a,h){let N=a.fs,L=new l,Re=4,et=N.freereg;for(re(a,"(for generator)"),re(a,"(for state)"),re(a,"(for control)"),Mt(a,h);Gt(a,44);)Mt(a,be(a)),Re++;jt(a,E.TK_IN);let vt=a.linenumber;Zn(a,3,bn(a,L),L),D(N,3),gl(a,et,vt,Re-3,0)},Hr=function(a,h){let N=a.fs,L=new fe;fn(N,L,1),y.luaX_next(a);let Re=be(a);switch(a.t.token){case 61:Gr(a,Re,h);break;case 44:case E.TK_IN:Vr(a,Re);break;default:y.luaX_syntaxerror(a,s("'=' or 'in' expected",!0))}G(a,E.TK_END,E.TK_FOR,h),_n(N)},ml=function(a,h){let N=new fe,L=a.fs,Re=new l,et;if(y.luaX_next(a),r(a,Re),jt(a,E.TK_THEN),a.t.token===E.TK_GOTO||a.t.token===E.TK_BREAK){for(nt(a.fs,Re),fn(L,N,!1),rt(a,Re.t);Gt(a,59););if(Nn(a,0))return _n(L),h;et=pt(L)}else at(a.fs,Re),fn(L,N,!1),et=Re.f;return Cn(a),_n(L),(a.t.token===E.TK_ELSE||a.t.token===E.TK_ELSEIF)&&(h=Ye(L,h,pt(L))),tt(L,et),h},Xr=function(a,h){let N=a.fs,L=_e;for(L=ml(a,L);a.t.token===E.TK_ELSEIF;)L=ml(a,L);Gt(a,E.TK_ELSE)&&c(a),G(a,E.TK_END,E.TK_IF,h),tt(N,L)},zr=function(a){let h=new l,N=a.fs;Mt(a,be(a)),Je(a,1),Bn(a,h,0,a.linenumber),Be(N,h.u.info).startpc=N.pc},jr=function(a){let h=0,N,L=new l;do Mt(a,be(a)),h++;while(Gt(a,44));Gt(a,61)?N=bn(a,L):(L.k=ie.VVOID,N=0),Zn(a,h,N,L),Je(a,h)},qr=function(a,h){let N=0;for(Fn(a,h);a.t.token===46;)Qn(a,h);return a.t.token===58&&(N=1,Qn(a,h)),N},Wr=function(a,h){let N=new l,L=new l;y.luaX_next(a);let Re=qr(a,N);Bn(a,L,Re,h),ue(a.fs,N,L),ne(a.fs,h)},Yr=function(a){let h=a.fs,N=new k;Xn(a,N.v),a.t.token===61||a.t.token===44?(N.prev=null,j(a,N,1)):(_(a,N.v.k===ie.VCALL,s("syntax error",!0)),Bt(H(h,N.v),1))},Zr=function(a){let h=a.fs,N=new l,L,Re;Nn(a,1)||a.t.token===59?L=Re=0:(Re=bn(a,N),We(N.k)?(g(h,N),N.k===ie.VCALL&&Re===1&&(Ht(H(h,N),kt),De(H(h,N).A===h.nactvar)),L=h.nactvar,Re=f):Re===1?L=Y(h,N):(he(h,N),L=h.nactvar,De(Re===h.freereg-L))),M(h,L,Re),Gt(a,59)},ja=function(a){let h=a.linenumber;switch(On(a),a.t.token){case 59:{y.luaX_next(a);break}case E.TK_IF:{Xr(a,h);break}case E.TK_WHILE:{Ut(a,h);break}case E.TK_DO:{y.luaX_next(a),c(a),G(a,E.TK_END,E.TK_DO,h);break}case E.TK_FOR:{Hr(a,h);break}case E.TK_REPEAT:{ta(a,h);break}case E.TK_FUNCTION:{Wr(a,h);break}case E.TK_LOCAL:{y.luaX_next(a),Gt(a,E.TK_FUNCTION)?zr(a):jr(a);break}case E.TK_DBCOLON:{y.luaX_next(a),It(a,be(a),h);break}case E.TK_RETURN:{y.luaX_next(a),Zr(a);break}case E.TK_BREAK:case E.TK_GOTO:{rt(a,pt(a.fs));break}default:{Yr(a);break}}De(a.fs.f.maxstacksize>=a.fs.freereg&&a.fs.freereg>=a.fs.nactvar),a.fs.freereg=a.fs.nactvar,Gn(a)},Lr=function(a,h){let N=new fe,L=new l;ua(a,h,N),h.f.is_vararg=!0,pe(L,ie.VLOCAL,0),un(h,a.envn,L),y.luaX_next(a),Cn(a),sn(a,E.TK_EOS),Hn(a)},$r=function(a,h,N,L,Re,et){let vt=new y.LexState,Tn=new n,ya=Fe.luaF_newLclosure(a,1);return st.luaD_inctop(a),a.stack[a.top-1].setclLvalue(ya),vt.h=zt.luaH_new(a),st.luaD_inctop(a),a.stack[a.top-1].sethvalue(vt.h),Tn.f=ya.p=new F(a),Tn.f.source=$t(a,Re),vt.buff=N,vt.dyd=L,L.actvar.n=L.gt.n=L.label.n=0,y.luaX_setinput(a,vt,h,Tn.f.source,et),Lr(vt,Tn),De(!Tn.prev&&Tn.nups===1&&!vt.fs),De(L.actvar.n===0&&L.gt.n===0&&L.label.n===0),delete a.stack[--a.top],ya};return ka.Dyndata=se,ka.expkind=ie,ka.expdesc=l,ka.luaY_parser=$r,ka.vkisinreg=mt,ka}var qa={},Dl;function fs(){if(Dl)return qa;Dl=1;const{LUA_SIGNATURE:f,constant_types:{LUA_TBOOLEAN:s,LUA_TLNGSTR:A,LUA_TNIL:T,LUA_TNUMFLT:S,LUA_TNUMINT:R,LUA_TSHRSTR:$},thread_status:{LUA_ERRSYNTAX:ge},is_luastring:le,luastring_eq:Se,to_luastring:q}=rn(),Z=Yn(),Q=Ua(),Te=Mn(),{MAXARG_sBx:J,POS_A:Me,POS_Ax:Le,POS_B:ye,POS_Bx:Ke,POS_C:ut,POS_OP:xe,SIZE_A:Ue,SIZE_Ax:Pe,SIZE_B:ce,SIZE_Bx:ae,SIZE_C:I,SIZE_OP:Oe}=xa(),{lua_assert:Ae}=yn(),{luaS_bless:W}=ra(),{luaZ_read:_e,ZIO:H}=Ha();let D=[25,147,13,10,26,10];class Ce{constructor(de,Ye,$e){this.intSize=4,this.size_tSize=4,this.instructionSize=4,this.integerSize=4,this.numberSize=8,Ae(Ye instanceof H,"BytecodeParser only operates on a ZIO"),Ae(le($e)),$e[0]===64||$e[0]===61?this.name=$e.subarray(1):$e[0]==f[0]?this.name=q("binary string",!0):this.name=$e,this.L=de,this.Z=Ye,this.arraybuffer=new ArrayBuffer(Math.max(this.intSize,this.size_tSize,this.instructionSize,this.integerSize,this.numberSize)),this.dv=new DataView(this.arraybuffer),this.u8=new Uint8Array(this.arraybuffer)}read(de){let Ye=new Uint8Array(de);return _e(this.Z,Ye,0,de)!==0&&this.error("truncated"),Ye}LoadByte(){return _e(this.Z,this.u8,0,1)!==0&&this.error("truncated"),this.u8[0]}LoadInt(){return _e(this.Z,this.u8,0,this.intSize)!==0&&this.error("truncated"),this.dv.getInt32(0,!0)}LoadNumber(){return _e(this.Z,this.u8,0,this.numberSize)!==0&&this.error("truncated"),this.dv.getFloat64(0,!0)}LoadInteger(){return _e(this.Z,this.u8,0,this.integerSize)!==0&&this.error("truncated"),this.dv.getInt32(0,!0)}LoadSize_t(){return this.LoadInteger()}LoadString(){let de=this.LoadByte();return de===255&&(de=this.LoadSize_t()),de===0?null:W(this.L,this.read(de-1))}static MASK1(de,Ye){return~(-1<<de)<<Ye}LoadCode(de){let Ye=this.LoadInt(),$e=Ce;for(let x=0;x<Ye;x++){_e(this.Z,this.u8,0,this.instructionSize)!==0&&this.error("truncated");let Y=this.dv.getUint32(0,!0);de.code[x]={code:Y,opcode:Y>>xe&$e.MASK1(Oe,0),A:Y>>Me&$e.MASK1(Ue,0),B:Y>>ye&$e.MASK1(ce,0),C:Y>>ut&$e.MASK1(I,0),Bx:Y>>Ke&$e.MASK1(ae,0),Ax:Y>>Le&$e.MASK1(Pe,0),sBx:(Y>>Ke&$e.MASK1(ae,0))-J}}}LoadConstants(de){let Ye=this.LoadInt();for(let $e=0;$e<Ye;$e++){let x=this.LoadByte();switch(x){case T:de.k.push(new Te.TValue(T,null));break;case s:de.k.push(new Te.TValue(s,this.LoadByte()!==0));break;case S:de.k.push(new Te.TValue(S,this.LoadNumber()));break;case R:de.k.push(new Te.TValue(R,this.LoadInteger()));break;case $:case A:de.k.push(new Te.TValue(A,this.LoadString()));break;default:this.error(`unrecognized constant '${x}'`)}}}LoadProtos(de){let Ye=this.LoadInt();for(let $e=0;$e<Ye;$e++)de.p[$e]=new Q.Proto(this.L),this.LoadFunction(de.p[$e],de.source)}LoadUpvalues(de){let Ye=this.LoadInt();for(let $e=0;$e<Ye;$e++)de.upvalues[$e]={name:null,instack:this.LoadByte(),idx:this.LoadByte()}}LoadDebug(de){let Ye=this.LoadInt();for(let $e=0;$e<Ye;$e++)de.lineinfo[$e]=this.LoadInt();Ye=this.LoadInt();for(let $e=0;$e<Ye;$e++)de.locvars[$e]={varname:this.LoadString(),startpc:this.LoadInt(),endpc:this.LoadInt()};Ye=this.LoadInt();for(let $e=0;$e<Ye;$e++)de.upvalues[$e].name=this.LoadString()}LoadFunction(de,Ye){de.source=this.LoadString(),de.source===null&&(de.source=Ye),de.linedefined=this.LoadInt(),de.lastlinedefined=this.LoadInt(),de.numparams=this.LoadByte(),de.is_vararg=this.LoadByte()!==0,de.maxstacksize=this.LoadByte(),this.LoadCode(de),this.LoadConstants(de),this.LoadUpvalues(de),this.LoadProtos(de),this.LoadDebug(de)}checkliteral(de,Ye){let $e=this.read(de.length);Se($e,de)||this.error(Ye)}checkHeader(){this.checkliteral(f.subarray(1),"not a"),this.LoadByte()!==83&&this.error("version mismatch in"),this.LoadByte()!==0&&this.error("format mismatch in"),this.checkliteral(D,"corrupted"),this.intSize=this.LoadByte(),this.size_tSize=this.LoadByte(),this.instructionSize=this.LoadByte(),this.integerSize=this.LoadByte(),this.numberSize=this.LoadByte(),this.checksize(this.intSize,4,"int"),this.checksize(this.size_tSize,4,"size_t"),this.checksize(this.instructionSize,4,"instruction"),this.checksize(this.integerSize,4,"integer"),this.checksize(this.numberSize,8,"number"),this.LoadInteger()!==22136&&this.error("endianness mismatch in"),this.LoadNumber()!==370.5&&this.error("float format mismatch in")}error(de){Te.luaO_pushfstring(this.L,q("%s: %s precompiled chunk"),this.name,q(de)),Z.luaD_throw(this.L,ge)}checksize(de,Ye,$e){de!==Ye&&this.error(`${$e} size mismatch in`)}}const we=function(je,de,Ye){let $e=new Ce(je,de,Ye);$e.checkHeader();let x=Q.luaF_newLclosure(je,$e.LoadByte());return Z.luaD_inctop(je),je.stack[je.top-1].setclLvalue(x),x.p=new Q.Proto(je),$e.LoadFunction(x.p,null),Ae(x.nupvalues===x.p.upvalues.length),x};return qa.luaU_undump=we,qa}var Bl;function Yn(){if(Bl)return en;Bl=1;const{LUA_HOOKCALL:f,LUA_HOOKRET:s,LUA_HOOKTAILCALL:A,LUA_MASKCALL:T,LUA_MASKLINE:S,LUA_MASKRET:R,LUA_MINSTACK:$,LUA_MULTRET:ge,LUA_SIGNATURE:le,constant_types:{LUA_TCCL:Se,LUA_TLCF:q,LUA_TLCL:Z,LUA_TNIL:Q},thread_status:{LUA_ERRMEM:Te,LUA_ERRERR:J,LUA_ERRRUN:Me,LUA_ERRSYNTAX:Le,LUA_OK:ye,LUA_YIELD:Ke},lua_Debug:ut,luastring_indexOf:xe,to_luastring:Ue}=rn(),Pe=Xa(),ce=pa(),ae=Ua(),{api_check:I,lua_assert:Oe,LUAI_MAXCCALLS:Ae}=yn(),W=Mn(),_e=xa(),H=_r(),D=ha(),{luaS_newliteral:Ce}=ra(),we=Ma(),{LUAI_MAXSTACK:je}=vn(),de=fs(),Ye=Ia(),{MBuffer:$e}=Ha(),x=function(d,te){if(d.top<te)for(;d.top<te;)d.stack[d.top++]=new W.TValue(Q,null);else for(;d.top>te;)delete d.stack[--d.top]},Y=function(d,te,P){let oe=d.top;for(;d.top<P+1;)d.stack[d.top++]=new W.TValue(Q,null);switch(te){case Te:{W.setsvalue2s(d,P,Ce(d,"not enough memory"));break}case J:{W.setsvalue2s(d,P,Ce(d,"error in error handling"));break}default:W.setobjs2s(d,P,oe-1)}for(;d.top>P+1;)delete d.stack[--d.top]},X=je+200,he=function(d,te){Oe(te<=je||te==X),Oe(d.stack_last==d.stack.length-D.EXTRA_STACK),d.stack.length=te,d.stack_last=te-D.EXTRA_STACK},ee=function(d,te){let P=d.stack.length;if(P>je)gt(d,J);else{let oe=d.top+te+D.EXTRA_STACK,Ne=2*P;Ne>je&&(Ne=je),Ne<oe&&(Ne=oe),Ne>je?(he(d,X),ce.luaG_runerror(d,Ue("stack overflow",!0))):he(d,Ne)}},ne=function(d,te){d.stack_last-d.top<=te&&ee(d,te)},ze=function(d){let te=d.top;for(let P=d.ci;P!==null;P=P.previous)te<P.top&&(te=P.top);return Oe(te<=d.stack_last),te+1},nt=function(d){let te=ze(d),P=te+Math.floor(te/8)+2*D.EXTRA_STACK;P>je&&(P=je),d.stack.length>je&&D.luaE_freeCI(d),te<=je-D.EXTRA_STACK&&P<d.stack.length&&he(d,P)},at=function(d){ne(d,1),d.stack[d.top++]=new W.TValue(Q,null)},ft=function(d,te,P){let oe=d.stack[te];switch(oe.type){case Se:case q:{let Ne=oe.type===Se?oe.value.f:oe.value;ne(d,$);let it=D.luaE_extendCI(d);it.funcOff=te,it.nresults=P,it.func=oe,it.top=d.top+$,Oe(it.top<=d.stack_last),it.callstatus=0,d.hookmask&T&&pt(d,f,-1);let Qe=Ne(d);if(typeof Qe!="number"||Qe<0||(Qe|0)!==Qe)throw Error("invalid return value from JS function (expected integer)");return Pe.api_checknelems(d,Qe),ct(d,it,d.top-Qe,Qe),!0}case Z:{let Ne,it=oe.value.p,Qe=d.top-te-1,xt=it.maxstacksize;if(ne(d,xt),it.is_vararg)Ne=bt(d,it,Qe);else{for(;Qe<it.numparams;Qe++)d.stack[d.top++]=new W.TValue(Q,null);Ne=te+1}let kt=D.luaE_extendCI(d);return kt.funcOff=te,kt.nresults=P,kt.func=oe,kt.l_base=Ne,kt.top=Ne+xt,x(d,kt.top),kt.l_code=it.code,kt.l_savedpc=0,kt.callstatus=D.CIST_LUA,d.hookmask&T&&Et(d,kt),!1}default:return ne(d,1),Ze(d,te,oe),ft(d,te,P)}},ct=function(d,te,P,oe){let Ne=te.nresults;d.hookmask&(R|S)&&(d.hookmask&R&&pt(d,s,-1),d.oldpc=te.previous.l_savedpc);let it=te.funcOff;return d.ci=te.previous,d.ci.next=null,ht(d,P,it,oe,Ne)},ht=function(d,te,P,oe,Ne){switch(Ne){case 0:break;case 1:{oe===0?d.stack[P].setnilvalue():W.setobjs2s(d,P,te);break}case ge:{for(let Qe=0;Qe<oe;Qe++)W.setobjs2s(d,P+Qe,te+Qe);for(let Qe=d.top;Qe>=P+oe;Qe--)delete d.stack[Qe];return d.top=P+oe,!1}default:{let Qe;if(Ne<=oe)for(Qe=0;Qe<Ne;Qe++)W.setobjs2s(d,P+Qe,te+Qe);else{for(Qe=0;Qe<oe;Qe++)W.setobjs2s(d,P+Qe,te+Qe);for(;Qe<Ne;Qe++)P+Qe>=d.top?d.stack[P+Qe]=new W.TValue(Q,null):d.stack[P+Qe].setnilvalue()}break}}let it=P+Ne;for(let Qe=d.top;Qe>=it;Qe--)delete d.stack[Qe];return d.top=it,!0},pt=function(d,te,P){let oe=d.hook;if(oe&&d.allowhook){let Ne=d.ci,it=d.top,Qe=Ne.top,xt=new ut;xt.event=te,xt.currentline=P,xt.i_ci=Ne,ne(d,$),Ne.top=d.top+$,Oe(Ne.top<=d.stack_last),d.allowhook=0,Ne.callstatus|=D.CIST_HOOKED,oe(d,xt),Oe(!d.allowhook),d.allowhook=1,Ne.top=Qe,x(d,it),Ne.callstatus&=~D.CIST_HOOKED}},Et=function(d,te){let P=f;te.l_savedpc++,te.previous.callstatus&D.CIST_LUA&&te.previous.l_code[te.previous.l_savedpc-1].opcode==_e.OpCodesI.OP_TAILCALL&&(te.callstatus|=D.CIST_TAIL,P=A),pt(d,P,-1),te.l_savedpc--},bt=function(d,te,P){let oe=te.numparams,Ne=d.top-P,it=d.top,Qe;for(Qe=0;Qe<oe&&Qe<P;Qe++)W.pushobj2s(d,d.stack[Ne+Qe]),d.stack[Ne+Qe].setnilvalue();for(;Qe<oe;Qe++)d.stack[d.top++]=new W.TValue(Q,null);return it},Ze=function(d,te,P){let oe=we.luaT_gettmbyobj(d,P,we.TMS.TM_CALL);oe.ttisfunction(oe)||ce.luaG_typeerror(d,P,Ue("call",!0)),W.pushobj2s(d,d.stack[d.top-1]);for(let Ne=d.top-2;Ne>te;Ne--)W.setobjs2s(d,Ne,Ne-1);W.setobj2s(d,te,oe)},St=function(d){d.nCcalls===Ae?ce.luaG_runerror(d,Ue("JS stack overflow",!0)):d.nCcalls>=Ae+(Ae>>3)&&gt(d,J)},tt=function(d,te,P){++d.nCcalls>=Ae&&St(d),ft(d,te,P)||Ye.luaV_execute(d),d.nCcalls--},gt=function(d,te){if(d.errorJmp)throw d.errorJmp.status=te,d.errorJmp;{let P=d.l_G;if(d.status=te,P.mainthread.errorJmp)P.mainthread.stack[P.mainthread.top++]=d.stack[d.top-1],gt(P.mainthread,te);else{let oe=P.panic;throw oe&&(Y(d,te,d.top),d.ci.top<d.top&&(d.ci.top=d.top),oe(d)),new Error(`Aborted ${te}`)}}},ve=function(d,te,P){let oe=d.nCcalls,Ne={status:ye,previous:d.errorJmp};d.errorJmp=Ne;try{te(d,P)}catch(it){if(Ne.status===ye){let Qe=d.l_G.atnativeerror;if(Qe)try{if(Ne.status=ye,Pe.lua_pushcfunction(d,Qe),Pe.lua_pushlightuserdata(d,it),y(d,d.top-2,1),d.errfunc!==0){let xt=d.errfunc;W.pushobj2s(d,d.stack[d.top-1]),W.setobjs2s(d,d.top-2,xt),y(d,d.top-2,1)}Ne.status=Me}catch{Ne.status===ye&&(Ne.status=-1)}else Ne.status=-1}}return d.errorJmp=Ne.previous,d.nCcalls=oe,Ne.status},K=function(d,te){let P=d.ci;Oe(P.c_k!==null&&d.nny===0),Oe(P.callstatus&D.CIST_YPCALL||te===Ke),P.callstatus&D.CIST_YPCALL&&(P.callstatus&=~D.CIST_YPCALL,d.errfunc=P.c_old_errfunc),P.nresults===ge&&d.ci.top<d.top&&(d.ci.top=d.top);let oe=P.c_k,Ne=oe(d,te,P.c_ctx);Pe.api_checknelems(d,Ne),ct(d,P,d.top-Ne,Ne)},M=function(d,te){for(te!==null&&K(d,te);d.ci!==d.base_ci;)d.ci.callstatus&D.CIST_LUA?(Ye.luaV_finishOp(d),Ye.luaV_execute(d)):K(d,Ke)},O=function(d){for(let te=d.ci;te!==null;te=te.previous)if(te.callstatus&D.CIST_YPCALL)return te;return null},m=function(d,te){let P=O(d);if(P===null)return 0;let oe=P.extra;return ae.luaF_close(d,oe),Y(d,te,oe),d.ci=P,d.allowhook=P.callstatus&D.CIST_OAH,d.nny=0,nt(d),d.errfunc=P.c_old_errfunc,1},g=function(d,te,P){let oe=Ce(d,te);if(P===0)W.pushsvalue2s(d,oe),I(d,d.top<=d.ci.top,"stack overflow");else{for(let Ne=1;Ne<P;Ne++)delete d.stack[--d.top];W.setsvalue2s(d,d.top-1,oe)}return Me},w=function(d,te){let P=d.top-te,oe=d.ci;d.status===ye?ft(d,P-1,ge)||Ye.luaV_execute(d):(Oe(d.status===Ke),d.status=ye,oe.funcOff=oe.extra,oe.func=d.stack[oe.funcOff],oe.callstatus&D.CIST_LUA?Ye.luaV_execute(d):(oe.c_k!==null&&(te=oe.c_k(d,Ke,oe.c_ctx),Pe.api_checknelems(d,te),P=d.top-te),ct(d,oe,P,te)),M(d,null))},B=function(d,te,P){let oe=d.nny;if(d.status===ye){if(d.ci!==d.base_ci)return g(d,"cannot resume non-suspended coroutine",P)}else if(d.status!==Ke)return g(d,"cannot resume dead coroutine",P);if(d.nCcalls=te?te.nCcalls+1:1,d.nCcalls>=Ae)return g(d,"JS stack overflow",P);d.nny=0,Pe.api_checknelems(d,d.status===ye?P+1:P);let Ne=ve(d,w,P);if(Ne===-1)Ne=Me;else{for(;Ne>Ke&&m(d,Ne);)Ne=ve(d,M,Ne);Ne>Ke?(d.status=Ne,Y(d,Ne,d.top),d.ci.top=d.top):Oe(Ne===d.status)}return d.nny=oe,d.nCcalls--,Oe(d.nCcalls===(te?te.nCcalls:0)),Ne},ue=function(d){return d.nny===0},ot=function(d,te,P,oe){let Ne=d.ci;return Pe.api_checknelems(d,te),d.nny>0&&(d!==d.l_G.mainthread?ce.luaG_runerror(d,Ue("attempt to yield across a JS-call boundary",!0)):ce.luaG_runerror(d,Ue("attempt to yield from outside a coroutine",!0))),d.status=Ke,Ne.extra=Ne.funcOff,Ne.callstatus&D.CIST_LUA?I(d,oe===null,"hooks cannot continue after yielding"):(Ne.c_k=oe,oe!==null&&(Ne.c_ctx=P),Ne.funcOff=d.top-te-1,Ne.func=d.stack[Ne.funcOff],gt(d,Ke)),Oe(Ne.callstatus&D.CIST_HOOKED),0},st=function(d,te){ot(d,te,0,null)},Fe=function(d,te,P,oe,Ne){let it=d.ci,Qe=d.allowhook,xt=d.nny,kt=d.errfunc;d.errfunc=Ne;let yt=ve(d,te,P);return yt!==ye&&(ae.luaF_close(d,oe),Y(d,yt,oe),d.ci=it,d.allowhook=Qe,d.nny=xt,nt(d)),d.errfunc=kt,yt},y=function(d,te,P){d.nny++,tt(d,te,P),d.nny--};class V{constructor(te,P,oe){this.z=te,this.buff=new $e,this.dyd=new H.Dyndata,this.mode=oe,this.name=P}}const me=function(d,te,P){te&&xe(te,P[0])===-1&&(W.luaO_pushfstring(d,Ue("attempt to load a %s chunk (mode is '%s')"),P,te),gt(d,Le))},De=function(d,te){let P,oe=te.z.zgetc();oe===le[0]?(me(d,te.mode,Ue("binary",!0)),P=de.luaU_undump(d,te.z,te.name)):(me(d,te.mode,Ue("text",!0)),P=H.luaY_parser(d,te.z,te.buff,te.dyd,te.name,oe)),Oe(P.nupvalues===P.p.upvalues.length),ae.luaF_initupvals(d,P)},qe=function(d,te,P,oe){let Ne=new V(te,P,oe);d.nny++;let it=Fe(d,De,Ne,d.top,d.errfunc);return d.nny--,it};return en.adjust_top=x,en.luaD_call=tt,en.luaD_callnoyield=y,en.luaD_checkstack=ne,en.luaD_growstack=ee,en.luaD_hook=pt,en.luaD_inctop=at,en.luaD_pcall=Fe,en.luaD_poscall=ct,en.luaD_precall=ft,en.luaD_protectedparser=qe,en.luaD_rawrunprotected=ve,en.luaD_reallocstack=he,en.luaD_throw=gt,en.lua_isyieldable=ue,en.lua_resume=B,en.lua_yield=st,en.lua_yieldk=ot,en}var Kl;function pa(){if(Kl)return ln;Kl=1;const{LUA_HOOKCOUNT:f,LUA_HOOKLINE:s,LUA_MASKCOUNT:A,LUA_MASKLINE:T,constant_types:{LUA_TBOOLEAN:S,LUA_TNIL:R,LUA_TTABLE:$},thread_status:{LUA_ERRRUN:ge,LUA_YIELD:le},from_userstring:Se,luastring_eq:q,luastring_indexOf:Z,to_luastring:Q}=rn(),{api_check:Te,lua_assert:J}=yn(),{LUA_IDSIZE:Me}=vn(),Le=Xa(),ye=Yn(),Ke=Ua(),ut=_l(),xe=Mn(),Ue=xa(),Pe=ha(),ce=sa(),ae=Ma(),I=Ia(),Oe=function(m){return J(m.callstatus&Pe.CIST_LUA),m.l_savedpc-1},Ae=function(m){return m.func.value.p.lineinfo.length!==0?m.func.value.p.lineinfo[Oe(m)]:-1},W=function(m){if(m.status===le){let g=m.ci,w=g.funcOff;g.func=m.stack[g.extra],g.funcOff=g.extra,g.extra=w}},_e=function(m,g,w,B){(g===null||w===0)&&(w=0,g=null),m.ci.callstatus&Pe.CIST_LUA&&(m.oldpc=m.ci.l_savedpc),m.hook=g,m.basehookcount=B,m.hookcount=m.basehookcount,m.hookmask=w},H=function(m){return m.hook},D=function(m){return m.hookmask},Ce=function(m){return m.basehookcount},we=function(m,g,w){let B,ue;if(g<0)return 0;for(B=m.ci;g>0&&B!==m.base_ci;B=B.previous)g--;return g===0&&B!==m.base_ci?(ue=1,w.i_ci=B):ue=0,ue},je=function(m,g){J(g<m.upvalues.length);let w=m.upvalues[g].name;return w===null?Q("?",!0):w.getstr()},de=function(m,g){let w=m.func.value.p.numparams;return g>=m.l_base-m.funcOff-w?null:{pos:m.funcOff+w+g,name:Q("(*vararg)",!0)}},Ye=function(m,g,w){let B,ue=null;if(g.callstatus&Pe.CIST_LUA){if(w<0)return de(g,-w);B=g.l_base,ue=Ke.luaF_getlocalname(g.func.value.p,w,Oe(g))}else B=g.funcOff+1;if(ue===null)if((g===m.ci?m.top:g.next.funcOff)-B>=w&&w>0)ue=Q("(*temporary)",!0);else return null;return{pos:B+(w-1),name:ue}},$e=function(m,g,w){let B;if(W(m),g===null)m.stack[m.top-1].ttisLclosure()?B=Ke.luaF_getlocalname(m.stack[m.top-1].value.p,w,0):B=null;else{let ue=Ye(m,g.i_ci,w);ue?(B=ue.name,xe.pushobj2s(m,m.stack[ue.pos]),Te(m,m.top<=m.ci.top,"stack overflow")):B=null}return W(m),B},x=function(m,g,w){let B;W(m);let ue=Ye(m,g.i_ci,w);return ue?(B=ue.name,xe.setobjs2s(m,ue.pos,m.top-1),delete m.stack[--m.top]):B=null,W(m),B},Y=function(m,g){if(g===null||g instanceof xe.CClosure)m.source=Q("=[JS]",!0),m.linedefined=-1,m.lastlinedefined=-1,m.what=Q("J",!0);else{let w=g.p;m.source=w.source?w.source.getstr():Q("=?",!0),m.linedefined=w.linedefined,m.lastlinedefined=w.lastlinedefined,m.what=m.linedefined===0?Q("main",!0):Q("Lua",!0)}m.short_src=xe.luaO_chunkid(m.source,Me)},X=function(m,g){if(g===null||g instanceof xe.CClosure)m.stack[m.top]=new xe.TValue(R,null),Le.api_incr_top(m);else{let w=g.p.lineinfo,B=ce.luaH_new(m);m.stack[m.top]=new xe.TValue($,B),Le.api_incr_top(m);let ue=new xe.TValue(S,!0);for(let ot=0;ot<w.length;ot++)ce.luaH_setint(B,w[ot],ue)}},he=function(m,g){let w={name:null,funcname:null};return g===null?null:g.callstatus&Pe.CIST_FIN?(w.name=Q("__gc",!0),w.funcname=Q("metamethod",!0),w):!(g.callstatus&Pe.CIST_TAIL)&&g.previous.callstatus&Pe.CIST_LUA?ct(m,g.previous):null},ee=function(m,g,w,B,ue){let ot=1;for(;g.length>0;g=g.subarray(1))switch(g[0]){case 83:{Y(w,B);break}case 108:{w.currentline=ue&&ue.callstatus&Pe.CIST_LUA?Ae(ue):-1;break}case 117:{w.nups=B===null?0:B.nupvalues,B===null||B instanceof xe.CClosure?(w.isvararg=!0,w.nparams=0):(w.isvararg=B.p.is_vararg,w.nparams=B.p.numparams);break}case 116:{w.istailcall=ue?ue.callstatus&Pe.CIST_TAIL:0;break}case 110:{let st=he(m,ue);st===null?(w.namewhat=Q("",!0),w.name=null):(w.namewhat=st.funcname,w.name=st.name);break}case 76:case 102:break;default:ot=0}return ot},ne=function(m,g,w){g=Se(g);let B,ue,ot,st;return W(m),g[0]===62?(ot=null,st=m.stack[m.top-1],Te(m,st.ttisfunction(),"function expected"),g=g.subarray(1),m.top--):(ot=w.i_ci,st=ot.func,J(ot.func.ttisfunction())),ue=st.ttisclosure()?st.value:null,B=ee(m,g,w,ue,ot),Z(g,102)>=0&&(xe.pushobj2s(m,st),Te(m,m.top<=m.ci.top,"stack overflow")),W(m),Z(g,76)>=0&&X(m,ue),B},ze=function(m,g,w){let B={name:null,funcname:null};if(Ue.ISK(w)){let ue=m.k[Ue.INDEXK(w)];if(ue.ttisstring())return B.name=ue.svalue(),B}else{let ue=ft(m,g,w);if(ue&&ue.funcname[0]===99)return ue}return B.name=Q("?",!0),B},nt=function(m,g){return m<g?-1:m},at=function(m,g,w){let B=-1,ue=0,ot=Ue.OpCodesI;for(let st=0;st<g;st++){let Fe=m.code[st],y=Fe.A;switch(Fe.opcode){case ot.OP_LOADNIL:{let V=Fe.B;y<=w&&w<=y+V&&(B=nt(st,ue));break}case ot.OP_TFORCALL:{w>=y+2&&(B=nt(st,ue));break}case ot.OP_CALL:case ot.OP_TAILCALL:{w>=y&&(B=nt(st,ue));break}case ot.OP_JMP:{let V=Fe.sBx,me=st+1+V;st<me&&me<=g&&me>ue&&(ue=me);break}default:Ue.testAMode(Fe.opcode)&&w===y&&(B=nt(st,ue));break}}return B},ft=function(m,g,w){let B={name:Ke.luaF_getlocalname(m,w+1,g),funcname:null};if(B.name)return B.funcname=Q("local",!0),B;let ue=at(m,g,w),ot=Ue.OpCodesI;if(ue!==-1){let st=m.code[ue];switch(st.opcode){case ot.OP_MOVE:{let Fe=st.B;if(Fe<st.A)return ft(m,ue,Fe);break}case ot.OP_GETTABUP:case ot.OP_GETTABLE:{let Fe=st.C,y=st.B,V=st.opcode===ot.OP_GETTABLE?Ke.luaF_getlocalname(m,y+1,ue):je(m,y);return B.name=ze(m,ue,Fe).name,B.funcname=V&&q(V,ut.LUA_ENV)?Q("global",!0):Q("field",!0),B}case ot.OP_GETUPVAL:return B.name=je(m,st.B),B.funcname=Q("upvalue",!0),B;case ot.OP_LOADK:case ot.OP_LOADKX:{let Fe=st.opcode===ot.OP_LOADK?st.Bx:m.code[ue+1].Ax;if(m.k[Fe].ttisstring())return B.name=m.k[Fe].svalue(),B.funcname=Q("constant",!0),B;break}case ot.OP_SELF:{let Fe=st.C;return B.name=ze(m,ue,Fe).name,B.funcname=Q("method",!0),B}}}return null},ct=function(m,g){let w={name:null,funcname:null},B=0,ue=g.func.value.p,ot=Oe(g),st=ue.code[ot],Fe=Ue.OpCodesI;if(g.callstatus&Pe.CIST_HOOKED)return w.name=Q("?",!0),w.funcname=Q("hook",!0),w;switch(st.opcode){case Fe.OP_CALL:case Fe.OP_TAILCALL:return ft(ue,ot,st.A);case Fe.OP_TFORCALL:return w.name=Q("for iterator",!0),w.funcname=Q("for iterator",!0),w;case Fe.OP_SELF:case Fe.OP_GETTABUP:case Fe.OP_GETTABLE:B=ae.TMS.TM_INDEX;break;case Fe.OP_SETTABUP:case Fe.OP_SETTABLE:B=ae.TMS.TM_NEWINDEX;break;case Fe.OP_ADD:B=ae.TMS.TM_ADD;break;case Fe.OP_SUB:B=ae.TMS.TM_SUB;break;case Fe.OP_MUL:B=ae.TMS.TM_MUL;break;case Fe.OP_MOD:B=ae.TMS.TM_MOD;break;case Fe.OP_POW:B=ae.TMS.TM_POW;break;case Fe.OP_DIV:B=ae.TMS.TM_DIV;break;case Fe.OP_IDIV:B=ae.TMS.TM_IDIV;break;case Fe.OP_BAND:B=ae.TMS.TM_BAND;break;case Fe.OP_BOR:B=ae.TMS.TM_BOR;break;case Fe.OP_BXOR:B=ae.TMS.TM_BXOR;break;case Fe.OP_SHL:B=ae.TMS.TM_SHL;break;case Fe.OP_SHR:B=ae.TMS.TM_SHR;break;case Fe.OP_UNM:B=ae.TMS.TM_UNM;break;case Fe.OP_BNOT:B=ae.TMS.TM_BNOT;break;case Fe.OP_LEN:B=ae.TMS.TM_LEN;break;case Fe.OP_CONCAT:B=ae.TMS.TM_CONCAT;break;case Fe.OP_EQ:B=ae.TMS.TM_EQ;break;case Fe.OP_LT:B=ae.TMS.TM_LT;break;case Fe.OP_LE:B=ae.TMS.TM_LE;break;default:return null}return w.name=m.l_G.tmname[B].getstr(),w.funcname=Q("metamethod",!0),w},ht=function(m,g,w){for(let B=g.l_base;B<g.top;B++)if(m.stack[B]===w)return B;return!1},pt=function(m,g,w){let B=g.func.value;for(let ue=0;ue<B.nupvalues;ue++)if(B.upvals[ue]===w)return{name:je(B.p,ue),funcname:Q("upvalue",!0)};return null},Et=function(m,g){let w=m.ci,B=null;if(w.callstatus&Pe.CIST_LUA){B=pt(m,w,g);let ue=ht(m,w,g);!B&&ue&&(B=ft(w.func.value.p,Oe(w),ue-w.l_base))}return B?xe.luaO_pushfstring(m,Q(" (%s '%s')",!0),B.funcname,B.name):Q("",!0)},bt=function(m,g,w){let B=ae.luaT_objtypename(m,g);ve(m,Q("attempt to %s a %s value%s",!0),w,B,Et(m,g))},Ze=function(m,g,w){(g.ttisstring()||I.cvt2str(g))&&(g=w),bt(m,g,Q("concatenate",!0))},St=function(m,g,w,B){I.tonumber(g)===!1&&(w=g),bt(m,w,B)},tt=function(m,g,w){let B=ae.luaT_objtypename(m,g),ue=ae.luaT_objtypename(m,w);q(B,ue)?ve(m,Q("attempt to compare two %s values",!0),B):ve(m,Q("attempt to compare %s with %s",!0),B,ue)},gt=function(m,g,w,B){let ue;return w?ue=xe.luaO_chunkid(w.getstr(),Me):ue=Q("?",!0),xe.luaO_pushfstring(m,Q("%s:%d: %s",!0),ue,B,g)},ve=function(m,g,...w){let B=m.ci,ue=xe.luaO_pushvfstring(m,g,w);B.callstatus&Pe.CIST_LUA&&gt(m,ue,B.func.value.p.source,Ae(B)),K(m)},K=function(m){if(m.errfunc!==0){let g=m.errfunc;xe.pushobj2s(m,m.stack[m.top-1]),xe.setobjs2s(m,m.top-2,g),ye.luaD_callnoyield(m,m.top-2,1)}ye.luaD_throw(m,ge)},M=function(m,g,w){I.tointeger(g)===!1&&(w=g),ve(m,Q("number%s has no integer representation",!0),Et(m,w))},O=function(m){let g=m.ci,w=m.hookmask,B=--m.hookcount===0&&w&A;if(B)m.hookcount=m.basehookcount;else if(!(w&T))return;if(g.callstatus&Pe.CIST_HOOKYIELD){g.callstatus&=~Pe.CIST_HOOKYIELD;return}if(B&&ye.luaD_hook(m,f,-1),w&T){let ue=g.func.value.p,ot=g.l_savedpc-1,st=ue.lineinfo.length!==0?ue.lineinfo[ot]:-1;(ot===0||g.l_savedpc<=m.oldpc||st!==(ue.lineinfo.length!==0?ue.lineinfo[m.oldpc-1]:-1))&&ye.luaD_hook(m,s,st)}m.oldpc=g.l_savedpc,m.status===le&&(B&&(m.hookcount=1),g.l_savedpc--,g.callstatus|=Pe.CIST_HOOKYIELD,g.funcOff=m.top-1,g.func=m.stack[g.funcOff],ye.luaD_throw(m,le))};return ln.luaG_addinfo=gt,ln.luaG_concaterror=Ze,ln.luaG_errormsg=K,ln.luaG_opinterror=St,ln.luaG_ordererror=tt,ln.luaG_runerror=ve,ln.luaG_tointerror=M,ln.luaG_traceexec=O,ln.luaG_typeerror=bt,ln.lua_gethook=H,ln.lua_gethookcount=Ce,ln.lua_gethookmask=D,ln.lua_getinfo=ne,ln.lua_getlocal=$e,ln.lua_getstack=we,ln.lua_sethook=_e,ln.lua_setlocal=x,ln}var Wa={},Fl;function _s(){if(Fl)return Wa;Fl=1;const{LUA_SIGNATURE:f,LUA_VERSION_MAJOR:s,LUA_VERSION_MINOR:A,constant_types:{LUA_TBOOLEAN:T,LUA_TLNGSTR:S,LUA_TNIL:R,LUA_TNUMFLT:$,LUA_TNUMINT:ge,LUA_TSHRSTR:le},luastring_of:Se}=rn(),q=Se(25,147,13,10,26,10),Z=22136,Q=370.5,Te=Number(s)*16+Number(A),J=0;class Me{constructor(){this.L=null,this.writer=null,this.data=null,this.strip=NaN,this.status=NaN}}const Le=function(H,D,Ce){Ce.status===0&&D>0&&(Ce.status=Ce.writer(Ce.L,H,D,Ce.data))},ye=function(H,D){Le(Se(H),1,D)},Ke=function(H,D){let Ce=new ArrayBuffer(4);new DataView(Ce).setInt32(0,H,!0);let je=new Uint8Array(Ce);Le(je,4,D)},ut=function(H,D){let Ce=new ArrayBuffer(4);new DataView(Ce).setInt32(0,H,!0);let je=new Uint8Array(Ce);Le(je,4,D)},xe=function(H,D){let Ce=new ArrayBuffer(8);new DataView(Ce).setFloat64(0,H,!0);let je=new Uint8Array(Ce);Le(je,8,D)},Ue=function(H,D){if(H===null)ye(0,D);else{let Ce=H.tsslen()+1,we=H.getstr();Ce<255?ye(Ce,D):(ye(255,D),ut(Ce,D)),Le(we,Ce-1,D)}},Pe=function(H,D){let Ce=H.code.map(we=>we.code);Ke(Ce.length,D);for(let we=0;we<Ce.length;we++)Ke(Ce[we],D)},ce=function(H,D){let Ce=H.k.length;Ke(Ce,D);for(let we=0;we<Ce;we++){let je=H.k[we];switch(ye(je.ttype(),D),je.ttype()){case R:break;case T:ye(je.value?1:0,D);break;case $:xe(je.value,D);break;case ge:ut(je.value,D);break;case le:case S:Ue(je.tsvalue(),D);break}}},ae=function(H,D){let Ce=H.p.length;Ke(Ce,D);for(let we=0;we<Ce;we++)Ae(H.p[we],H.source,D)},I=function(H,D){let Ce=H.upvalues.length;Ke(Ce,D);for(let we=0;we<Ce;we++)ye(H.upvalues[we].instack?1:0,D),ye(H.upvalues[we].idx,D)},Oe=function(H,D){let Ce=D.strip?0:H.lineinfo.length;Ke(Ce,D);for(let we=0;we<Ce;we++)Ke(H.lineinfo[we],D);Ce=D.strip?0:H.locvars.length,Ke(Ce,D);for(let we=0;we<Ce;we++)Ue(H.locvars[we].varname,D),Ke(H.locvars[we].startpc,D),Ke(H.locvars[we].endpc,D);Ce=D.strip?0:H.upvalues.length,Ke(Ce,D);for(let we=0;we<Ce;we++)Ue(H.upvalues[we].name,D)},Ae=function(H,D,Ce){Ce.strip||H.source===D?Ue(null,Ce):Ue(H.source,Ce),Ke(H.linedefined,Ce),Ke(H.lastlinedefined,Ce),ye(H.numparams,Ce),ye(H.is_vararg?1:0,Ce),ye(H.maxstacksize,Ce),Pe(H,Ce),ce(H,Ce),I(H,Ce),ae(H,Ce),Oe(H,Ce)},W=function(H){Le(f,f.length,H),ye(Te,H),ye(J,H),Le(q,q.length,H),ye(4,H),ye(4,H),ye(4,H),ye(4,H),ye(8,H),ut(Z,H),xe(Q,H)},_e=function(H,D,Ce,we,je){let de=new Me;return de.L=H,de.writer=Ce,de.data=we,de.strip=je,de.status=0,W(de),ye(D.upvalues.length,de),Ae(D,null,de),de.status};return Wa.luaU_dump=_e,Wa}var Gl;function Xa(){if(Gl)return Ge;Gl=1;const{LUA_MULTRET:f,LUA_OPBNOT:s,LUA_OPEQ:A,LUA_OPLE:T,LUA_OPLT:S,LUA_OPUNM:R,LUA_REGISTRYINDEX:$,LUA_RIDX_GLOBALS:ge,LUA_VERSION_NUM:le,constant_types:{LUA_NUMTAGS:Se,LUA_TBOOLEAN:q,LUA_TCCL:Z,LUA_TFUNCTION:Q,LUA_TLCF:Te,LUA_TLCL:J,LUA_TLIGHTUSERDATA:Me,LUA_TLNGSTR:Le,LUA_TNIL:ye,LUA_TNONE:Ke,LUA_TNUMFLT:ut,LUA_TNUMINT:xe,LUA_TSHRSTR:Ue,LUA_TTABLE:Pe,LUA_TTHREAD:ce,LUA_TUSERDATA:ae},thread_status:{LUA_OK:I},from_userstring:Oe,to_luastring:Ae}=rn(),{api_check:W}=yn(),_e=pa(),H=Yn(),{luaU_dump:D}=_s(),Ce=Ua(),we=Mn(),je=ha(),{luaS_bless:de,luaS_new:Ye,luaS_newliteral:$e}=ra(),x=Ma(),{LUAI_MAXSTACK:Y}=vn(),X=Ia(),he=sa(),{ZIO:ee}=Ha(),ne=we.TValue,ze=we.CClosure,nt=function(e){e.top++,W(e,e.top<=e.ci.top,"stack overflow")},at=function(e,i){W(e,i<e.top-e.ci.funcOff,"not enough elements in the stack")},ft=function(e){if(!e)throw TypeError("invalid argument")},ct=function(e){ft(typeof e=="number"&&(e|0)===e)},ht=function(e){return e!==we.luaO_nilobject},pt=function(e){return e===null?le:e.l_G.version},Et=function(e,i){let t=e.l_G.panic;return e.l_G.panic=i,t},bt=function(e,i){let t=e.l_G.atnativeerror;return e.l_G.atnativeerror=i,t},Ze=function(e,i){let t=e.ci;if(i>0){let r=t.funcOff+i;return W(e,i<=t.top-(t.funcOff+1),"unacceptable index"),r>=e.top?we.luaO_nilobject:e.stack[r]}else return i>$?(W(e,i!==0&&-i<=e.top,"invalid index"),e.stack[e.top+i]):i===$?e.l_G.l_registry:(i=$-i,W(e,i<=Ce.MAXUPVAL+1,"upvalue index too large"),t.func.ttislcf()?we.luaO_nilobject:i<=t.func.value.nupvalues?t.func.value.upvalue[i-1]:we.luaO_nilobject)},St=function(e,i){let t=e.ci;if(i>0){let r=t.funcOff+i;return W(e,i<=t.top-(t.funcOff+1),"unacceptable index"),r>=e.top?null:r}else{if(i>$)return W(e,i!==0&&-i<=e.top,"invalid index"),e.top+i;throw Error("attempt to use pseudo-index")}},tt=function(e,i){let t,r=e.ci;return W(e,i>=0,"negative 'n'"),e.stack_last-e.top>i?t=!0:e.top+je.EXTRA_STACK>Y-i?t=!1:(H.luaD_growstack(e,i),t=!0),t&&r.top<e.top+i&&(r.top=e.top+i),t},gt=function(e,i,t){if(e!==i){at(e,t),W(e,e.l_G===i.l_G,"moving among independent states"),W(e,i.ci.top-i.top>=t,"stack overflow"),e.top-=t;for(let r=0;r<t;r++)i.stack[i.top]=new we.TValue,we.setobj2s(i,i.top,e.stack[e.top+r]),delete e.stack[e.top+r],i.top++}},ve=function(e,i){return i>0||i<=$?i:e.top-e.ci.funcOff+i},K=function(e){return e.top-(e.ci.funcOff+1)},M=function(e,i){we.pushobj2s(e,Ze(e,i)),W(e,e.top<=e.ci.top,"stack overflow")},O=function(e,i){let t=e.ci.funcOff,r;i>=0?(W(e,i<=e.stack_last-(t+1),"new top too large"),r=t+1+i):(W(e,-(i+1)<=e.top-(t+1),"invalid new top"),r=e.top+i+1),H.adjust_top(e,r)},m=function(e,i){O(e,-i-1)},g=function(e,i,t){for(;i<t;i++,t--){let r=e.stack[i],c=new ne(r.type,r.value);we.setobjs2s(e,i,t),we.setobj2s(e,t,c)}},w=function(e,i,t){let r=e.top-1,c=St(e,i),k=e.stack[c];W(e,ht(k)&&i>$,"index not in the stack"),W(e,(t>=0?t:-t)<=r-c+1,"invalid 'n'");let U=t>=0?r-t:c-t-1;g(e,c,U),g(e,U+1,e.top-1),g(e,c,e.top-1)},B=function(e,i,t){let r=Ze(e,i);Ze(e,t).setfrom(r)},ue=function(e,i){w(e,i,-1),m(e,1)},ot=function(e,i){w(e,i,1)},st=function(e,i){B(e,-1,i),m(e,1)},Fe=function(e){e.stack[e.top]=new ne(ye,null),nt(e)},y=function(e,i){ft(typeof i=="number"),e.stack[e.top]=new ne(ut,i),nt(e)},V=function(e,i){ct(i),e.stack[e.top]=new ne(xe,i),nt(e)},me=function(e,i,t){ct(t);let r;return t===0?(i=Ae("",!0),r=de(e,i)):(i=Oe(i),W(e,i.length>=t,"invalid length to lua_pushlstring"),r=Ye(e,i.subarray(0,t))),we.pushsvalue2s(e,r),W(e,e.top<=e.ci.top,"stack overflow"),r.value},De=function(e,i){if(i==null)e.stack[e.top]=new ne(ye,null),e.top++;else{let t=Ye(e,Oe(i));we.pushsvalue2s(e,t),i=t.getstr()}return W(e,e.top<=e.ci.top,"stack overflow"),i},qe=function(e,i,t){return i=Oe(i),we.luaO_pushvfstring(e,i,t)},d=function(e,i,...t){return i=Oe(i),we.luaO_pushvfstring(e,i,t)},te=function(e,i){if(i==null)e.stack[e.top]=new ne(ye,null),e.top++;else{ft(typeof i=="string");let t=$e(e,i);we.pushsvalue2s(e,t),i=t.getstr()}return W(e,e.top<=e.ci.top,"stack overflow"),i},P=function(e,i,t){if(ft(typeof i=="function"),ct(t),t===0)e.stack[e.top]=new ne(Te,i);else{at(e,t),W(e,t<=Ce.MAXUPVAL,"upvalue index too large");let r=new ze(e,i,t);for(let c=0;c<t;c++)r.upvalue[c].setfrom(e.stack[e.top-t+c]);for(let c=1;c<t;c++)delete e.stack[--e.top];t>0&&--e.top,e.stack[e.top].setclCvalue(r)}nt(e)},oe=P,Ne=function(e,i){P(e,i,0)},it=Ne,Qe=function(e,i){e.stack[e.top]=new ne(q,!!i),nt(e)},xt=function(e,i){e.stack[e.top]=new ne(Me,i),nt(e)},kt=function(e){return e.stack[e.top]=new ne(ce,e),nt(e),e.l_G.mainthread===e},yt=function(e){F(e,$,ge)},wt=function(e,i,t){let r=Ye(e,Oe(t));at(e,1),we.pushsvalue2s(e,r),W(e,e.top<=e.ci.top,"stack overflow"),X.settable(e,i,e.stack[e.top-1],e.stack[e.top-2]),delete e.stack[--e.top],delete e.stack[--e.top]},Yt=function(e,i){wt(e,he.luaH_getint(e.l_G.l_registry.value,ge),i)},Vt=function(e,i){at(e,1);let t,r=Ze(e,i);switch(e.stack[e.top-1].ttisnil()?t=null:(W(e,e.stack[e.top-1].ttistable(),"table expected"),t=e.stack[e.top-1].value),r.ttnov()){case ae:case Pe:{r.value.metatable=t;break}default:{e.l_G.mt[r.ttnov()]=t;break}}return delete e.stack[--e.top],!0},Nt=function(e,i){at(e,2);let t=Ze(e,i);X.settable(e,t,e.stack[e.top-2],e.stack[e.top-1]),delete e.stack[--e.top],delete e.stack[--e.top]},Bt=function(e,i,t){wt(e,Ze(e,i),t)},Ht=function(e,i,t){ct(t),at(e,1);let r=Ze(e,i);e.stack[e.top]=new ne(xe,t),nt(e),X.settable(e,r,e.stack[e.top-1],e.stack[e.top-2]),delete e.stack[--e.top],delete e.stack[--e.top]},Xt=function(e,i){at(e,2);let t=Ze(e,i);W(e,t.ttistable(),"table expected");let r=e.stack[e.top-2],c=e.stack[e.top-1];he.luaH_setfrom(e,t.value,r,c),he.invalidateTMcache(t.value),delete e.stack[--e.top],delete e.stack[--e.top]},$t=function(e,i,t){ct(t),at(e,1);let r=Ze(e,i);W(e,r.ttistable(),"table expected"),he.luaH_setint(r.value,t,e.stack[e.top-1]),delete e.stack[--e.top]},Ft=function(e,i,t){at(e,1);let r=Ze(e,i);W(e,r.ttistable(),"table expected");let c=new ne(Me,t),k=e.stack[e.top-1];he.luaH_setfrom(e,r.value,c,k),delete e.stack[--e.top]},zt=function(e,i,t){let r=Ye(e,Oe(t));return we.pushsvalue2s(e,r),W(e,e.top<=e.ci.top,"stack overflow"),X.luaV_gettable(e,i,e.stack[e.top-1],e.top-1),e.stack[e.top-1].ttnov()},F=function(e,i,t){let r=Ze(e,i);return ct(t),W(e,r.ttistable(),"table expected"),we.pushobj2s(e,he.luaH_getint(r.value,t)),W(e,e.top<=e.ci.top,"stack overflow"),e.stack[e.top-1].ttnov()},E=function(e,i,t){let r=Ze(e,i);W(e,r.ttistable(),"table expected");let c=new ne(Me,t);return we.pushobj2s(e,he.luaH_get(e,r.value,c)),W(e,e.top<=e.ci.top,"stack overflow"),e.stack[e.top-1].ttnov()},Ee=function(e,i){let t=Ze(e,i);return W(e,t.ttistable(t),"table expected"),we.setobj2s(e,e.top-1,he.luaH_get(e,t.value,e.stack[e.top-1])),e.stack[e.top-1].ttnov()},We=function(e,i,t){let r=new we.TValue(Pe,he.luaH_new(e));e.stack[e.top]=r,nt(e)},b=function(e,i){return new we.Udata(e,i)},fe=function(e,i){let t=b(e,i);return e.stack[e.top]=new we.TValue(ae,t),nt(e),t.data},ie=function(e,i,t){switch(ct(t),i.ttype()){case Z:{let r=i.value;return 1<=t&&t<=r.nupvalues?{name:Ae("",!0),val:r.upvalue[t-1]}:null}case J:{let r=i.value,c=r.p;if(!(1<=t&&t<=c.upvalues.length))return null;let k=c.upvalues[t-1].name;return{name:k?k.getstr():Ae("(*no name)",!0),val:r.upvals[t-1]}}default:return null}},He=function(e,i,t){let r=ie(e,Ze(e,i),t);if(r){let c=r.name,k=r.val;return we.pushobj2s(e,k),W(e,e.top<=e.ci.top,"stack overflow"),c}return null},mt=function(e,i,t){let r=Ze(e,i);at(e,1);let c=ie(e,r,t);if(c){let k=c.name;return c.val.setfrom(e.stack[e.top-1]),delete e.stack[--e.top],k}return null},l=function(e){We(e)},n=function(e,i,t){Ne(e,t),Yt(e,i)},u=function(e,i){let t=Ze(e,i),r,c=!1;switch(t.ttnov()){case Pe:case ae:r=t.value.metatable;break;default:r=e.l_G.mt[t.ttnov()];break}return r!=null&&(e.stack[e.top]=new ne(Pe,r),nt(e),c=!0),c},o=function(e,i){let t=Ze(e,i);W(e,t.ttisfulluserdata(),"full userdata expected");let r=t.value.uservalue;return e.stack[e.top]=new ne(r.type,r.value),nt(e),e.stack[e.top-1].ttnov()},C=function(e,i){let t=Ze(e,i);return X.luaV_gettable(e,t,e.stack[e.top-1],e.top-1),e.stack[e.top-1].ttnov()},se=function(e,i,t){return zt(e,Ze(e,i),t)},Ve=function(e,i,t){let r=Ze(e,i);return ct(t),e.stack[e.top]=new ne(xe,t),nt(e),X.luaV_gettable(e,r,e.stack[e.top-1],e.top-1),e.stack[e.top-1].ttnov()},dt=function(e,i){return zt(e,he.luaH_getint(e.l_G.l_registry.value,ge),i)},Dt=function(e,i){return!Ze(e,i).l_isfalse()},Kt=function(e,i){let t=Ze(e,i);if(!t.ttisstring()){if(!X.cvt2str(t))return null;we.luaO_tostring(e,t)}return t.svalue()},Gt=Kt,sn=function(e,i){let t=Ze(e,i);if(!t.ttisstring()){if(!X.cvt2str(t))return null;we.luaO_tostring(e,t)}return t.jsstring()},jt=function(e,i){let t=Kt(e,i);return new DataView(t.buffer,t.byteOffset,t.byteLength)},_=function(e,i){let t=Ze(e,i);switch(t.ttype()){case Ue:case Le:return t.vslen();case ae:return t.value.len;case Pe:return he.luaH_getn(t.value);default:return 0}},G=function(e,i){let t=Ze(e,i);return t.ttislcf()||t.ttisCclosure()?t.value:null},be=function(e,i){let t=pe(e,i);return t===!1?0:t},pe=function(e,i){return X.tointeger(Ze(e,i))},Xe=function(e,i){let t=ke(e,i);return t===!1?0:t},ke=function(e,i){return X.tonumber(Ze(e,i))},Ie=function(e,i){let t=Ze(e,i);switch(t.ttnov()){case ae:return t.value.data;case Me:return t.value;default:return null}},Mt=function(e,i){let t=Ze(e,i);return t.ttisthread()?t.value:null},re=function(e,i){let t=Ze(e,i);switch(t.ttype()){case Pe:case J:case Z:case Te:case ce:case ae:case Me:return t.value;default:return null}},Be=new WeakMap,Je=function(e,i){let t=Be.get(e);return t?i===null||i.l_G===t:!1},Ot=function(e,i,t){let r=function(c){W(c,c instanceof je.lua_State&&e===c.l_G,"must be from same global state"),c.stack[c.top]=new ne(i,t),nt(c)};return Be.set(r,e),r},nn=function(e,i){let t=Ze(e,i);return Ot(e.l_G,t.type,t.value)},un=function(e,i,t,r){let c=Ze(e,i),k=Ze(e,t),U=0;if(ht(c)&&ht(k))switch(r){case A:U=X.luaV_equalobj(e,c,k);break;case S:U=X.luaV_lessthan(e,c,k);break;case T:U=X.luaV_lessequal(e,c,k);break;default:W(e,!1,"invalid option")}return U},gn=function(e,i){let t=new ne,r=we.luaO_str2num(i,t);return r!==0&&(e.stack[e.top]=t,nt(e)),r},Sn=function(e,i){H.luaD_callnoyield(e,i.funcOff,i.nresults)},cn=function(e,i){let t=Ze(e,i);return ht(t)?t.ttnov():Ke},Fn=function(e,i){return W(e,Ke<=i&&i<Se,"invalid tag"),x.ttypename(i)},Zn=function(e,i){let t=Ze(e,i);return t.ttislcf(t)||t.ttisCclosure()},On=function(e,i){return cn(e,i)===ye},Gn=function(e,i){return cn(e,i)===q},Vn=function(e,i){return cn(e,i)===Ke},oa=function(e,i){return cn(e,i)<=0},mn=function(e,i){return Ze(e,i).ttistable()},Ln=function(e,i){return Ze(e,i).ttisinteger()},ga=function(e,i){return X.tonumber(Ze(e,i))!==!1},fn=function(e,i){let t=Ze(e,i);return t.ttisstring()||X.cvt2str(t)},ia=function(e,i){let t=Ze(e,i);return t.ttisfulluserdata(t)||t.ttislightuserdata()},$n=function(e,i){return cn(e,i)===ce},Jn=function(e,i){return cn(e,i)===Q},ma=function(e,i){return cn(e,i)===Me},ua=function(e,i,t){let r=Ze(e,i),c=Ze(e,t);return ht(r)&&ht(c)?X.luaV_equalobj(null,r,c):0},_n=function(e,i){i!==R&&i!==s?at(e,2):(at(e,1),we.pushobj2s(e,e.stack[e.top-1]),W(e,e.top<=e.ci.top,"stack overflow")),we.luaO_arith(e,i,e.stack[e.top-2],e.stack[e.top-1],e.stack[e.top-2]),delete e.stack[--e.top]},Hn=Ae("?"),Nn=function(e,i,t,r,c){r?r=Oe(r):r=Hn,c!==null&&(c=Oe(c));let k=new ee(e,i,t),U=H.luaD_protectedparser(e,k,r,c);if(U===I){let j=e.stack[e.top-1].value;if(j.nupvalues>=1){let lt=he.luaH_getint(e.l_G.l_registry.value,ge);j.upvals[0].setfrom(lt)}}return U},Cn=function(e,i,t,r){at(e,1);let c=e.stack[e.top-1];return c.ttisLclosure()?D(e,c.value.p,i,t,r):1},Qn=function(e){return e.status},hn=function(e,i){at(e,1);let t=Ze(e,i);W(e,t.ttisfulluserdata(),"full userdata expected"),t.value.uservalue.setfrom(e.stack[e.top-1]),delete e.stack[--e.top]},Pn=function(e,i,t){W(e,t===f||e.ci.top-e.top>=t-i,"results from function overflow current stack size")},Rn=function(e,i,t,r,c){W(e,c===null||!(e.ci.callstatus&je.CIST_LUA),"cannot use continuations inside hooks"),at(e,i+1),W(e,e.status===I,"cannot do calls on non-normal thread"),Pn(e,i,t);let k=e.top-(i+1);c!==null&&e.nny===0?(e.ci.c_k=c,e.ci.c_ctx=r,H.luaD_call(e,k,t)):H.luaD_callnoyield(e,k,t),t===f&&e.ci.top<e.top&&(e.ci.top=e.top)},Aa=function(e,i,t){Rn(e,i,t,0,null)},Dn=function(e,i,t,r,c,k){W(e,k===null||!(e.ci.callstatus&je.CIST_LUA),"cannot use continuations inside hooks"),at(e,i+1),W(e,e.status===I,"cannot do calls on non-normal thread"),Pn(e,i,t);let U,j;r===0?j=0:j=St(e,r);let lt=e.top-(i+1);if(k===null||e.nny>0){let rt={funcOff:lt,nresults:t};U=H.luaD_pcall(e,Sn,rt,lt,j)}else{let rt=e.ci;rt.c_k=k,rt.c_ctx=c,rt.extra=lt,rt.c_old_errfunc=e.errfunc,e.errfunc=j,rt.callstatus&=~je.CIST_OAH|e.allowhook,rt.callstatus|=je.CIST_YPCALL,H.luaD_call(e,lt,t),rt.callstatus&=~je.CIST_YPCALL,e.errfunc=rt.c_old_errfunc,U=I}return t===f&&e.ci.top<e.top&&(e.ci.top=e.top),U},An=function(e,i,t,r){return Dn(e,i,t,r,0,null)},ca=function(e){at(e,1),_e.luaG_errormsg(e)},ea=function(e,i){let t=Ze(e,i);return W(e,t.ttistable(),"table expected"),e.stack[e.top]=new ne,he.luaH_next(e,t.value,e.top-1)?(nt(e),1):(delete e.stack[e.top],delete e.stack[--e.top],0)},ba=function(e,i){at(e,i),i>=2?X.luaV_concat(e,i):i===0&&(we.pushsvalue2s(e,de(e,Ae("",!0))),W(e,e.top<=e.ci.top,"stack overflow"))},Bn=function(e,i){let t=Ze(e,i),r=new ne;X.luaV_objlen(e,r,t),e.stack[e.top]=r,nt(e)},bn=function(e,i,t){let r=Ze(e,i);W(e,r.ttisLclosure(),"Lua function expected");let c=r.value;return ct(t),W(e,1<=t&&t<=c.p.upvalues.length,"invalid upvalue index"),{f:c,i:t-1}},fa=function(e,i,t){let r=Ze(e,i);switch(r.ttype()){case J:{let c=bn(e,i,t);return c.f.upvals[c.i]}case Z:{let c=r.value;return W(e,(t|0)===t&&t>0&&t<=c.nupvalues,"invalid upvalue index"),c.upvalue[t-1]}default:return W(e,!1,"closure expected"),null}},Ta=function(e,i,t,r,c){let k=bn(e,i,t),U=bn(e,r,c),j=U.f.upvals[U.i];k.f.upvals[k.i]=j},Xn=function(){},Ea=function(){return console.warn("lua_getallocf is not available"),0},p=function(){return console.warn("lua_setallocf is not available"),0},v=function(){return console.warn("lua_getextraspace is not available"),0};return Ge.api_incr_top=nt,Ge.api_checknelems=at,Ge.lua_absindex=ve,Ge.lua_arith=_n,Ge.lua_atpanic=Et,Ge.lua_atnativeerror=bt,Ge.lua_call=Aa,Ge.lua_callk=Rn,Ge.lua_checkstack=tt,Ge.lua_compare=un,Ge.lua_concat=ba,Ge.lua_copy=B,Ge.lua_createtable=We,Ge.lua_dump=Cn,Ge.lua_error=ca,Ge.lua_gc=Xn,Ge.lua_getallocf=Ea,Ge.lua_getextraspace=v,Ge.lua_getfield=se,Ge.lua_getglobal=dt,Ge.lua_geti=Ve,Ge.lua_getmetatable=u,Ge.lua_gettable=C,Ge.lua_gettop=K,Ge.lua_getupvalue=He,Ge.lua_getuservalue=o,Ge.lua_insert=ot,Ge.lua_isboolean=Gn,Ge.lua_iscfunction=Zn,Ge.lua_isfunction=Jn,Ge.lua_isinteger=Ln,Ge.lua_islightuserdata=ma,Ge.lua_isnil=On,Ge.lua_isnone=Vn,Ge.lua_isnoneornil=oa,Ge.lua_isnumber=ga,Ge.lua_isproxy=Je,Ge.lua_isstring=fn,Ge.lua_istable=mn,Ge.lua_isthread=$n,Ge.lua_isuserdata=ia,Ge.lua_len=Bn,Ge.lua_load=Nn,Ge.lua_newtable=l,Ge.lua_newuserdata=fe,Ge.lua_next=ea,Ge.lua_pcall=An,Ge.lua_pcallk=Dn,Ge.lua_pop=m,Ge.lua_pushboolean=Qe,Ge.lua_pushcclosure=P,Ge.lua_pushcfunction=Ne,Ge.lua_pushfstring=d,Ge.lua_pushglobaltable=yt,Ge.lua_pushinteger=V,Ge.lua_pushjsclosure=oe,Ge.lua_pushjsfunction=it,Ge.lua_pushlightuserdata=xt,Ge.lua_pushliteral=te,Ge.lua_pushlstring=me,Ge.lua_pushnil=Fe,Ge.lua_pushnumber=y,Ge.lua_pushstring=De,Ge.lua_pushthread=kt,Ge.lua_pushvalue=M,Ge.lua_pushvfstring=qe,Ge.lua_rawequal=ua,Ge.lua_rawget=Ee,Ge.lua_rawgeti=F,Ge.lua_rawgetp=E,Ge.lua_rawlen=_,Ge.lua_rawset=Xt,Ge.lua_rawseti=$t,Ge.lua_rawsetp=Ft,Ge.lua_register=n,Ge.lua_remove=ue,Ge.lua_replace=st,Ge.lua_rotate=w,Ge.lua_setallocf=p,Ge.lua_setfield=Bt,Ge.lua_setglobal=Yt,Ge.lua_seti=Ht,Ge.lua_setmetatable=Vt,Ge.lua_settable=Nt,Ge.lua_settop=O,Ge.lua_setupvalue=mt,Ge.lua_setuservalue=hn,Ge.lua_status=Qn,Ge.lua_stringtonumber=gn,Ge.lua_toboolean=Dt,Ge.lua_tocfunction=G,Ge.lua_todataview=jt,Ge.lua_tointeger=be,Ge.lua_tointegerx=pe,Ge.lua_tojsstring=sn,Ge.lua_tolstring=Kt,Ge.lua_tonumber=Xe,Ge.lua_tonumberx=ke,Ge.lua_topointer=re,Ge.lua_toproxy=nn,Ge.lua_tostring=Gt,Ge.lua_tothread=Mt,Ge.lua_touserdata=Ie,Ge.lua_type=cn,Ge.lua_typename=Fn,Ge.lua_upvalueid=fa,Ge.lua_upvaluejoin=Ta,Ge.lua_version=pt,Ge.lua_xmove=gt,Ge}var Vl;function kn(){if(Vl)return z;Vl=1;const f=rn(),s=Xa(),A=pa(),T=Yn(),S=ha();return z.LUA_AUTHORS=f.LUA_AUTHORS,z.LUA_COPYRIGHT=f.LUA_COPYRIGHT,z.LUA_ERRERR=f.thread_status.LUA_ERRERR,z.LUA_ERRGCMM=f.thread_status.LUA_ERRGCMM,z.LUA_ERRMEM=f.thread_status.LUA_ERRMEM,z.LUA_ERRRUN=f.thread_status.LUA_ERRRUN,z.LUA_ERRSYNTAX=f.thread_status.LUA_ERRSYNTAX,z.LUA_HOOKCALL=f.LUA_HOOKCALL,z.LUA_HOOKCOUNT=f.LUA_HOOKCOUNT,z.LUA_HOOKLINE=f.LUA_HOOKLINE,z.LUA_HOOKRET=f.LUA_HOOKRET,z.LUA_HOOKTAILCALL=f.LUA_HOOKTAILCALL,z.LUA_MASKCALL=f.LUA_MASKCALL,z.LUA_MASKCOUNT=f.LUA_MASKCOUNT,z.LUA_MASKLINE=f.LUA_MASKLINE,z.LUA_MASKRET=f.LUA_MASKRET,z.LUA_MINSTACK=f.LUA_MINSTACK,z.LUA_MULTRET=f.LUA_MULTRET,z.LUA_NUMTAGS=f.constant_types.LUA_NUMTAGS,z.LUA_OK=f.thread_status.LUA_OK,z.LUA_OPADD=f.LUA_OPADD,z.LUA_OPBAND=f.LUA_OPBAND,z.LUA_OPBNOT=f.LUA_OPBNOT,z.LUA_OPBOR=f.LUA_OPBOR,z.LUA_OPBXOR=f.LUA_OPBXOR,z.LUA_OPDIV=f.LUA_OPDIV,z.LUA_OPEQ=f.LUA_OPEQ,z.LUA_OPIDIV=f.LUA_OPIDIV,z.LUA_OPLE=f.LUA_OPLE,z.LUA_OPLT=f.LUA_OPLT,z.LUA_OPMOD=f.LUA_OPMOD,z.LUA_OPMUL=f.LUA_OPMUL,z.LUA_OPPOW=f.LUA_OPPOW,z.LUA_OPSHL=f.LUA_OPSHL,z.LUA_OPSHR=f.LUA_OPSHR,z.LUA_OPSUB=f.LUA_OPSUB,z.LUA_OPUNM=f.LUA_OPUNM,z.LUA_REGISTRYINDEX=f.LUA_REGISTRYINDEX,z.LUA_RELEASE=f.LUA_RELEASE,z.LUA_RIDX_GLOBALS=f.LUA_RIDX_GLOBALS,z.LUA_RIDX_LAST=f.LUA_RIDX_LAST,z.LUA_RIDX_MAINTHREAD=f.LUA_RIDX_MAINTHREAD,z.LUA_SIGNATURE=f.LUA_SIGNATURE,z.LUA_TNONE=f.constant_types.LUA_TNONE,z.LUA_TNIL=f.constant_types.LUA_TNIL,z.LUA_TBOOLEAN=f.constant_types.LUA_TBOOLEAN,z.LUA_TLIGHTUSERDATA=f.constant_types.LUA_TLIGHTUSERDATA,z.LUA_TNUMBER=f.constant_types.LUA_TNUMBER,z.LUA_TSTRING=f.constant_types.LUA_TSTRING,z.LUA_TTABLE=f.constant_types.LUA_TTABLE,z.LUA_TFUNCTION=f.constant_types.LUA_TFUNCTION,z.LUA_TUSERDATA=f.constant_types.LUA_TUSERDATA,z.LUA_TTHREAD=f.constant_types.LUA_TTHREAD,z.LUA_VERSION=f.LUA_VERSION,z.LUA_VERSION_MAJOR=f.LUA_VERSION_MAJOR,z.LUA_VERSION_MINOR=f.LUA_VERSION_MINOR,z.LUA_VERSION_NUM=f.LUA_VERSION_NUM,z.LUA_VERSION_RELEASE=f.LUA_VERSION_RELEASE,z.LUA_YIELD=f.thread_status.LUA_YIELD,z.lua_Debug=f.lua_Debug,z.lua_upvalueindex=f.lua_upvalueindex,z.lua_absindex=s.lua_absindex,z.lua_arith=s.lua_arith,z.lua_atpanic=s.lua_atpanic,z.lua_atnativeerror=s.lua_atnativeerror,z.lua_call=s.lua_call,z.lua_callk=s.lua_callk,z.lua_checkstack=s.lua_checkstack,z.lua_close=S.lua_close,z.lua_compare=s.lua_compare,z.lua_concat=s.lua_concat,z.lua_copy=s.lua_copy,z.lua_createtable=s.lua_createtable,z.lua_dump=s.lua_dump,z.lua_error=s.lua_error,z.lua_gc=s.lua_gc,z.lua_getallocf=s.lua_getallocf,z.lua_getextraspace=s.lua_getextraspace,z.lua_getfield=s.lua_getfield,z.lua_getglobal=s.lua_getglobal,z.lua_gethook=A.lua_gethook,z.lua_gethookcount=A.lua_gethookcount,z.lua_gethookmask=A.lua_gethookmask,z.lua_geti=s.lua_geti,z.lua_getinfo=A.lua_getinfo,z.lua_getlocal=A.lua_getlocal,z.lua_getmetatable=s.lua_getmetatable,z.lua_getstack=A.lua_getstack,z.lua_gettable=s.lua_gettable,z.lua_gettop=s.lua_gettop,z.lua_getupvalue=s.lua_getupvalue,z.lua_getuservalue=s.lua_getuservalue,z.lua_insert=s.lua_insert,z.lua_isboolean=s.lua_isboolean,z.lua_iscfunction=s.lua_iscfunction,z.lua_isfunction=s.lua_isfunction,z.lua_isinteger=s.lua_isinteger,z.lua_islightuserdata=s.lua_islightuserdata,z.lua_isnil=s.lua_isnil,z.lua_isnone=s.lua_isnone,z.lua_isnoneornil=s.lua_isnoneornil,z.lua_isnumber=s.lua_isnumber,z.lua_isproxy=s.lua_isproxy,z.lua_isstring=s.lua_isstring,z.lua_istable=s.lua_istable,z.lua_isthread=s.lua_isthread,z.lua_isuserdata=s.lua_isuserdata,z.lua_isyieldable=T.lua_isyieldable,z.lua_len=s.lua_len,z.lua_load=s.lua_load,z.lua_newstate=S.lua_newstate,z.lua_newtable=s.lua_newtable,z.lua_newthread=S.lua_newthread,z.lua_newuserdata=s.lua_newuserdata,z.lua_next=s.lua_next,z.lua_pcall=s.lua_pcall,z.lua_pcallk=s.lua_pcallk,z.lua_pop=s.lua_pop,z.lua_pushboolean=s.lua_pushboolean,z.lua_pushcclosure=s.lua_pushcclosure,z.lua_pushcfunction=s.lua_pushcfunction,z.lua_pushfstring=s.lua_pushfstring,z.lua_pushglobaltable=s.lua_pushglobaltable,z.lua_pushinteger=s.lua_pushinteger,z.lua_pushjsclosure=s.lua_pushjsclosure,z.lua_pushjsfunction=s.lua_pushjsfunction,z.lua_pushlightuserdata=s.lua_pushlightuserdata,z.lua_pushliteral=s.lua_pushliteral,z.lua_pushlstring=s.lua_pushlstring,z.lua_pushnil=s.lua_pushnil,z.lua_pushnumber=s.lua_pushnumber,z.lua_pushstring=s.lua_pushstring,z.lua_pushthread=s.lua_pushthread,z.lua_pushvalue=s.lua_pushvalue,z.lua_pushvfstring=s.lua_pushvfstring,z.lua_rawequal=s.lua_rawequal,z.lua_rawget=s.lua_rawget,z.lua_rawgeti=s.lua_rawgeti,z.lua_rawgetp=s.lua_rawgetp,z.lua_rawlen=s.lua_rawlen,z.lua_rawset=s.lua_rawset,z.lua_rawseti=s.lua_rawseti,z.lua_rawsetp=s.lua_rawsetp,z.lua_register=s.lua_register,z.lua_remove=s.lua_remove,z.lua_replace=s.lua_replace,z.lua_resume=T.lua_resume,z.lua_rotate=s.lua_rotate,z.lua_setallocf=s.lua_setallocf,z.lua_setfield=s.lua_setfield,z.lua_setglobal=s.lua_setglobal,z.lua_sethook=A.lua_sethook,z.lua_seti=s.lua_seti,z.lua_setlocal=A.lua_setlocal,z.lua_setmetatable=s.lua_setmetatable,z.lua_settable=s.lua_settable,z.lua_settop=s.lua_settop,z.lua_setupvalue=s.lua_setupvalue,z.lua_setuservalue=s.lua_setuservalue,z.lua_status=s.lua_status,z.lua_stringtonumber=s.lua_stringtonumber,z.lua_toboolean=s.lua_toboolean,z.lua_todataview=s.lua_todataview,z.lua_tointeger=s.lua_tointeger,z.lua_tointegerx=s.lua_tointegerx,z.lua_tojsstring=s.lua_tojsstring,z.lua_tolstring=s.lua_tolstring,z.lua_tonumber=s.lua_tonumber,z.lua_tonumberx=s.lua_tonumberx,z.lua_topointer=s.lua_topointer,z.lua_toproxy=s.lua_toproxy,z.lua_tostring=s.lua_tostring,z.lua_tothread=s.lua_tothread,z.lua_touserdata=s.lua_touserdata,z.lua_type=s.lua_type,z.lua_typename=s.lua_typename,z.lua_upvalueid=s.lua_upvalueid,z.lua_upvaluejoin=s.lua_upvaluejoin,z.lua_version=s.lua_version,z.lua_xmove=s.lua_xmove,z.lua_yield=T.lua_yield,z.lua_yieldk=T.lua_yieldk,z.lua_tocfunction=s.lua_tocfunction,z}var _t={},Hl;function Un(){if(Hl)return _t;Hl=1;const{LUAL_BUFFERSIZE:f}=vn(),{LUA_ERRERR:s,LUA_MULTRET:A,LUA_REGISTRYINDEX:T,LUA_SIGNATURE:S,LUA_TBOOLEAN:R,LUA_TLIGHTUSERDATA:$,LUA_TNIL:ge,LUA_TNONE:le,LUA_TNUMBER:Se,LUA_TSTRING:q,LUA_TTABLE:Z,LUA_VERSION_NUM:Q,lua_Debug:Te,lua_absindex:J,lua_atpanic:Me,lua_call:Le,lua_checkstack:ye,lua_concat:Ke,lua_copy:ut,lua_createtable:xe,lua_error:Ue,lua_getfield:Pe,lua_getinfo:ce,lua_getmetatable:ae,lua_getstack:I,lua_gettop:Oe,lua_insert:Ae,lua_isinteger:W,lua_isnil:_e,lua_isnumber:H,lua_isstring:D,lua_istable:Ce,lua_len:we,lua_load:je,lua_newstate:de,lua_newtable:Ye,lua_next:$e,lua_pcall:x,lua_pop:Y,lua_pushboolean:X,lua_pushcclosure:he,lua_pushcfunction:ee,lua_pushfstring:ne,lua_pushinteger:ze,lua_pushliteral:nt,lua_pushlstring:at,lua_pushnil:ft,lua_pushstring:ct,lua_pushvalue:ht,lua_pushvfstring:pt,lua_rawequal:Et,lua_rawget:bt,lua_rawgeti:Ze,lua_rawlen:St,lua_rawseti:tt,lua_remove:gt,lua_setfield:ve,lua_setglobal:K,lua_setmetatable:M,lua_settop:O,lua_toboolean:m,lua_tointeger:g,lua_tointegerx:w,lua_tojsstring:B,lua_tolstring:ue,lua_tonumber:ot,lua_tonumberx:st,lua_topointer:Fe,lua_tostring:y,lua_touserdata:V,lua_type:me,lua_typename:De,lua_version:qe}=kn(),{from_userstring:d,luastring_eq:te,to_luastring:P,to_uristring:oe}=In(),Ne=s+1,it=P("_LOADED"),Qe=P("_PRELOAD"),xt=P("FILE*"),kt=72,yt=P("__name"),wt=P("__tostring"),Yt=new Uint8Array(0);class Vt{constructor(){this.L=null,this.b=Yt,this.n=0}}const Nt=10,Bt=11,Ht=function(p,v,e){if(e===0||!Ce(p,-1))return 0;for(ft(p);$e(p,-2);){if(me(p,-2)===q){if(Et(p,v,-1))return Y(p,1),1;if(Ht(p,v,e-1))return gt(p,-2),nt(p,"."),Ae(p,-2),Ke(p,3),1}Y(p,1)}return 0},Xt=function(p,v){let e=Oe(p);if(ce(p,P("f"),v),Pe(p,T,it),Ht(p,e+1,2)){let i=y(p,-1);return i[0]===95&&i[1]===71&&i[2]===46&&(ct(p,i.subarray(3)),gt(p,-2)),ut(p,-1,e+1),Y(p,2),1}else return O(p,e),0},$t=function(p,v){Xt(p,v)?(ne(p,P("function '%s'"),y(p,-1)),gt(p,-2)):v.namewhat.length!==0?ne(p,P("%s '%s'"),v.namewhat,v.name):v.what&&v.what[0]===109?nt(p,"main chunk"):v.what&&v.what[0]===76?ne(p,P("function <%s:%d>"),v.short_src,v.linedefined):nt(p,"?")},Ft=function(p){let v=new Te,e=1,i=1;for(;I(p,i,v);)e=i,i*=2;for(;e<i;){let t=Math.floor((e+i)/2);I(p,t,v)?e=t+1:i=t}return i-1},zt=function(p,v,e,i){let t=new Te,r=Oe(p),c=Ft(v),k=c-i>Nt+Bt?Nt:-1;for(e&&ne(p,P(`%s
`),e),Nn(p,10,null),nt(p,"stack traceback:");I(v,i++,t);)k--===0?(nt(p,`
	...`),i=c-Bt+1):(ce(v,P("Slnt",!0),t),ne(p,P(`
	%s:`),t.short_src),t.currentline>0&&nt(p,`${t.currentline}:`),nt(p," in "),$t(p,t),t.istailcall&&nt(p,`
	(...tail calls..)`),Ke(p,Oe(p)-r));Ke(p,Oe(p)-r)},F=function(p){let v="PANIC: unprotected error in call to Lua API ("+B(p,-1)+")";throw new Error(v)},E=function(p,v,e){let i=new Te;return I(p,0,i)?(ce(p,P("n"),i),te(i.namewhat,P("method"))&&(v--,v===0)?b(p,P("calling '%s' on bad self (%s)"),i.name,e):(i.name===null&&(i.name=Xt(p,i)?y(p,-1):P("?")),b(p,P("bad argument #%d to '%s' (%s)"),v,i.name,e))):b(p,P("bad argument #%d (%s)"),v,e)},Ee=function(p,v,e){let i;mn(p,v,yt)===q?i=y(p,-1):me(p,v)===$?i=P("light userdata",!0):i=Ve(p,v);let t=ne(p,P("%s expected, got %s"),e,i);return E(p,v,t)},We=function(p,v){let e=new Te;if(I(p,v,e)&&(ce(p,P("Sl",!0),e),e.currentline>0)){ne(p,P("%s:%d: "),e.short_src,e.currentline);return}ct(p,P(""))},b=function(p,v,...e){return We(p,1),pt(p,v,e),Ke(p,2),Ue(p)},fe=function(p,v,e,i){if(v)return X(p,1),1;{ft(p);let t,r;return i?(t=i.message,r=-i.errno):(t="Success",r=0),e?ne(p,P("%s: %s"),e,P(t)):ct(p,P(t)),ze(p,r),3}},ie=function(p,v){let e,i;if(v===null)return X(p,1),nt(p,"exit"),ze(p,0),3;if(v.status)e="exit",i=v.status;else if(v.signal)e="signal",i=v.signal;else return fe(p,0,null,v);return ft(p),nt(p,e),ze(p,i),3},He=function(p,v){return Pe(p,T,v)},mt=function(p,v){return He(p,v)!==ge?0:(Y(p,1),xe(p,0,2),ct(p,v),ve(p,-2,yt),ht(p,-1),ve(p,T,v),1)},l=function(p,v){He(p,v),M(p,-2)},n=function(p,v,e){let i=V(p,v);return i!==null&&ae(p,v)?(He(p,e),Et(p,-1,-2)||(i=null),Y(p,2),i):null},u=function(p,v,e){let i=n(p,v,e);return i===null&&Ee(p,v,e),i},o=function(p,v,e,i){let t=e!==null?_(p,v,e):sn(p,v);for(let r=0;i[r];r++)if(te(i[r],t))return r;return E(p,v,ne(p,P("invalid option '%s'"),t))},C=function(p,v,e){Ee(p,v,De(p,e))},se=function(){let p=de();return p&&Me(p,F),p},Ve=function(p,v){return De(p,me(p,v))},dt=function(p,v,e,i){v||E(p,e,i)},Dt=function(p,v){me(p,v)===le&&E(p,v,P("value expected",!0))},Kt=function(p,v,e){me(p,v)!==e&&C(p,v,e)},Gt=function(p,v){let e=ue(p,v);return e==null&&C(p,v,q),e},sn=Gt,jt=function(p,v,e){return me(p,v)<=0?e===null?null:d(e):Gt(p,v)},_=jt,G=function(p,v){H(p,v)?E(p,v,P("number has no integer representation",!0)):C(p,v,Se)},be=function(p,v){let e=st(p,v);return e===!1&&C(p,v,Se),e},pe=function(p,v,e){return Fn(p,be,v,e)},Xe=function(p,v){let e=w(p,v);return e===!1&&G(p,v),e},ke=function(p,v,e){return Fn(p,Xe,v,e)},Ie=function(p,v){let e=p.n+v;if(p.b.length<e){let i=Math.max(p.b.length*2,e),t=new Uint8Array(i);t.set(p.b),p.b=t}return p.b.subarray(p.n,e)},Mt=function(p,v){v.L=p,v.b=Yt},re=function(p,v,e){return Mt(p,v),Ie(v,e)},Be=function(p){return Ie(p,f)},Je=function(p,v,e){e>0&&(v=d(v),Ie(p,e).set(v.subarray(0,e)),gn(p,e))},Ot=function(p,v){v=d(v),Je(p,v,v.length)},nn=function(p){at(p.L,p.b,p.n),p.n=0,p.b=Yt},un=function(p,v){Ie(p,1),p.b[p.n++]=v},gn=function(p,v){p.n+=v},Sn=function(p,v){gn(p,v),nn(p)},cn=function(p){let v=p.L,e=y(v,-1);Je(p,e,e.length),Y(v,1)},Fn=function(p,v,e,i){return me(p,e)<=0?i:v(p,e)},Zn=function(p,v){let e=v.string;return v.string=null,e},On=function(p,v,e,i,t){return je(p,Zn,{string:v},i,t)},Gn=function(p,v,e,i){return On(p,v,e,i,null)},Vn=function(p,v){return Gn(p,v,v.length,v)},oa=function(p,v){return Vn(p,v)||x(p,0,A,0)},mn=function(p,v,e){if(ae(p,v)){ct(p,e);let i=bt(p,-2);return i===ge?Y(p,2):gt(p,-2),i}else return ge},Ln=function(p,v,e){return v=J(p,v),mn(p,v,e)===ge?!1:(ht(p,v),Le(p,1,1),!0)},ga=function(p,v){we(p,v);let e=w(p,-1);return e===!1&&b(p,P("object length is not an integer",!0)),Y(p,1),e},fn=P("%I"),ia=P("%f"),$n=function(p,v){if(Ln(p,v,wt))D(p,-1)||b(p,P("'__tostring' must return a string"));else switch(me(p,v)){case Se:{W(p,v)?ne(p,fn,g(p,v)):ne(p,ia,ot(p,v));break}case q:ht(p,v);break;case R:nt(p,m(p,v)?"true":"false");break;case ge:nt(p,"nil");break;default:{let i=mn(p,v,yt),t=i===q?y(p,-1):Ve(p,v);ne(p,P("%s: %p"),t,Fe(p,v)),i!==ge&&gt(p,-2);break}}return ue(p,-1)},Jn=function(p,v,e,i){_n(p,T,it),Pe(p,-1,v),m(p,-1)||(Y(p,1),ee(p,e),ct(p,v),Le(p,1,1),ht(p,-1),ve(p,-3,v)),gt(p,-2),i&&(ht(p,-1),K(p,v))},ma=function(p,v,e){var i=e>>>0,t=v.length,r=p.length+1-t;e:for(;i<r;i++){for(let c=0;c<t;c++)if(p[i+c]!==v[c])continue e;return i}return-1},ua=function(p,v,e,i){let t,r=new Vt;for(Mt(p,r);(t=ma(v,e))>=0;)Je(r,v,t),Ot(r,i),v=v.subarray(t+e.length);return Ot(r,v),nn(r),y(p,-1)},_n=function(p,v,e){return Pe(p,v,e)===Z?!0:(Y(p,1),v=J(p,v),Ye(p),ht(p,-1),ve(p,v,e),!1)},Hn=function(p,v,e){Nn(p,e,P("too many upvalues",!0));for(let i in v){for(let t=0;t<e;t++)ht(p,-e);he(p,v[i],e),ve(p,-(e+2),P(i))}Y(p,e)},Nn=function(p,v,e){ye(p,v)||(e?b(p,P("stack overflow (%s)"),e):b(p,P("stack overflow",!0)))},Cn=function(p){xe(p)},Qn=function(p,v){xe(p),Hn(p,v,0)},hn=-2,Pn=-1,Rn=function(p,v){let e;return _e(p,-1)?(Y(p,1),Pn):(v=J(p,v),Ze(p,v,0),e=g(p,-1),Y(p,1),e!==0?(Ze(p,v,e),tt(p,v,0)):e=St(p,v)+1,tt(p,v,e),e)},Aa=function(p,v,e){e>=0&&(v=J(p,v),Ze(p,v,0),tt(p,v,e),ze(p,e),tt(p,v,0))},Dn=function(p,v,e,i){let t=i.message,r=y(p,e).subarray(1);return ne(p,P("cannot %s %s: %s"),P(v),r,P(t)),gt(p,e),Ne};let An;const ca=[239,187,191],ea=function(p){p.n=0;let v,e=0;do{if(v=An(p),v===null||v!==ca[e])return v;e++,p.buff[p.n++]=v}while(e<ca.length);return p.n=0,An(p)},ba=function(p){let v=ea(p);if(v===35){do v=An(p);while(v&&v!==10);return{skipped:!0,c:An(p)}}else return{skipped:!1,c:v}};let Bn;{class p{constructor(){this.n=NaN,this.f=null,this.buff=new Uint8Array(1024),this.pos=0,this.err=void 0}}const v=function(e,i){let t=i;if(t.f!==null&&t.n>0){let c=t.n;return t.n=0,t.f=t.f.subarray(t.pos),t.buff.subarray(0,c)}let r=t.f;return t.f=null,r};An=function(e){return e.pos<e.f.length?e.f[e.pos++]:null},Bn=function(e,i,t){let r=new p,c=Oe(e)+1;if(i===null)throw new Error("Can't read stdin in the browser");{ne(e,P("@%s"),i);let lt=oe(i),rt=new XMLHttpRequest;if(rt.open("GET",lt,!1),typeof window>"u"&&(rt.responseType="arraybuffer"),rt.send(),rt.status>=200&&rt.status<=299)typeof rt.response=="string"?r.f=P(rt.response):r.f=new Uint8Array(rt.response);else return r.err=rt.status,Dn(e,"open",c,{message:`${rt.status}: ${rt.statusText}`})}let k=ba(r);k.c===S[0]&&i||k.skipped&&(r.buff[r.n++]=10),k.c!==null&&(r.buff[r.n++]=k.c);let U=je(e,v,r,y(e,-1),t),j=r.err;return j?(O(e,c),Dn(e,"read",c,j)):(gt(e,c),U)}}const bn=function(p,v){return Bn(p,v,null)},fa=function(p,v){return bn(p,v)||x(p,0,A,0)},Ta=function(){for(let p=0;p<arguments.length;p++){let v=arguments[p];do{let e=/([^\n]*)\n?([\d\D]*)/.exec(v);console.error(e[1]),v=e[2]}while(v!=="")}},Xn=function(p,v,e){let i=qe(p);e!=kt&&b(p,P("core and library have incompatible numeric types")),i!=qe(null)?b(p,P("multiple Lua VMs detected")):i!==v&&b(p,P("version mismatch: app. needs %f, Lua core provides %f"),v,i)},Ea=function(p){Xn(p,Q,kt)};return _t.LUA_ERRFILE=Ne,_t.LUA_FILEHANDLE=xt,_t.LUA_LOADED_TABLE=it,_t.LUA_NOREF=hn,_t.LUA_PRELOAD_TABLE=Qe,_t.LUA_REFNIL=Pn,_t.luaL_Buffer=Vt,_t.luaL_addchar=un,_t.luaL_addlstring=Je,_t.luaL_addsize=gn,_t.luaL_addstring=Ot,_t.luaL_addvalue=cn,_t.luaL_argcheck=dt,_t.luaL_argerror=E,_t.luaL_buffinit=Mt,_t.luaL_buffinitsize=re,_t.luaL_callmeta=Ln,_t.luaL_checkany=Dt,_t.luaL_checkinteger=Xe,_t.luaL_checklstring=Gt,_t.luaL_checknumber=be,_t.luaL_checkoption=o,_t.luaL_checkstack=Nn,_t.luaL_checkstring=sn,_t.luaL_checktype=Kt,_t.luaL_checkudata=u,_t.luaL_checkversion=Ea,_t.luaL_checkversion_=Xn,_t.luaL_dofile=fa,_t.luaL_dostring=oa,_t.luaL_error=b,_t.luaL_execresult=ie,_t.luaL_fileresult=fe,_t.luaL_getmetafield=mn,_t.luaL_getmetatable=He,_t.luaL_getsubtable=_n,_t.luaL_gsub=ua,_t.luaL_len=ga,_t.luaL_loadbuffer=Gn,_t.luaL_loadbufferx=On,_t.luaL_loadfile=bn,_t.luaL_loadfilex=Bn,_t.luaL_loadstring=Vn,_t.luaL_newlib=Qn,_t.luaL_newlibtable=Cn,_t.luaL_newmetatable=mt,_t.luaL_newstate=se,_t.luaL_opt=Fn,_t.luaL_optinteger=ke,_t.luaL_optlstring=jt,_t.luaL_optnumber=pe,_t.luaL_optstring=_,_t.luaL_prepbuffer=Be,_t.luaL_prepbuffsize=Ie,_t.luaL_pushresult=nn,_t.luaL_pushresultsize=Sn,_t.luaL_ref=Rn,_t.luaL_requiref=Jn,_t.luaL_setfuncs=Hn,_t.luaL_setmetatable=l,_t.luaL_testudata=n,_t.luaL_tolstring=$n,_t.luaL_traceback=zt,_t.luaL_typename=Ve,_t.luaL_unref=Aa,_t.luaL_where=We,_t.lua_writestringerror=Ta,_t}var Lt={},Ya={},Xl;function dr(){if(Xl)return Ya;Xl=1;const{LUA_MULTRET:f,LUA_OK:s,LUA_TFUNCTION:A,LUA_TNIL:T,LUA_TNONE:S,LUA_TNUMBER:R,LUA_TSTRING:$,LUA_TTABLE:ge,LUA_VERSION:le,LUA_YIELD:Se,lua_call:q,lua_callk:Z,lua_concat:Q,lua_error:Te,lua_getglobal:J,lua_geti:Me,lua_getmetatable:Le,lua_gettop:ye,lua_insert:Ke,lua_isnil:ut,lua_isnone:xe,lua_isstring:Ue,lua_load:Pe,lua_next:ce,lua_pcallk:ae,lua_pop:I,lua_pushboolean:Oe,lua_pushcfunction:Ae,lua_pushglobaltable:W,lua_pushinteger:_e,lua_pushliteral:H,lua_pushnil:D,lua_pushstring:Ce,lua_pushvalue:we,lua_rawequal:je,lua_rawget:de,lua_rawlen:Ye,lua_rawset:$e,lua_remove:x,lua_replace:Y,lua_rotate:X,lua_setfield:he,lua_setmetatable:ee,lua_settop:ne,lua_setupvalue:ze,lua_stringtonumber:nt,lua_toboolean:at,lua_tolstring:ft,lua_tostring:ct,lua_type:ht,lua_typename:pt}=kn(),{luaL_argcheck:Et,luaL_checkany:bt,luaL_checkinteger:Ze,luaL_checkoption:St,luaL_checkstack:tt,luaL_checktype:gt,luaL_error:ve,luaL_getmetafield:K,luaL_loadbufferx:M,luaL_loadfile:O,luaL_loadfilex:m,luaL_optinteger:g,luaL_optstring:w,luaL_setfuncs:B,luaL_tolstring:ue,luaL_where:ot}=Un(),{to_jsstring:st,to_luastring:Fe}=In();let y,V;if(typeof TextDecoder=="function"){let n="",u=new TextDecoder("utf-8");y=function(C){n+=u.decode(C,{stream:!0})};let o=new Uint8Array(0);V=function(){n+=u.decode(o),console.log(n),n=""}}else{let n=[];y=function(u){try{u=st(u)}catch{let C=new Uint8Array(u.length);C.set(u),u=C}n.push(u)},V=function(){console.log.apply(console.log,n),n=[]}}const me=function(n){let u=ye(n);J(n,Fe("tostring",!0));for(let o=1;o<=u;o++){we(n,-1),we(n,o),q(n,1,1);let C=ft(n,-1);if(C===null)return ve(n,Fe("'tostring' must return a string to 'print'"));o>1&&y(Fe("	")),y(C),I(n,1)}return V(),0},De=function(n){return bt(n,1),ue(n,1),1},qe=function(n){return bt(n,1),Le(n,1)?(K(n,1,Fe("__metatable",!0)),1):(D(n),1)},d=function(n){let u=ht(n,2);return gt(n,1,ge),Et(n,u===T||u===ge,2,"nil or table expected"),K(n,1,Fe("__metatable",!0))!==T?ve(n,Fe("cannot change a protected metatable")):(ne(n,2),ee(n,1),1)},te=function(n){return bt(n,1),bt(n,2),Oe(n,je(n,1,2)),1},P=function(n){let u=ht(n,1);return Et(n,u===ge||u===$,1,"table or string expected"),_e(n,Ye(n,1)),1},oe=function(n){return gt(n,1,ge),bt(n,2),ne(n,2),de(n,1),1},Ne=function(n){return gt(n,1,ge),bt(n,2),bt(n,3),ne(n,3),$e(n,1),1},it=["stop","restart","collect","count","step","setpause","setstepmul","isrunning"].map(n=>Fe(n)),Qe=function(n){St(n,1,"collect",it),g(n,2,0),ve(n,Fe("lua_gc not implemented"))},xt=function(n){let u=ht(n,1);return Et(n,u!==S,1,"value expected"),Ce(n,pt(n,u)),1},kt=function(n,u,o,C){return bt(n,1),K(n,1,u)===T?(Ae(n,C),we(n,1),D(n)):(we(n,1),q(n,1,3)),3},yt=function(n){return gt(n,1,ge),ne(n,2),ce(n,1)?2:(D(n),1)},wt=function(n){return kt(n,Fe("__pairs",!0),0,yt)},Yt=function(n){let u=Ze(n,2)+1;return _e(n,u),Me(n,1,u)===T?1:2},Vt=function(n){return bt(n,1),Ae(n,Yt),we(n,1),_e(n,0),3},Nt=function(n,u){try{n=st(n)}catch{return null}let o=/^[\t\v\f \n\r]*([+-]?)0*([0-9A-Za-z]+)[\t\v\f \n\r]*$/.exec(n);if(!o)return null;let C=parseInt(o[1]+o[2],u);return isNaN(C)?null:C|0},Bt=function(n){if(ht(n,2)<=0){if(bt(n,1),ht(n,1)===R)return ne(n,1),1;{let u=ct(n,1);if(u!==null&&nt(n,u)===u.length+1)return 1}}else{let u=Ze(n,2);gt(n,1,$);let o=ct(n,1);Et(n,2<=u&&u<=36,2,"base out of range");let C=Nt(o,u);if(C!==null)return _e(n,C),1}return D(n),1},Ht=function(n){let u=g(n,2,1);return ne(n,1),ht(n,1)===$&&u>0&&(ot(n,u),we(n,1),Q(n,2)),Te(n)},Xt=function(n){return at(n,1)?ye(n):(bt(n,1),x(n,1),H(n,"assertion failed!"),ne(n,1),Ht(n))},$t=function(n){let u=ye(n);if(ht(n,1)===$&&ct(n,1)[0]===35)return _e(n,u-1),1;{let o=Ze(n,1);return o<0?o=u+o:o>u&&(o=u),Et(n,1<=o,1,"index out of range"),u-o}},Ft=function(n,u,o){return u!==s&&u!==Se?(Oe(n,0),we(n,-2),2):ye(n)-o},zt=function(n){bt(n,1),Oe(n,1),Ke(n,1);let u=ae(n,ye(n)-2,f,0,0,Ft);return Ft(n,u,0)},F=function(n){let u=ye(n);gt(n,2,A),Oe(n,1),we(n,1),X(n,3,2);let o=ae(n,u-2,f,2,2,Ft);return Ft(n,o,2)},E=function(n,u,o){return u===s?(o!==0&&(we(n,o),ze(n,-2,1)||I(n,1)),1):(D(n),Ke(n,-2),2)},Ee=5,We=function(n,u){return tt(n,2,"too many nested functions"),we(n,1),q(n,0,1),ut(n,-1)?(I(n,1),null):(Ue(n,-1)||ve(n,Fe("reader function must return a string")),Y(n,Ee),ct(n,Ee))},b=function(n){let u=ct(n,1),o=w(n,3,"bt"),C=xe(n,4)?0:4,se;if(u!==null){let Ve=w(n,2,u);se=M(n,u,u.length,Ve,o)}else{let Ve=w(n,2,"=(load)");gt(n,1,A),ne(n,Ee),se=Pe(n,We,null,Ve,o)}return E(n,se,C)},fe=function(n){let u=w(n,1,null),o=w(n,2,null),C=xe(n,3)?0:3,se=m(n,u,o);return E(n,se,C)},ie=function(n,u,o){return ye(n)-1},mt={assert:Xt,collectgarbage:Qe,dofile:function(n){let u=w(n,1,null);return ne(n,1),O(n,u)!==s?Te(n):(Z(n,0,f,0,ie),ie(n))},error:Ht,getmetatable:qe,ipairs:Vt,load:b,loadfile:fe,next:yt,pairs:wt,pcall:zt,print:me,rawequal:te,rawget:oe,rawlen:P,rawset:Ne,select:$t,setmetatable:d,tonumber:Bt,tostring:De,type:xt,xpcall:F},l=function(n){return W(n),B(n,mt,0),we(n,-1),he(n,-2,Fe("_G")),H(n,le),he(n,-2,Fe("_VERSION")),1};return Ya.luaopen_base=l,Ya}var Za={},zl;function hr(){if(zl)return Za;zl=1;const{LUA_OK:f,LUA_TFUNCTION:s,LUA_TSTRING:A,LUA_YIELD:T,lua_Debug:S,lua_checkstack:R,lua_concat:$,lua_error:ge,lua_getstack:le,lua_gettop:Se,lua_insert:q,lua_isyieldable:Z,lua_newthread:Q,lua_pop:Te,lua_pushboolean:J,lua_pushcclosure:Me,lua_pushliteral:Le,lua_pushthread:ye,lua_pushvalue:Ke,lua_resume:ut,lua_status:xe,lua_tothread:Ue,lua_type:Pe,lua_upvalueindex:ce,lua_xmove:ae,lua_yield:I}=kn(),{luaL_argcheck:Oe,luaL_checktype:Ae,luaL_newlib:W,luaL_where:_e}=Un(),H=function(ee){let ne=Ue(ee,1);return Oe(ee,ne,1,"thread expected"),ne},D=function(ee,ne,ze){if(!R(ne,ze))return Le(ee,"too many arguments to resume"),-1;if(xe(ne)===f&&Se(ne)===0)return Le(ee,"cannot resume dead coroutine"),-1;ae(ee,ne,ze);let nt=ut(ne,ee,ze);if(nt===f||nt===T){let at=Se(ne);return R(ee,at+1)?(ae(ne,ee,at),at):(Te(ne,at),Le(ee,"too many results to resume"),-1)}else return ae(ne,ee,1),-1},Ce=function(ee){let ne=H(ee),ze=D(ee,ne,Se(ee)-1);return ze<0?(J(ee,0),q(ee,-2),2):(J(ee,1),q(ee,-(ze+1)),ze+1)},we=function(ee){let ne=Ue(ee,ce(1)),ze=D(ee,ne,Se(ee));return ze<0?(Pe(ee,-1)===A&&(_e(ee,1),q(ee,-2),$(ee,2)),ge(ee)):ze},je=function(ee){Ae(ee,1,s);let ne=Q(ee);return Ke(ee,1),ae(ee,ne,1),1},X={create:je,isyieldable:function(ee){return J(ee,Z(ee)),1},resume:Ce,running:function(ee){return J(ee,ye(ee)),2},status:function(ee){let ne=H(ee);if(ee===ne)Le(ee,"running");else switch(xe(ne)){case T:Le(ee,"suspended");break;case f:{let ze=new S;le(ne,0,ze)>0?Le(ee,"normal"):Se(ne)===0?Le(ee,"dead"):Le(ee,"suspended");break}default:Le(ee,"dead");break}return 1},wrap:function(ee){return je(ee),Me(ee,we,1),1},yield:function(ee){return I(ee,Se(ee))}},he=function(ee){return W(ee,X),1};return Za.luaopen_coroutine=he,Za}var La={},jl;function pr(){if(jl)return La;jl=1;const{LUA_MAXINTEGER:f}=vn(),{LUA_OPEQ:s,LUA_OPLT:A,LUA_TFUNCTION:T,LUA_TNIL:S,LUA_TTABLE:R,lua_call:$,lua_checkstack:ge,lua_compare:le,lua_createtable:Se,lua_geti:q,lua_getmetatable:Z,lua_gettop:Q,lua_insert:Te,lua_isnil:J,lua_isnoneornil:Me,lua_isstring:Le,lua_pop:ye,lua_pushinteger:Ke,lua_pushnil:ut,lua_pushstring:xe,lua_pushvalue:Ue,lua_rawget:Pe,lua_setfield:ce,lua_seti:ae,lua_settop:I,lua_toboolean:Oe,lua_type:Ae}=kn(),{luaL_Buffer:W,luaL_addlstring:_e,luaL_addvalue:H,luaL_argcheck:D,luaL_buffinit:Ce,luaL_checkinteger:we,luaL_checktype:je,luaL_error:de,luaL_len:Ye,luaL_newlib:$e,luaL_opt:x,luaL_optinteger:Y,luaL_optlstring:X,luaL_pushresult:he,luaL_typename:ee}=Un(),ne=Ca(),{to_luastring:ze}=In(),nt=1,at=2,ft=4,ct=nt|at,ht=function(y,V,me){return xe(y,V),Pe(y,-me)!==S},pt=function(y,V,me){if(Ae(y,V)!==R){let De=1;Z(y,V)&&(!(me&nt)||ht(y,ze("__index",!0),++De))&&(!(me&at)||ht(y,ze("__newindex",!0),++De))&&(!(me&ft)||ht(y,ze("__len",!0),++De))?ye(y,De):je(y,V,R)}},Et=function(y,V,me){return pt(y,V,me|ft),Ye(y,V)},bt=function(y,V,me){q(y,1,me),Le(y,-1)||de(y,ze("invalid value (%s) at index %d in table for 'concat'"),ee(y,-1),me),H(V)},Ze=function(y){let V=Et(y,1,ct)+1,me;switch(Q(y)){case 2:me=V;break;case 3:{me=we(y,2),D(y,1<=me&&me<=V,2,"position out of bounds");for(let De=V;De>me;De--)q(y,1,De-1),ae(y,1,De);break}default:return de(y,"wrong number of arguments to 'insert'")}return ae(y,1,me),0},St=function(y){let V=Et(y,1,ct),me=Y(y,2,V);for(me!==V&&D(y,1<=me&&me<=V+1,1,"position out of bounds"),q(y,1,me);me<V;me++)q(y,1,me+1),ae(y,1,me);return ut(y),ae(y,1,me),1},tt=function(y){let V=we(y,2),me=we(y,3),De=we(y,4),qe=Me(y,5)?1:5;if(pt(y,1,nt),pt(y,qe,at),me>=V){D(y,V>0||me<f+V,3,"too many elements to move");let d=me-V+1;if(D(y,De<=f-d+1,4,"destination wrap around"),De>me||De<=V||qe!==1&&le(y,1,qe,s)!==1)for(let te=0;te<d;te++)q(y,1,V+te),ae(y,qe,De+te);else for(let te=d-1;te>=0;te--)q(y,1,V+te),ae(y,qe,De+te)}return Ue(y,qe),1},gt=function(y){let V=Et(y,1,nt),me=X(y,2,""),De=me.length,qe=Y(y,3,1);V=Y(y,4,V);let d=new W;for(Ce(y,d);qe<V;qe++)bt(y,d,qe),_e(d,me,De);return qe===V&&bt(y,d,qe),he(d),1},ve=function(y){let V=Q(y);Se(y,V,1),Te(y,1);for(let me=V;me>=1;me--)ae(y,1,me);return Ke(y,V),ce(y,1,ze("n")),1},K=function(y){let V=Y(y,2,1),me=x(y,we,3,Ye(y,1));if(V>me)return 0;let De=me-V;if(De>=Number.MAX_SAFE_INTEGER||!ge(y,++De))return de(y,ze("too many results to unpack"));for(;V<me;V++)q(y,1,V);return q(y,1,me),De},M=function(){return Math.floor(Math.random()*4294967296)},O=100,m=function(y,V,me){ae(y,1,V),ae(y,1,me)},g=function(y,V,me){if(J(y,2))return le(y,V,me,A);{Ue(y,2),Ue(y,V-1),Ue(y,me-2),$(y,2,1);let De=Oe(y,-1);return ye(y,1),De}},w=function(y,V,me){let De=V,qe=me-1;for(;;){for(;q(y,1,++De),g(y,-1,-2);)De==me-1&&de(y,ze("invalid order function for sorting")),ye(y,1);for(;q(y,1,--qe),g(y,-3,-1);)qe<De&&de(y,ze("invalid order function for sorting")),ye(y,1);if(qe<De)return ye(y,1),m(y,me-1,De),De;m(y,De,qe)}},B=function(y,V,me){let De=Math.floor((V-y)/4),qe=me%(De*2)+(y+De);return ne.lua_assert(y+De<=qe&&qe<=V-De),qe},ue=function(y,V,me,De){for(;V<me;){if(q(y,1,V),q(y,1,me),g(y,-1,-2)?m(y,V,me):ye(y,2),me-V==1)return;let qe;if(me-V<O||De===0?qe=Math.floor((V+me)/2):qe=B(V,me,De),q(y,1,qe),q(y,1,V),g(y,-2,-1)?m(y,qe,V):(ye(y,1),q(y,1,me),g(y,-1,-2)?m(y,qe,me):ye(y,2)),me-V==2)return;q(y,1,qe),Ue(y,-1),q(y,1,me-1),m(y,qe,me-1),qe=w(y,V,me);let d;qe-V<me-qe?(ue(y,V,qe-1,De),d=qe-V,V=qe+1):(ue(y,qe+1,me,De),d=me-qe,me=qe-1),(me-V)/128>d&&(De=M())}},st={concat:gt,insert:Ze,move:tt,pack:ve,remove:St,sort:function(y){let V=Et(y,1,ct);return V>1&&(D(y,V<f,1,"array too big"),Me(y,2)||je(y,2,T),I(y,2),ue(y,1,V,0)),0},unpack:K},Fe=function(y){return $e(y,st),1};return La.luaopen_table=Fe,La}var $a={},ql;function gr(){if(ql)return $a;ql=1;const{LUA_TNIL:f,LUA_TTABLE:s,lua_close:A,lua_createtable:T,lua_getfield:S,lua_isboolean:R,lua_isnoneornil:$,lua_pop:ge,lua_pushboolean:le,lua_pushfstring:Se,lua_pushinteger:q,lua_pushliteral:Z,lua_pushnil:Q,lua_pushnumber:Te,lua_pushstring:J,lua_setfield:Me,lua_settop:Le,lua_toboolean:ye,lua_tointegerx:Ke}=kn(),{luaL_Buffer:ut,luaL_addchar:xe,luaL_addstring:Ue,luaL_argerror:Pe,luaL_buffinit:ce,luaL_checkinteger:ae,luaL_checkoption:I,luaL_checkstring:Oe,luaL_checktype:Ae,luaL_error:W,luaL_execresult:_e,luaL_fileresult:H,luaL_newlib:D,luaL_optinteger:Ce,luaL_optlstring:we,luaL_optstring:je,luaL_pushresult:de}=Un(),{luastring_eq:Ye,to_jsstring:$e,to_luastring:x}=In(),Y=x("aAbBcCdDeFhHIjklmMnpPrRStTuUwWxXyYzZ%"),X=function(M,O,m){q(M,m),Me(M,-2,x(O,!0))},he=function(M,O,m){X(M,"sec",m?O.getUTCSeconds():O.getSeconds()),X(M,"min",m?O.getUTCMinutes():O.getMinutes()),X(M,"hour",m?O.getUTCHours():O.getHours()),X(M,"day",m?O.getUTCDate():O.getDate()),X(M,"month",(m?O.getUTCMonth():O.getMonth())+1),X(M,"year",m?O.getUTCFullYear():O.getFullYear()),X(M,"wday",(m?O.getUTCDay():O.getDay())+1),X(M,"yday",Math.floor((O-new Date(O.getFullYear(),0,0))/864e5))},ee=Number.MAX_SAFE_INTEGER/2,ne=function(M,O,m,g){let w=S(M,-1,x(O,!0)),B=Ke(M,-1);if(B===!1){if(w!==f)return W(M,x("field '%s' is not an integer"),O);if(m<0)return W(M,x("field '%s' missing in date table"),O);B=m}else{if(!(-ee<=B&&B<=ee))return W(M,x("field '%s' is out-of-bound"),O);B-=g}return ge(M,1),B},ze={days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(M=>x(M)),shortDays:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(M=>x(M)),months:["January","February","March","April","May","June","July","August","September","October","November","December"].map(M=>x(M)),shortMonths:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(M=>x(M)),AM:x("AM"),PM:x("PM"),am:x("am"),pm:x("pm"),formats:{c:x("%a %b %e %H:%M:%S %Y"),D:x("%m/%d/%y"),F:x("%Y-%m-%d"),R:x("%H:%M"),r:x("%I:%M:%S %p"),T:x("%H:%M:%S"),X:x("%T"),x:x("%D")}},nt=function(M,O){let m=M.getDay();O==="monday"&&(m===0?m=6:m--);let g=(M-new Date(M.getFullYear(),0,1))/864e5;return Math.floor((g+7-m)/7)},at=function(M,O,m){O<10&&xe(M,m),Ue(M,x(String(O)))},ft=function(M,O,m,g){let w=0;for(;w<m.length;)if(m[w]!==37)xe(O,m[w++]);else{w++;let B=ct(M,m,w);switch(m[w]){case 37:xe(O,37);break;case 65:Ue(O,ze.days[g.getDay()]);break;case 66:Ue(O,ze.months[g.getMonth()]);break;case 67:at(O,Math.floor(g.getFullYear()/100),48);break;case 68:ft(M,O,ze.formats.D,g);break;case 70:ft(M,O,ze.formats.F,g);break;case 72:at(O,g.getHours(),48);break;case 73:at(O,(g.getHours()+11)%12+1,48);break;case 77:at(O,g.getMinutes(),48);break;case 80:Ue(O,g.getHours()<12?ze.am:ze.pm);break;case 82:ft(M,O,ze.formats.R,g);break;case 83:at(O,g.getSeconds(),48);break;case 84:ft(M,O,ze.formats.T,g);break;case 85:at(O,nt(g,"sunday"),48);break;case 87:at(O,nt(g,"monday"),48);break;case 88:ft(M,O,ze.formats.X,g);break;case 89:Ue(O,x(String(g.getFullYear())));break;case 90:{let ue=g.toString().match(/\(([\w\s]+)\)/);ue&&Ue(O,x(ue[1]));break}case 97:Ue(O,ze.shortDays[g.getDay()]);break;case 98:case 104:Ue(O,ze.shortMonths[g.getMonth()]);break;case 99:ft(M,O,ze.formats.c,g);break;case 100:at(O,g.getDate(),48);break;case 101:at(O,g.getDate(),32);break;case 106:{let ue=Math.floor((g-new Date(g.getFullYear(),0,1))/864e5);ue<100&&(ue<10&&xe(O,48),xe(O,48)),Ue(O,x(String(ue)));break}case 107:at(O,g.getHours(),32);break;case 108:at(O,(g.getHours()+11)%12+1,32);break;case 109:at(O,g.getMonth()+1,48);break;case 110:xe(O,10);break;case 112:Ue(O,g.getHours()<12?ze.AM:ze.PM);break;case 114:ft(M,O,ze.formats.r,g);break;case 115:Ue(O,x(String(Math.floor(g/1e3))));break;case 116:xe(O,8);break;case 117:{let ue=g.getDay();Ue(O,x(String(ue===0?7:ue)));break}case 119:Ue(O,x(String(g.getDay())));break;case 120:ft(M,O,ze.formats.x,g);break;case 121:at(O,g.getFullYear()%100,48);break;case 122:{let ue=g.getTimezoneOffset();ue>0?xe(O,45):(ue=-ue,xe(O,43)),at(O,Math.floor(ue/60),48),at(O,ue%60,48);break}}w+=B}},ct=function(M,O,m){let g=Y,w=0,B=1;for(;w<g.length&&B<=O.length-m;w+=B)if(g[w]===124)B++;else if(Ye(O.subarray(m,m+B),g.subarray(w,w+B)))return B;Pe(M,1,Se(M,x("invalid conversion specifier '%%%s'"),O))},ht=function(M){let O=we(M,1,"%c"),m=$(M,2)?new Date:new Date(Et(M,2)*1e3),g=!1,w=0;if(O[w]===33&&(g=!0,w++),O[w]===42&&O[w+1]===116)T(M,0,9),he(M,m,g);else{let B=new Uint8Array(4);B[0]=37;let ue=new ut;ce(M,ue),ft(M,ue,O,m),de(ue)}return 1},pt=function(M){let O;return $(M,1)?O=new Date:(Ae(M,1,s),Le(M,1),O=new Date(ne(M,"year",-1,0),ne(M,"month",-1,1),ne(M,"day",-1,0),ne(M,"hour",12,0),ne(M,"min",0,0),ne(M,"sec",0,0)),he(M,O)),q(M,Math.floor(O/1e3)),1},Et=function(M,O){return ae(M,O)},bt=function(M){let O=Et(M,1),m=Et(M,2);return Te(M,O-m),1},Ze=["all","collate","ctype","monetary","numeric","time"].map(M=>x(M)),St=x("C"),tt=x("POSIX"),ve={date:ht,difftime:bt,setlocale:function(M){const O=je(M,1,null);return I(M,2,"all",Ze),J(M,O===null||O.length==0||Ye(O,St)||Ye(O,tt)?St:null),1},time:pt};ve.clock=function(M){return Te(M,performance.now()/1e3),1};const K=function(M){return D(M,ve),1};return $a.luaopen_os=K,$a}var Ja={},Qa={},Wl;function ds(){return Wl||(Wl=1,(function(f){(function(){var s={not_type:/[^T]/,not_primitive:/[^v]/,number:/[diefg]/,numeric_arg:/[bcdiefguxX]/,json:/[j]/,text:/^[^\x25]+/,modulo:/^\x25{2}/,placeholder:/^\x25(?:([1-9]\d*)\$|\(([^)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-gijostTuvxX])/,key:/^([a-z_][a-z_\d]*)/i,key_access:/^\.([a-z_][a-z_\d]*)/i,index_access:/^\[(\d+)\]/,sign:/^[+-]/};function A(ge){return S($(ge),arguments)}function T(ge,le){return A.apply(null,[ge].concat(le||[]))}function S(ge,le){var Se=1,q=ge.length,Z,Q="",Te,J,Me,Le,ye,Ke,ut,xe;for(Te=0;Te<q;Te++)if(typeof ge[Te]=="string")Q+=ge[Te];else if(typeof ge[Te]=="object"){if(Me=ge[Te],Me.keys)for(Z=le[Se],J=0;J<Me.keys.length;J++){if(Z==null)throw new Error(A('[sprintf] Cannot access property "%s" of undefined value "%s"',Me.keys[J],Me.keys[J-1]));Z=Z[Me.keys[J]]}else Me.param_no?Z=le[Me.param_no]:Z=le[Se++];if(s.not_type.test(Me.type)&&s.not_primitive.test(Me.type)&&Z instanceof Function&&(Z=Z()),s.numeric_arg.test(Me.type)&&typeof Z!="number"&&isNaN(Z))throw new TypeError(A("[sprintf] expecting number but found %T",Z));switch(s.number.test(Me.type)&&(ut=Z>=0),Me.type){case"b":Z=parseInt(Z,10).toString(2);break;case"c":Z=String.fromCharCode(parseInt(Z,10));break;case"d":case"i":Z=parseInt(Z,10);break;case"j":Z=JSON.stringify(Z,null,Me.width?parseInt(Me.width):0);break;case"e":Z=Me.precision?parseFloat(Z).toExponential(Me.precision):parseFloat(Z).toExponential();break;case"f":Z=Me.precision?parseFloat(Z).toFixed(Me.precision):parseFloat(Z);break;case"g":Z=Me.precision?String(Number(Z.toPrecision(Me.precision))):parseFloat(Z);break;case"o":Z=(parseInt(Z,10)>>>0).toString(8);break;case"s":Z=String(Z),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"t":Z=String(!!Z),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"T":Z=Object.prototype.toString.call(Z).slice(8,-1).toLowerCase(),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"u":Z=parseInt(Z,10)>>>0;break;case"v":Z=Z.valueOf(),Z=Me.precision?Z.substring(0,Me.precision):Z;break;case"x":Z=(parseInt(Z,10)>>>0).toString(16);break;case"X":Z=(parseInt(Z,10)>>>0).toString(16).toUpperCase();break}s.json.test(Me.type)?Q+=Z:(s.number.test(Me.type)&&(!ut||Me.sign)?(xe=ut?"+":"-",Z=Z.toString().replace(s.sign,"")):xe="",ye=Me.pad_char?Me.pad_char==="0"?"0":Me.pad_char.charAt(1):" ",Ke=Me.width-(xe+Z).length,Le=Me.width&&Ke>0?ye.repeat(Ke):"",Q+=Me.align?xe+Z+Le:ye==="0"?xe+Le+Z:Le+xe+Z)}return Q}var R=Object.create(null);function $(ge){if(R[ge])return R[ge];for(var le=ge,Se,q=[],Z=0;le;){if((Se=s.text.exec(le))!==null)q.push(Se[0]);else if((Se=s.modulo.exec(le))!==null)q.push("%");else if((Se=s.placeholder.exec(le))!==null){if(Se[2]){Z|=1;var Q=[],Te=Se[2],J=[];if((J=s.key.exec(Te))!==null)for(Q.push(J[1]);(Te=Te.substring(J[0].length))!=="";)if((J=s.key_access.exec(Te))!==null)Q.push(J[1]);else if((J=s.index_access.exec(Te))!==null)Q.push(J[1]);else throw new SyntaxError("[sprintf] failed to parse named argument key");else throw new SyntaxError("[sprintf] failed to parse named argument key");Se[2]=Q}else Z|=2;if(Z===3)throw new Error("[sprintf] mixing positional and named placeholders is not (yet) supported");q.push({placeholder:Se[0],param_no:Se[1],keys:Se[2],sign:Se[3],pad_char:Se[4],align:Se[5],width:Se[6],precision:Se[7],type:Se[8]})}else throw new SyntaxError("[sprintf] unexpected placeholder");le=le.substring(Se[0].length)}return R[ge]=q}f.sprintf=A,f.vsprintf=T,typeof window<"u"&&(window.sprintf=A,window.vsprintf=T)})()})(Qa)),Qa}var Yl;function mr(){if(Yl)return Ja;Yl=1;const{sprintf:f}=ds(),{LUA_INTEGER_FMT:s,LUA_INTEGER_FRMLEN:A,LUA_MININTEGER:T,LUA_NUMBER_FMT:S,LUA_NUMBER_FRMLEN:R,frexp:$,lua_getlocaledecpoint:ge}=vn(),{LUA_TBOOLEAN:le,LUA_TFUNCTION:Se,LUA_TNIL:q,LUA_TNUMBER:Z,LUA_TSTRING:Q,LUA_TTABLE:Te,lua_call:J,lua_createtable:Me,lua_dump:Le,lua_gettable:ye,lua_gettop:Ke,lua_isinteger:ut,lua_isstring:xe,lua_pop:Ue,lua_pushcclosure:Pe,lua_pushinteger:ce,lua_pushlightuserdata:ae,lua_pushliteral:I,lua_pushlstring:Oe,lua_pushnil:Ae,lua_pushnumber:W,lua_pushstring:_e,lua_pushvalue:H,lua_remove:D,lua_setfield:Ce,lua_setmetatable:we,lua_settop:je,lua_toboolean:de,lua_tointeger:Ye,lua_tonumber:$e,lua_tostring:x,lua_touserdata:Y,lua_type:X,lua_upvalueindex:he}=kn(),{luaL_Buffer:ee,luaL_addchar:ne,luaL_addlstring:ze,luaL_addsize:nt,luaL_addstring:at,luaL_addvalue:ft,luaL_argcheck:ct,luaL_argerror:ht,luaL_buffinit:pt,luaL_buffinitsize:Et,luaL_checkinteger:bt,luaL_checknumber:Ze,luaL_checkstack:St,luaL_checkstring:tt,luaL_checktype:gt,luaL_error:ve,luaL_newlib:K,luaL_optinteger:M,luaL_optstring:O,luaL_prepbuffsize:m,luaL_pushresult:g,luaL_pushresultsize:w,luaL_tolstring:B,luaL_typename:ue}=Un(),ot=Ca(),{luastring_eq:st,luastring_indexOf:Fe,to_jsstring:y,to_luastring:V}=In(),De="%".charCodeAt(0),qe=32,d=2147483647,te=function(t){let r=Fe(t,0);return r>-1?r:t.length},P=function(t,r){return t>=0?t:0-t>r?0:r+t+1},oe=function(t){let r=tt(t,1),c=r.length,k=P(bt(t,2),c),U=P(M(t,3,-1),c);return k<1&&(k=1),U>c&&(U=c),k<=U?_e(t,r.subarray(k-1,k-1+(U-k+1))):I(t,""),1},Ne=function(t){return ce(t,tt(t,1).length),1},it=function(t){let r=Ke(t),c=new ee,k=Et(t,c,r);for(let U=1;U<=r;U++){let j=bt(t,U);ct(t,j>=0&&j<=255,"value out of range"),k[U-1]=j}return w(c,r),1},Qe=function(t,r,c,k){return ze(k,r,c),0},xt=function(t){let r=new ee,c=de(t,2);return gt(t,1,Se),je(t,1),pt(t,r),Le(t,Qe,r,c)!==0?ve(t,V("unable to dump given function")):(g(r),1)},kt=R.length+1,yt=1,wt=function(t){if(Object.is(t,1/0))return V("inf");if(Object.is(t,-1/0))return V("-inf");if(Number.isNaN(t))return V("nan");if(t===0){let r=f(S+"x0p+0",t);return Object.is(t,-0)&&(r="-"+r),V(r)}else{let r="",c=$(t),k=c[0],U=c[1];return k<0&&(r+="-",k=-k),r+="0x",r+=(k*(1<<yt)).toString(16),U-=yt,r+=f("p%+d",U),V(r)}},Yt=function(t,r,c){let k=wt(c);if(r[kt]===65)for(let U=0;U<k.length;U++){let j=k[U];j>=97&&(k[U]=j&223)}else r[kt]!==97&&ve(t,V("modifiers for format '%%a'/'%%A' not implemented"));return k},Vt=V("-+ #0"),Nt=t=>97<=t&&t<=122||65<=t&&t<=90,Bt=t=>48<=t&&t<=57,Ht=t=>0<=t&&t<=31||t===127,Xt=t=>33<=t&&t<=126,$t=t=>97<=t&&t<=122,Ft=t=>65<=t&&t<=90,zt=t=>97<=t&&t<=122||65<=t&&t<=90||48<=t&&t<=57,F=t=>Xt(t)&&!zt(t),E=t=>t===32||t>=9&&t<=13,Ee=t=>48<=t&&t<=57||65<=t&&t<=70||97<=t&&t<=102,We=function(t,r,c){ne(t,34);let k=0;for(;c--;){if(r[k]===34||r[k]===92||r[k]===10)ne(t,92),ne(t,r[k]);else if(Ht(r[k])){let U=""+r[k];Bt(r[k+1])&&(U=("000"+U).slice(-3)),at(t,V("\\"+U))}else ne(t,r[k]);k++}ne(t,34)},b=function(t){if(Fe(t,46)<0){let r=ge(),c=Fe(t,r);c&&(t[c]=46)}},fe=function(t,r,c){switch(X(t,c)){case Q:{let k=x(t,c);We(r,k,k.length);break}case Z:{let k;if(ut(t,c)){let U=Ye(t,c),j=U===T?"0x%"+A+"x":s;k=V(f(j,U))}else{let U=$e(t,c);k=Yt(t,V(`%${A}a`),U),b(k)}at(r,k);break}case q:case le:{B(t,c),ft(r);break}default:ht(t,c,V("value has no literal form"))}},ie=function(t,r,c,k){let U=c;for(;r[U]!==0&&Fe(Vt,r[U])>=0;)U++;U-c>=Vt.length&&ve(t,V("invalid format (repeated flags)")),Bt(r[U])&&U++,Bt(r[U])&&U++,r[U]===46&&(U++,Bt(r[U])&&U++,Bt(r[U])&&U++),Bt(r[U])&&ve(t,V("invalid format (width or precision too long)")),k[0]=37;for(let j=0;j<U-c+1;j++)k[j+1]=r[c+j];return U},He=function(t,r){let c=t.length,k=r.length,U=t[c-1];for(let j=0;j<k;j++)t[j+c-1]=r[j];t[c+k-1]=U},mt=function(t){let r=Ke(t),c=1,k=tt(t,c),U=0,j=new ee;for(pt(t,j);U<k.length;)if(k[U]!==De)ne(j,k[U++]);else if(k[++U]===De)ne(j,k[U++]);else{let lt=[];switch(++c>r&&ht(t,c,V("no value")),U=ie(t,k,U,lt),String.fromCharCode(k[U++])){case"c":{ne(j,bt(t,c));break}case"d":case"i":case"o":case"u":case"x":case"X":{let rt=bt(t,c);He(lt,V(A,!0)),at(j,V(f(String.fromCharCode(...lt),rt)));break}case"a":case"A":{He(lt,V(A,!0)),at(j,Yt(t,lt,Ze(t,c)));break}case"e":case"E":case"f":case"g":case"G":{let rt=Ze(t,c);He(lt,V(A,!0)),at(j,V(f(String.fromCharCode(...lt),rt)));break}case"q":{fe(t,j,c);break}case"s":{let rt=B(t,c);lt.length<=2||lt[2]===0?ft(j):(ct(t,rt.length===te(rt),c,"string contains zeros"),Fe(lt,46)<0&&rt.length>=100?ft(j):(at(j,V(f(String.fromCharCode(...lt),y(rt)))),Ue(t,1)));break}default:return ve(t,V("invalid option '%%%c' to 'format'"),k[U-1])}}return g(j),1},l=0,n=16,u=4,o=8,C=(1<<o)-1,se=8;class Ve{constructor(r){this.L=r,this.islittle=!0,this.maxalign=1}}const dt=0,Dt=1,Kt=2,Gt=3,sn=4,jt=5,_=6,G=7,be=8,pe=Bt,Xe=function(t,r){if(t.off>=t.s.length||!pe(t.s[t.off]))return r;{let c=0;do c=c*10+(t.s[t.off++]-48);while(t.off<t.s.length&&pe(t.s[t.off])&&c<=(d-9)/10);return c}},ke=function(t,r,c){let k=Xe(r,c);return(k>n||k<=0)&&ve(t.L,V("integral size (%d) out of limits [1,%d]"),k,n),k},Ie=function(t,r){let c={opt:r.s[r.off++],size:0};switch(c.opt){case 98:return c.size=1,c.opt=dt,c;case 66:return c.size=1,c.opt=Dt,c;case 104:return c.size=2,c.opt=dt,c;case 72:return c.size=2,c.opt=Dt,c;case 108:return c.size=4,c.opt=dt,c;case 76:return c.size=4,c.opt=Dt,c;case 106:return c.size=4,c.opt=dt,c;case 74:return c.size=4,c.opt=Dt,c;case 84:return c.size=4,c.opt=Dt,c;case 102:return c.size=4,c.opt=Kt,c;case 100:return c.size=8,c.opt=Kt,c;case 110:return c.size=8,c.opt=Kt,c;case 105:return c.size=ke(t,r,4),c.opt=dt,c;case 73:return c.size=ke(t,r,4),c.opt=Dt,c;case 115:return c.size=ke(t,r,4),c.opt=sn,c;case 99:return c.size=Xe(r,-1),c.size===-1&&ve(t.L,V("missing size for format option 'c'")),c.opt=Gt,c;case 122:return c.opt=jt,c;case 120:return c.size=1,c.opt=_,c;case 88:return c.opt=G,c;case 32:break;case 60:t.islittle=!0;break;case 62:t.islittle=!1;break;case 61:t.islittle=!0;break;case 33:t.maxalign=ke(t,r,se);break;default:ve(t.L,V("invalid format option '%c'"),c.opt)}return c.opt=be,c},Mt=function(t,r,c){let k={opt:NaN,size:NaN,ntoalign:NaN},U=Ie(t,c);k.size=U.size,k.opt=U.opt;let j=k.size;if(k.opt===G)if(c.off>=c.s.length||c.s[c.off]===0)ht(t.L,1,V("invalid next option for option 'X'"));else{let lt=Ie(t,c);j=lt.size,lt=lt.opt,(lt===Gt||j===0)&&ht(t.L,1,V("invalid next option for option 'X'"))}return j<=1||k.opt===Gt?k.ntoalign=0:(j>t.maxalign&&(j=t.maxalign),(j&j-1)!==0&&ht(t.L,1,V("format asks for alignment not power of 2")),k.ntoalign=j-(r&j-1)&j-1),k},re=function(t,r,c,k,U){let j=m(t,k);j[c?0:k-1]=r&C;for(let lt=1;lt<k;lt++)r>>=o,j[c?lt:k-1-lt]=r&C;if(U&&k>u)for(let lt=u;lt<k;lt++)j[c?lt:k-1-lt]=C;nt(t,k)},Be=function(t){let r=new ee,c=new Ve(t),k={s:tt(t,1),off:0},U=1,j=0;for(Ae(t),pt(t,r);k.off<k.s.length;){let lt=Mt(c,j,k),rt=lt.opt,Ct=lt.size,qt=lt.ntoalign;for(j+=qt+Ct;qt-- >0;)ne(r,l);switch(U++,rt){case dt:{let It=bt(t,U);if(Ct<u){let Ut=1<<Ct*8-1;ct(t,-Ut<=It&&It<Ut,U,"integer overflow")}re(r,It,c.islittle,Ct,It<0);break}case Dt:{let It=bt(t,U);Ct<u&&ct(t,It>>>0<1<<Ct*o,U,"unsigned overflow"),re(r,It>>>0,c.islittle,Ct,!1);break}case Kt:{let It=m(r,Ct),Ut=Ze(t,U),ta=new DataView(It.buffer,It.byteOffset,It.byteLength);Ct===4?ta.setFloat32(0,Ut,c.islittle):ta.setFloat64(0,Ut,c.islittle),nt(r,Ct);break}case Gt:{let It=tt(t,U),Ut=It.length;for(ct(t,Ut<=Ct,U,"string longer than given size"),ze(r,It,Ut);Ut++<Ct;)ne(r,l);break}case sn:{let It=tt(t,U),Ut=It.length;ct(t,Ct>=4||Ut<1<<Ct*o,U,"string length does not fit in given size"),re(r,Ut,c.islittle,Ct,0),ze(r,It,Ut),j+=Ut;break}case jt:{let It=tt(t,U),Ut=It.length;ct(t,Fe(It,0)<0,U,"strings contains zeros"),ze(r,It,Ut),ne(r,0),j+=Ut+1;break}case _:ne(r,l);case G:case be:U--;break}}return g(r),1},Je=function(t){let r=tt(t,1),c=r.length,k=new Uint8Array(c);for(let U=0;U<c;U++)k[U]=r[c-1-U];return _e(t,k),1},Ot=function(t){let r=tt(t,1),c=r.length,k=new Uint8Array(c);for(let U=0;U<c;U++){let j=r[U];Ft(j)&&(j=j|32),k[U]=j}return _e(t,k),1},nn=function(t){let r=tt(t,1),c=r.length,k=new Uint8Array(c);for(let U=0;U<c;U++){let j=r[U];$t(j)&&(j=j&223),k[U]=j}return _e(t,k),1},un=function(t){let r=tt(t,1),c=r.length,k=bt(t,2),U=O(t,3,""),j=U.length;if(k<=0)I(t,"");else{if(c+j<c||c+j>d/k)return ve(t,V("resulting string too large"));{let lt=k*c+(k-1)*j,rt=new ee,Ct=Et(t,rt,lt),qt=0;for(;k-- >1;)Ct.set(r,qt),qt+=c,j>0&&(Ct.set(U,qt),qt+=j);Ct.set(r,qt),w(rt,lt)}}return 1},gn=function(t){let r=tt(t,1),c=r.length,k=P(M(t,2,1),c),U=P(M(t,3,k),c);if(k<1&&(k=1),U>c&&(U=c),k>U)return 0;if(U-k>=Number.MAX_SAFE_INTEGER)return ve(t,"string slice too long");let j=U-k+1;St(t,j,"string slice too long");for(let lt=0;lt<j;lt++)ce(t,r[k+lt-1]);return j},Sn=function(t){let r=new Ve(t),c={s:tt(t,1),off:0},k=0;for(;c.off<c.s.length;){let U=Mt(r,k,c),j=U.opt,lt=U.size,rt=U.ntoalign;switch(lt+=rt,ct(t,k<=d-lt,1,"format result too large"),k+=lt,j){case sn:case jt:ht(t,1,"variable-length format")}}return ce(t,k),1},cn=function(t,r,c,k,U){let j=0,lt=k<=u?k:u;for(let rt=lt-1;rt>=0;rt--)j<<=o,j|=r[c?rt:k-1-rt];if(k<u){if(U){let rt=1<<k*o-1;j=(j^rt)-rt}}else if(k>u){let rt=!U||j>=0?0:C;for(let Ct=lt;Ct<k;Ct++)r[c?Ct:k-1-Ct]!==rt&&ve(t,V("%d-byte integer does not fit into Lua Integer"),k)}return j},Fn=function(t,r,c,k){ot.lua_assert(r.length>=k);let U=new DataView(new ArrayBuffer(k));for(let j=0;j<k;j++)U.setUint8(j,r[j]);return k==4?U.getFloat32(0,c):U.getFloat64(0,c)},Zn=function(t){let r=new Ve(t),c={s:tt(t,1),off:0},k=tt(t,2),U=k.length,j=P(M(t,3,1),U)-1,lt=0;for(ct(t,j<=U&&j>=0,3,"initial position out of string");c.off<c.s.length;){let rt=Mt(r,j,c),Ct=rt.opt,qt=rt.size,It=rt.ntoalign;switch(j+It+qt>U&&ht(t,2,V("data string too short")),j+=It,St(t,2,"too many results"),lt++,Ct){case dt:case Dt:{let Ut=cn(t,k.subarray(j),r.islittle,qt,Ct===dt);ce(t,Ut);break}case Kt:{let Ut=Fn(t,k.subarray(j),r.islittle,qt);W(t,Ut);break}case Gt:{_e(t,k.subarray(j,j+qt));break}case sn:{let Ut=cn(t,k.subarray(j),r.islittle,qt,0);ct(t,j+Ut+qt<=U,2,"data string too short"),_e(t,k.subarray(j+qt,j+qt+Ut)),j+=Ut;break}case jt:{let Ut=Fe(k,0,j);Ut===-1&&(Ut=k.length-j),_e(t,k.subarray(j,Ut)),j=Ut+1;break}case G:case _:case be:lt--;break}j+=qt}return ce(t,j+1),lt+1},On=-1,Gn=-2,Vn=200,oa=V("^$*+?.([%-");class mn{constructor(r){this.src=null,this.src_init=null,this.src_end=null,this.p=null,this.p_end=null,this.L=r,this.matchdepth=NaN,this.level=NaN,this.capture=[]}}const Ln=function(t,r){return r=r-49,r<0||r>=t.level||t.capture[r].len===On?ve(t.L,V("invalid capture index %%%d"),r+1):r},ga=function(t){let r=t.level;for(r--;r>=0;r--)if(t.capture[r].len===On)return r;return ve(t.L,V("invalid pattern capture"))},fn=function(t,r){switch(t.p[r++]){case De:return r===t.p_end&&ve(t.L,V("malformed pattern (ends with '%%')")),r+1;case 91:{t.p[r]===94&&r++;do r===t.p_end&&ve(t.L,V("malformed pattern (missing ']')")),t.p[r++]===De&&r<t.p_end&&r++;while(t.p[r]!==93);return r+1}default:return r}},ia=function(t,r){switch(r){case 97:return Nt(t);case 65:return!Nt(t);case 99:return Ht(t);case 67:return!Ht(t);case 100:return Bt(t);case 68:return!Bt(t);case 103:return Xt(t);case 71:return!Xt(t);case 108:return $t(t);case 76:return!$t(t);case 112:return F(t);case 80:return!F(t);case 115:return E(t);case 83:return!E(t);case 117:return Ft(t);case 85:return!Ft(t);case 119:return zt(t);case 87:return!zt(t);case 120:return Ee(t);case 88:return!Ee(t);case 122:return t===0;case 90:return t!==0;default:return r===t}},$n=function(t,r,c,k){let U=!0;for(t.p[c+1]===94&&(U=!1,c++);++c<k;)if(t.p[c]===De){if(c++,ia(r,t.p[c]))return U}else if(t.p[c+1]===45&&c+2<k){if(c+=2,t.p[c-2]<=r&&r<=t.p[c])return U}else if(t.p[c]===r)return U;return!U},Jn=function(t,r,c,k){if(r>=t.src_end)return!1;{let U=t.src[r];switch(t.p[c]){case 46:return!0;case De:return ia(U,t.p[c+1]);case 91:return $n(t,U,c,k-1);default:return t.p[c]===U}}},ma=function(t,r,c){if(c>=t.p_end-1&&ve(t.L,V("malformed pattern (missing arguments to '%%b'")),t.src[r]!==t.p[c])return null;{let k=t.p[c],U=t.p[c+1],j=1;for(;++r<t.src_end;)if(t.src[r]===U){if(--j===0)return r+1}else t.src[r]===k&&j++}return null},ua=function(t,r,c,k){let U=0;for(;Jn(t,r+U,c,k);)U++;for(;U>=0;){let j=hn(t,r+U,k+1);if(j)return j;U--}return null},_n=function(t,r,c,k){for(;;){let U=hn(t,r,k+1);if(U!==null)return U;if(Jn(t,r,c,k))r++;else return null}},Hn=function(t,r,c,k){let U=t.level;U>=qe&&ve(t.L,V("too many captures")),t.capture[U]=t.capture[U]?t.capture[U]:{},t.capture[U].init=r,t.capture[U].len=k,t.level=U+1;let j;return(j=hn(t,r,c))===null&&t.level--,j},Nn=function(t,r,c){let k=ga(t);t.capture[k].len=r-t.capture[k].init;let U;return(U=hn(t,r,c))===null&&(t.capture[k].len=On),U},Cn=function(t,r,c,k,U){return st(t.subarray(r,r+U),c.subarray(k,k+U))},Qn=function(t,r,c){c=Ln(t,c);let k=t.capture[c].len;return t.src_end-r>=k&&Cn(t.src,t.capture[c].init,t.src,r,k)?r+k:null},hn=function(t,r,c){let k=!1,U=!0;for(t.matchdepth--===0&&ve(t.L,V("pattern too complex"));U||k;)if(U=!1,c!==t.p_end)switch(k?void 0:t.p[c]){case 40:{t.p[c+1]===41?r=Hn(t,r,c+2,Gn):r=Hn(t,r,c+1,On);break}case 41:{r=Nn(t,r,c+1);break}case 36:{if(c+1!==t.p_end){k=!0;break}r=t.src.length-r===0?r:null;break}case De:{switch(t.p[c+1]){case 98:{r=ma(t,r,c+2),r!==null&&(c+=4,U=!0);break}case 102:{c+=2,t.p[c]!==91&&ve(t.L,V("missing '[' after '%%f' in pattern"));let j=fn(t,c),lt=r===t.src_init?0:t.src[r-1];if(!$n(t,lt,c,j-1)&&$n(t,r===t.src_end?0:t.src[r],c,j-1)){c=j,U=!0;break}r=null;break}case 48:case 49:case 50:case 51:case 52:case 53:case 54:case 55:case 56:case 57:{r=Qn(t,r,t.p[c+1]),r!==null&&(c+=2,U=!0);break}default:k=!0}break}default:{k=!1;let j=fn(t,c);if(Jn(t,r,c,j))switch(t.p[j]){case 63:{let lt;(lt=hn(t,r+1,j+1))!==null?r=lt:(c=j+1,U=!0);break}case 43:r++;case 42:r=ua(t,r,c,j);break;case 45:r=_n(t,r,c,j);break;default:r++,c=j,U=!0}else if(t.p[j]===42||t.p[j]===63||t.p[j]===45){c=j+1,U=!0;break}else r=null;break}}return t.matchdepth++,r},Pn=function(t,r,c,k){if(r>=t.level)r===0?Oe(t.L,t.src.subarray(c,k),k-c):ve(t.L,V("invalid capture index %%%d"),r+1);else{let U=t.capture[r].len;U===On&&ve(t.L,V("unfinished capture")),U===Gn?ce(t.L,t.capture[r].init-t.src_init+1):Oe(t.L,t.src.subarray(t.capture[r].init),U)}},Rn=function(t,r,c){let k=t.level===0&&r!=null?1:t.level;St(t.L,k,"too many captures");for(let U=0;U<k;U++)Pn(t,U,r,c);return k},Aa=function(t,r){for(let c=0;c<r;c++)if(Fe(oa,t[c])!==-1)return!1;return!0},Dn=function(t,r,c,k,U,j){t.L=r,t.matchdepth=Vn,t.src=c,t.src_init=0,t.src_end=k,t.p=U,t.p_end=j},An=function(t){t.level=0,ot.lua_assert(t.matchdepth===Vn)},ca=function(t,r,c){var k=c>>>0,U=r.length;if(U===0)return k;for(;(k=t.indexOf(r[0],k))!==-1;k++)if(st(t.subarray(k,k+U),r))return k;return-1},ea=function(t,r){let c=tt(t,1),k=tt(t,2),U=c.length,j=k.length,lt=P(M(t,3,1),U);if(lt<1)lt=1;else if(lt>U+1)return Ae(t),1;if(r&&(de(t,4)||Aa(k,j))){let rt=ca(c.subarray(lt-1),k,0);if(rt>-1)return ce(t,lt+rt),ce(t,lt+rt+j-1),2}else{let rt=new mn(t),Ct=lt-1,qt=k[0]===94;qt&&(k=k.subarray(1),j--),Dn(rt,t,c,U,k,j);do{let It;if(An(rt),(It=hn(rt,Ct,0))!==null)return r?(ce(t,Ct+1),ce(t,It),Rn(rt,null,0)+2):Rn(rt,Ct,It)}while(Ct++<rt.src_end&&!qt)}return Ae(t),1},ba=function(t){return ea(t,1)},Bn=function(t){return ea(t,0)};class bn{constructor(){this.src=NaN,this.p=NaN,this.lastmatch=NaN,this.ms=new mn}}const fa=function(t){let r=Y(t,he(3));r.ms.L=t;for(let c=r.src;c<=r.ms.src_end;c++){An(r.ms);let k;if((k=hn(r.ms,c,r.p))!==null&&k!==r.lastmatch)return r.src=r.lastmatch=k,Rn(r.ms,c,k)}return 0},Ta=function(t){let r=tt(t,1),c=tt(t,2),k=r.length,U=c.length;je(t,2);let j=new bn;return ae(t,j),Dn(j.ms,t,r,k,c,U),j.src=0,j.p=0,j.lastmatch=null,Pe(t,fa,3),1},Xn=function(t,r,c,k){let U=t.L,j=x(U,3),lt=j.length;for(let rt=0;rt<lt;rt++)j[rt]!==De?ne(r,j[rt]):(rt++,Bt(j[rt])?j[rt]===48?ze(r,t.src.subarray(c,k),k-c):(Pn(t,j[rt]-49,c,k),B(U,-1),D(U,-2),ft(r)):(j[rt]!==De&&ve(U,V("invalid use of '%c' in replacement string"),De),ne(r,j[rt])))},Ea=function(t,r,c,k,U){let j=t.L;switch(U){case Se:{H(j,3);let lt=Rn(t,c,k);J(j,lt,1);break}case Te:{Pn(t,0,c,k),ye(j,3);break}default:{Xn(t,r,c,k);return}}de(j,-1)?xe(j,-1)||ve(j,V("invalid replacement value (a %s)"),ue(j,-1)):(Ue(j,1),Oe(j,t.src.subarray(c,k),k-c)),ft(r)},v={byte:gn,char:it,dump:xt,find:ba,format:mt,gmatch:Ta,gsub:function(t){let r=tt(t,1),c=r.length,k=tt(t,2),U=k.length,j=null,lt=X(t,3),rt=M(t,4,c+1),Ct=k[0]===94,qt=0,It=new mn(t),Ut=new ee;for(ct(t,lt===Z||lt===Q||lt===Se||lt===Te,3,"string/function/table expected"),pt(t,Ut),Ct&&(k=k.subarray(1),U--),Dn(It,t,r,c,k,U),r=0,k=0;qt<rt;){let ta;if(An(It),(ta=hn(It,r,k))!==null&&ta!==j)qt++,Ea(It,Ut,r,ta,lt),r=j=ta;else if(r<It.src_end)ne(Ut,It.src[r++]);else break;if(Ct)break}return ze(Ut,It.src.subarray(r,It.src_end),It.src_end-r),g(Ut),ce(t,qt),2},len:Ne,lower:Ot,match:Bn,pack:Be,packsize:Sn,rep:un,reverse:Je,sub:oe,unpack:Zn,upper:nn},e=function(t){Me(t,0,1),I(t,""),H(t,-2),we(t,-2),Ue(t,1),H(t,-2),Ce(t,-2,V("__index",!0)),Ue(t,1)},i=function(t){return K(t,v),e(t),1};return Ja.luaopen_string=i,Ja}var el={},Zl;function Ar(){if(Zl)return el;Zl=1;const{lua_gettop:f,lua_pushcfunction:s,lua_pushfstring:A,lua_pushinteger:T,lua_pushnil:S,lua_pushstring:R,lua_pushvalue:$,lua_setfield:ge,lua_tointeger:le}=kn(),{luaL_Buffer:Se,luaL_addvalue:q,luaL_argcheck:Z,luaL_buffinit:Q,luaL_checkinteger:Te,luaL_checkstack:J,luaL_checkstring:Me,luaL_error:Le,luaL_newlib:ye,luaL_optinteger:Ke,luaL_pushresult:ut}=Un(),{luastring_of:xe,to_luastring:Ue}=In(),Pe=1114111,ce=function(x){return(x&192)===128},ae=function(x,Y){return x>=0?x:0-x>Y?0:Y+x+1},I=[255,127,2047,65535],Oe=function(x,Y){let X=x[Y],he=0;if(X<128)he=X;else{let ee=0;for(;X&64;){let ne=x[Y+ ++ee];if((ne&192)!==128)return null;he=he<<6|ne&63,X<<=1}if(he|=(X&127)<<ee*5,ee>3||he>Pe||he<=I[ee])return null;Y+=ee}return{code:he,pos:Y+1}},Ae=function(x){let Y=0,X=Me(x,1),he=X.length,ee=ae(Ke(x,2,1),he),ne=ae(Ke(x,3,-1),he);for(Z(x,1<=ee&&--ee<=he,2,"initial position out of string"),Z(x,--ne<he,3,"final position out of string");ee<=ne;){let ze=Oe(X,ee);if(ze===null)return S(x),T(x,ee+1),2;ee=ze.pos,Y++}return T(x,Y),1},W=Ue("%U"),_e=function(x,Y){let X=Te(x,Y);Z(x,0<=X&&X<=Pe,Y,"value out of range"),A(x,W,X)},H=function(x){let Y=f(x);if(Y===1)_e(x,1);else{let X=new Se;Q(x,X);for(let he=1;he<=Y;he++)_e(x,he),q(X);ut(X)}return 1},D=function(x){let Y=Me(x,1),X=Te(x,2),he=X>=0?1:Y.length+1;if(he=ae(Ke(x,3,he),Y.length),Z(x,1<=he&&--he<=Y.length,3,"position out of range"),X===0)for(;he>0&&ce(Y[he]);)he--;else if(ce(Y[he])&&Le(x,"initial position is a continuation byte"),X<0)for(;X<0&&he>0;){do he--;while(he>0&&ce(Y[he]));X++}else for(X--;X>0&&he<Y.length;){do he++;while(ce(Y[he]));X--}return X===0?T(x,he+1):S(x),1},Ce=function(x){let Y=Me(x,1),X=ae(Ke(x,2,1),Y.length),he=ae(Ke(x,3,X),Y.length);if(Z(x,X>=1,2,"out of range"),Z(x,he<=Y.length,3,"out of range"),X>he)return 0;if(he-X>=Number.MAX_SAFE_INTEGER)return Le(x,"string slice too long");let ee=he-X+1;for(J(x,ee,"string slice too long"),ee=0,X-=1;X<he;){let ne=Oe(Y,X);if(ne===null)return Le(x,"invalid UTF-8 code");T(x,ne.code),X=ne.pos,ee++}return ee},we=function(x){let Y=Me(x,1),X=Y.length,he=le(x,2)-1;if(he<0)he=0;else if(he<X)for(he++;ce(Y[he]);)he++;if(he>=X)return 0;{let ee=Oe(Y,he);return ee===null||ce(Y[ee.pos])?Le(x,Ue("invalid UTF-8 code")):(T(x,he+1),T(x,ee.code),2)}},de={char:H,codepoint:Ce,codes:function(x){return Me(x,1),s(x,we),$(x,1),T(x,0),3},len:Ae,offset:D},Ye=xe(91,0,45,127,194,45,244,93,91,128,45,191,93,42),$e=function(x){return ye(x,de),R(x,Ye),ge(x,-2,Ue("charpattern",!0)),1};return el.luaopen_utf8=$e,el}var tl={},Ll;function br(){if(Ll)return tl;Ll=1;const{LUA_OPLT:f,LUA_TNUMBER:s,lua_compare:A,lua_gettop:T,lua_isinteger:S,lua_isnoneornil:R,lua_pushboolean:$,lua_pushinteger:ge,lua_pushliteral:le,lua_pushnil:Se,lua_pushnumber:q,lua_pushvalue:Z,lua_setfield:Q,lua_settop:Te,lua_tointeger:J,lua_tointegerx:Me,lua_type:Le}=kn(),{luaL_argcheck:ye,luaL_argerror:Ke,luaL_checkany:ut,luaL_checkinteger:xe,luaL_checknumber:Ue,luaL_error:Pe,luaL_newlib:ce,luaL_optnumber:ae}=Un(),{LUA_MAXINTEGER:I,LUA_MININTEGER:Oe,lua_numbertointeger:Ae}=vn(),{to_luastring:W}=In();let _e;const H=function(){return _e=1103515245*_e+12345&2147483647,_e},D=function(K){_e=K|0,_e===0&&(_e=1)},Ce=function(K){let M,O,m=_e===void 0?Math.random():H()/2147483648;switch(T(K)){case 0:return q(K,m),1;case 1:{M=1,O=xe(K,1);break}case 2:{M=xe(K,1),O=xe(K,2);break}default:return Pe(K,"wrong number of arguments")}return ye(K,M<=O,1,"interval is empty"),ye(K,M>=0||O<=I+M,1,"interval too large"),m*=O-M+1,ge(K,Math.floor(m)+M),1},we=function(K){return D(Ue(K,1)),H(),0},je=function(K){if(S(K,1)){let M=J(K,1);M<0&&(M=-M|0),ge(K,M)}else q(K,Math.abs(Ue(K,1)));return 1},de=function(K){return q(K,Math.sin(Ue(K,1))),1},Ye=function(K){return q(K,Math.cos(Ue(K,1))),1},$e=function(K){return q(K,Math.tan(Ue(K,1))),1},x=function(K){return q(K,Math.asin(Ue(K,1))),1},Y=function(K){return q(K,Math.acos(Ue(K,1))),1},X=function(K){let M=Ue(K,1),O=ae(K,2,1);return q(K,Math.atan2(M,O)),1},he=function(K){let M=Me(K,1);return M!==!1?ge(K,M):(ut(K,1),Se(K)),1},ee=function(K,M){let O=Ae(M);O!==!1?ge(K,O):q(K,M)},gt={abs:je,acos:Y,asin:x,atan:X,ceil:function(K){return S(K,1)?Te(K,1):ee(K,Math.ceil(Ue(K,1))),1},cos:Ye,deg:function(K){return q(K,Ue(K,1)*(180/Math.PI)),1},exp:function(K){return q(K,Math.exp(Ue(K,1))),1},floor:function(K){return S(K,1)?Te(K,1):ee(K,Math.floor(Ue(K,1))),1},fmod:function(K){if(S(K,1)&&S(K,2)){let M=J(K,2);M===0?Ke(K,2,"zero"):ge(K,J(K,1)%M|0)}else{let M=Ue(K,1),O=Ue(K,2);q(K,M%O)}return 1},log:function(K){let M=Ue(K,1),O;if(R(K,2))O=Math.log(M);else{let m=Ue(K,2);m===2?O=Math.log2(M):m===10?O=Math.log10(M):O=Math.log(M)/Math.log(m)}return q(K,O),1},max:function(K){let M=T(K),O=1;ye(K,M>=1,1,"value expected");for(let m=2;m<=M;m++)A(K,O,m,f)&&(O=m);return Z(K,O),1},min:function(K){let M=T(K),O=1;ye(K,M>=1,1,"value expected");for(let m=2;m<=M;m++)A(K,m,O,f)&&(O=m);return Z(K,O),1},modf:function(K){if(S(K,1))Te(K,1),q(K,0);else{let M=Ue(K,1),O=M<0?Math.ceil(M):Math.floor(M);ee(K,O),q(K,M===O?0:M-O)}return 2},rad:function(K){return q(K,Ue(K,1)*(Math.PI/180)),1},random:Ce,randomseed:we,sin:de,sqrt:function(K){return q(K,Math.sqrt(Ue(K,1))),1},tan:$e,tointeger:he,type:function(K){return Le(K,1)===s?S(K,1)?le(K,"integer"):le(K,"float"):(ut(K,1),Se(K)),1},ult:function(K){let M=xe(K,1),O=xe(K,2);return $(K,M>=0?O<0||M<O:O<0&&M<O),1}},ve=function(K){return ce(K,gt),q(K,Math.PI),Q(K,-2,W("pi",!0)),q(K,1/0),Q(K,-2,W("huge",!0)),ge(K,I),Q(K,-2,W("maxinteger",!0)),ge(K,Oe),Q(K,-2,W("mininteger",!0)),1};return tl.luaopen_math=ve,tl}var nl={},$l;function Tr(){if($l)return nl;$l=1;const{LUA_MASKCALL:f,LUA_MASKCOUNT:s,LUA_MASKLINE:A,LUA_MASKRET:T,LUA_REGISTRYINDEX:S,LUA_TFUNCTION:R,LUA_TNIL:$,LUA_TTABLE:ge,LUA_TUSERDATA:le,lua_Debug:Se,lua_call:q,lua_checkstack:Z,lua_gethook:Q,lua_gethookcount:Te,lua_gethookmask:J,lua_getinfo:Me,lua_getlocal:Le,lua_getmetatable:ye,lua_getstack:Ke,lua_getupvalue:ut,lua_getuservalue:xe,lua_insert:Ue,lua_iscfunction:Pe,lua_isfunction:ce,lua_isnoneornil:ae,lua_isthread:I,lua_newtable:Oe,lua_pcall:Ae,lua_pop:W,lua_pushboolean:_e,lua_pushfstring:H,lua_pushinteger:D,lua_pushlightuserdata:Ce,lua_pushliteral:we,lua_pushnil:je,lua_pushstring:de,lua_pushvalue:Ye,lua_rawgetp:$e,lua_rawsetp:x,lua_rotate:Y,lua_setfield:X,lua_sethook:he,lua_setlocal:ee,lua_setmetatable:ne,lua_settop:ze,lua_setupvalue:nt,lua_setuservalue:at,lua_tojsstring:ft,lua_toproxy:ct,lua_tostring:ht,lua_tothread:pt,lua_touserdata:Et,lua_type:bt,lua_upvalueid:Ze,lua_upvaluejoin:St,lua_xmove:tt}=kn(),{luaL_argcheck:gt,luaL_argerror:ve,luaL_checkany:K,luaL_checkinteger:M,luaL_checkstring:O,luaL_checktype:m,luaL_error:g,luaL_loadbuffer:w,luaL_newlib:B,luaL_optinteger:ue,luaL_optstring:ot,luaL_traceback:st,lua_writestringerror:Fe}=Un(),y=Ca(),{luastring_indexOf:V,to_luastring:me}=In(),De=function(l,n,u){l!==n&&!Z(n,u)&&g(l,me("stack overflow",!0))},qe=function(l){return Ye(l,S),1},d=function(l){return K(l,1),ye(l,1)||je(l),1},te=function(l){const n=bt(l,2);return gt(l,n==$||n==ge,2,"nil or table expected"),ze(l,2),ne(l,1),1},P=function(l){return bt(l,1)!==le?je(l):xe(l,1),1},oe=function(l){return m(l,1,le),K(l,2),ze(l,2),at(l,1),1},Ne=function(l){return I(l,1)?{arg:1,thread:pt(l,1)}:{arg:0,thread:l}},it=function(l,n,u){de(l,u),X(l,-2,n)},Qe=function(l,n,u){D(l,u),X(l,-2,n)},xt=function(l,n,u){_e(l,u),X(l,-2,n)},kt=function(l,n,u){l==n?Y(l,-2,1):tt(n,l,1),X(l,-2,u)},yt=function(l){let n=new Se,u=Ne(l),o=u.arg,C=u.thread,se=ot(l,o+2,"flnStu");if(De(l,C,3),ce(l,o+1))se=H(l,me(">%s"),se),Ye(l,o+1),tt(l,C,1);else if(!Ke(C,M(l,o+1),n))return je(l),1;return Me(C,se,n)||ve(l,o+2,"invalid option"),Oe(l),V(se,83)>-1&&(it(l,me("source",!0),n.source),it(l,me("short_src",!0),n.short_src),Qe(l,me("linedefined",!0),n.linedefined),Qe(l,me("lastlinedefined",!0),n.lastlinedefined),it(l,me("what",!0),n.what)),V(se,108)>-1&&Qe(l,me("currentline",!0),n.currentline),V(se,117)>-1&&(Qe(l,me("nups",!0),n.nups),Qe(l,me("nparams",!0),n.nparams),xt(l,me("isvararg",!0),n.isvararg)),V(se,110)>-1&&(it(l,me("name",!0),n.name),it(l,me("namewhat",!0),n.namewhat)),V(se,116)>-1&&xt(l,me("istailcall",!0),n.istailcall),V(se,76)>-1&&kt(l,C,me("activelines",!0)),V(se,102)>-1&&kt(l,C,me("func",!0)),1},wt=function(l){let n=Ne(l),u=n.thread,o=n.arg,C=new Se,se=M(l,o+2);if(ce(l,o+1))return Ye(l,o+1),de(l,Le(l,null,se)),1;{let Ve=M(l,o+1);if(!Ke(u,Ve,C))return ve(l,o+1,"level out of range");De(l,u,1);let dt=Le(u,C,se);return dt?(tt(u,l,1),de(l,dt),Y(l,-2,1),2):(je(l),1)}},Yt=function(l){let n=Ne(l),u=n.thread,o=n.arg,C=new Se,se=M(l,o+1),Ve=M(l,o+2);if(!Ke(u,se,C))return ve(l,o+1,"level out of range");K(l,o+3),ze(l,o+3),De(l,u,1),tt(l,u,1);let dt=ee(u,C,Ve);return dt===null&&W(u,1),de(l,dt),1},Vt=function(l,n){let u=M(l,2);m(l,1,R);let o=n?ut(l,1,u):nt(l,1,u);return o===null?0:(de(l,o),Ue(l,-(n+1)),n+1)},Nt=function(l){return Vt(l,1)},Bt=function(l){return K(l,3),Vt(l,0)},Ht=function(l,n,u){let o=M(l,u);return m(l,n,R),gt(l,ut(l,n,o)!==null,u,"invalid upvalue index"),o},Xt=function(l){let n=Ht(l,1,2);return Ce(l,Ze(l,1,n)),1},$t=function(l){let n=Ht(l,1,2),u=Ht(l,3,4);return gt(l,!Pe(l,1),1,"Lua function expected"),gt(l,!Pe(l,3),3,"Lua function expected"),St(l,1,n,3,u),0},Ft=me("__hooks__",!0),zt=["call","return","line","count","tail call"].map(l=>me(l)),F=function(l,n){$e(l,S,Ft);let o=Et(l,-1).get(l);o&&(o(l),de(l,zt[n.event]),n.currentline>=0?D(l,n.currentline):je(l),y.lua_assert(Me(l,me("lS"),n)),q(l,2,0))},E=function(l,n){let u=0;return V(l,99)>-1&&(u|=f),V(l,114)>-1&&(u|=T),V(l,108)>-1&&(u|=A),n>0&&(u|=s),u},Ee=function(l,n){let u=0;return l&f&&(n[u++]=99),l&T&&(n[u++]=114),l&A&&(n[u++]=108),n.subarray(0,u)},ie={gethook:function(l){let u=Ne(l).thread,o=new Uint8Array(5),C=J(u),se=Q(u);return se===null?je(l):se!==F?we(l,"external hook"):($e(l,S,Ft),Et(l,-1).get(u)(l)),de(l,Ee(C,o)),D(l,Te(u)),3},getinfo:yt,getlocal:wt,getmetatable:d,getregistry:qe,getupvalue:Nt,getuservalue:P,sethook:function(l){let n,u,o,C=Ne(l),se=C.thread,Ve=C.arg;if(ae(l,Ve+1))ze(l,Ve+1),o=null,n=0,u=0;else{const Kt=O(l,Ve+2);m(l,Ve+1,R),u=ue(l,Ve+3,0),o=F,n=E(Kt,u)}let dt;$e(l,S,Ft)===$?(dt=new WeakMap,Ce(l,dt),x(l,S,Ft)):dt=Et(l,-1);let Dt=ct(l,Ve+1);return dt.set(se,Dt),he(se,o,n,u),0},setlocal:Yt,setmetatable:te,setupvalue:Bt,setuservalue:oe,traceback:function(l){let n=Ne(l),u=n.thread,o=n.arg,C=ht(l,o+1);if(C===null&&!ae(l,o+1))Ye(l,o+1);else{let se=ue(l,o+2,l===u?1:0);st(l,u,C,se)}return 1},upvalueid:Xt,upvaluejoin:$t};let He;typeof window<"u"&&(He=function(){let l=prompt("lua_debug>","");return l!==null?l:""}),He&&(ie.debug=function(l){for(;;){let n=He();if(n==="cont")return 0;if(n.length===0)continue;let u=me(n);(w(l,u,u.length,me("=(debug command)",!0))||Ae(l,0,0,0))&&Fe(ft(l,-1),`
`),ze(l,0)}});const mt=function(l){return B(l,ie),1};return nl.luaopen_debug=mt,nl}var al={},Jl;function Er(){if(Jl)return al;Jl=1;const{LUA_DIRSEP:f,LUA_EXEC_DIR:s,LUA_JSPATH_DEFAULT:A,LUA_PATH_DEFAULT:T,LUA_PATH_MARK:S,LUA_PATH_SEP:R}=vn(),{LUA_OK:$,LUA_REGISTRYINDEX:ge,LUA_TNIL:le,LUA_TTABLE:Se,lua_callk:q,lua_createtable:Z,lua_getfield:Q,lua_insert:Te,lua_isfunction:J,lua_isnil:Me,lua_isstring:Le,lua_newtable:ye,lua_pop:Ke,lua_pushboolean:ut,lua_pushcclosure:xe,lua_pushcfunction:Ue,lua_pushfstring:Pe,lua_pushglobaltable:ce,lua_pushlightuserdata:ae,lua_pushliteral:I,lua_pushlstring:Oe,lua_pushnil:Ae,lua_pushstring:W,lua_pushvalue:_e,lua_rawgeti:H,lua_rawgetp:D,lua_rawseti:Ce,lua_rawsetp:we,lua_remove:je,lua_setfield:de,lua_setmetatable:Ye,lua_settop:$e,lua_toboolean:x,lua_tostring:Y,lua_touserdata:X,lua_upvalueindex:he}=kn(),{LUA_LOADED_TABLE:ee,LUA_PRELOAD_TABLE:ne,luaL_Buffer:ze,luaL_addvalue:nt,luaL_buffinit:at,luaL_checkstring:ft,luaL_error:ct,luaL_getsubtable:ht,luaL_gsub:pt,luaL_len:Et,luaL_loadfile:bt,luaL_newlib:Ze,luaL_optstring:St,luaL_pushresult:tt,luaL_setfuncs:gt}=Un(),ve=Ca(),{luastring_indexOf:K,to_jsstring:M,to_luastring:O,to_uristring:m}=In(),g=Or(),w=(function(){return typeof window<"u"?window:typeof WorkerGlobalScope<"u"&&self instanceof WorkerGlobalScope?self:(0,eval)("this")})(),B=O("__JSLIBS__"),ue="LUA_PATH",ot="LUA_JSPATH",st="-",Fe=f,y=f,V=O("luaopen_"),me=O("_"),De="open",qe=O("");let d;d=function(o,C,se){C=m(C);let Ve=new XMLHttpRequest;if(Ve.open("GET",C,!1),Ve.send(),Ve.status<200||Ve.status>=300)return W(o,O(`${Ve.status}: ${Ve.statusText}`)),null;let dt=Ve.response;/\/\/[#@] sourceURL=/.test(dt)||(dt+=" //# sourceURL="+C);let Dt;try{Dt=Function("fengari",dt)}catch(Gt){return W(o,O(`${Gt.name}: ${Gt.message}`)),null}let Kt=Dt(g);return typeof Kt=="function"||typeof Kt=="object"&&Kt!==null?Kt:Kt===void 0?w:(W(o,O(`library returned unexpected type (${typeof Kt})`)),null)};const te=function(o,C,se){let Ve=C[M(se)];return Ve&&typeof Ve=="function"?Ve:(Pe(o,O("undefined symbol: %s"),se),null)},P=function(o){Q(o,ge,O("LUA_NOENV"));let C=x(o,-1);return Ke(o,1),C};let oe;oe=function(o){o=m(o);let C=new XMLHttpRequest;return C.open("GET",o,!1),C.send(),C.status>=200&&C.status<=299};const Ne=1,it=2,Qe=function(o,C,se){let Ve=wt(o,C);if(Ve===null){if(Ve=d(o,C,se[0]===42),Ve===null)return Ne;Yt(o,C,Ve)}if(se[0]===42)return ut(o,1),0;{let dt=te(o,Ve,se);return dt===null?it:(Ue(o,dt),0)}},xt=function(o){let C=ft(o,1),se=ft(o,2),Ve=Qe(o,C,se);return Ve===0?1:(Ae(o),Te(o,-2),I(o,Ve===Ne?De:"init"),3)},kt=(function(){return w})(),yt=function(o,C,se,Ve){let dt=`${se}${ve.LUA_VERSUFFIX}`;W(o,O(dt));let Dt=kt[dt];Dt===void 0&&(Dt=kt[se]),Dt===void 0||P(o)?W(o,Ve):(Dt=pt(o,O(Dt),O(R+R,!0),O(R+M(qe)+R,!0)),pt(o,Dt,qe,Ve),je(o,-2)),de(o,-3,C),Ke(o,1)},wt=function(o,C){D(o,ge,B),Q(o,-1,C);let se=X(o,-1);return Ke(o,2),se},Yt=function(o,C,se){D(o,ge,B),ae(o,se),_e(o,-1),de(o,-3,C),Ce(o,-2,Et(o,-2)+1),Ke(o,1)},Vt=function(o,C){for(;C[0]===R.charCodeAt(0);)C=C.subarray(1);if(C.length===0)return null;let se=K(C,R.charCodeAt(0));return se<0&&(se=C.length),Oe(o,C,se),C.subarray(se)},Nt=function(o,C,se,Ve,dt){let Dt=new ze;for(at(o,Dt),Ve[0]!==0&&(C=pt(o,C,Ve,dt));(se=Vt(o,se))!==null;){let Kt=pt(o,Y(o,-1),O(S,!0),C);if(je(o,-2),oe(Kt))return Kt;Pe(o,O(`
	no file '%s'`),Kt),je(o,-2),nt(Dt)}return tt(Dt),null},Bt=function(o){return Nt(o,ft(o,1),ft(o,2),St(o,3,"."),St(o,4,f))!==null?1:(Ae(o),Te(o,-2),2)},Ht=function(o,C,se,Ve){Q(o,he(1),se);let dt=Y(o,-1);return dt===null&&ct(o,O("'package.%s' must be a string"),se),Nt(o,C,dt,O("."),Ve)},Xt=function(o,C,se){return C?(W(o,se),2):ct(o,O(`error loading module '%s' from file '%s':
	%s`),Y(o,1),se,Y(o,-1))},$t=function(o){let C=ft(o,1),se=Ht(o,C,O("path",!0),O(y,!0));return se===null?1:Xt(o,bt(o,se)===$,se)},Ft=function(o,C,se){let Ve;se=pt(o,se,O("."),me);let dt=K(se,st.charCodeAt(0));if(dt>=0){Ve=Oe(o,se,dt),Ve=Pe(o,O("%s%s"),V,Ve);let Dt=Qe(o,C,Ve);if(Dt!==it)return Dt;se=dt+1}return Ve=Pe(o,O("%s%s"),V,se),Qe(o,C,Ve)},zt=function(o){let C=ft(o,1),se=Ht(o,C,O("jspath",!0),O(Fe,!0));return se===null?1:Xt(o,Ft(o,se,C)===0,se)},F=function(o){let C=ft(o,1),se=K(C,46),Ve;if(se<0)return 0;Oe(o,C,se);let dt=Ht(o,Y(o,-1),O("jspath",!0),O(Fe,!0));return dt===null?1:(Ve=Ft(o,dt,C))!==0?Ve!=it?Xt(o,0,dt):(Pe(o,O(`
	no module '%s' in file '%s'`),C,dt),1):(W(o,dt),2)},E=function(o){let C=ft(o,1);return Q(o,ge,ne),Q(o,-1,C)===le&&Pe(o,O(`
	no field package.preload['%s']`),C),1},Ee=function(o,C,se,Ve){let dt=new ze;return at(o,dt),Q(o,he(1),O("searchers",!0))!==Se&&ct(o,O("'package.searchers' must be a table")),We(o,$,{name:C,i:1,msg:dt,ctx:se,k:Ve})},We=function(o,C,se){for(;C===$?(H(o,3,se.i)===le&&(Ke(o,1),tt(se.msg),ct(o,O("module '%s' not found:%s"),se.name,Y(o,-1))),W(o,se.name),q(o,1,2,se,We)):C=$,!J(o,-2);se.i++)Le(o,-2)?(Ke(o,1),nt(se.msg)):Ke(o,2);return se.k(o,$,se.ctx)},b=function(o){let C=ft(o,1);return $e(o,1),Q(o,ge,ee),Q(o,2,C),x(o,-1)?1:(Ke(o,1),Ee(o,C,C,fe))},fe=function(o,C,se){return W(o,se),Te(o,-2),q(o,2,1,se,ie),ie(o,$,se)},ie=function(o,C,se){let Ve=se;return Me(o,-1)||de(o,2,Ve),Q(o,2,Ve)==le&&(ut(o,1),_e(o,-1),de(o,2,Ve)),1},He={loadlib:xt,searchpath:Bt},mt={require:b},l=function(o){let C=[E,$t,zt,F,null];Z(o);for(let se=0;C[se];se++)_e(o,-2),xe(o,C[se],1),Ce(o,-2,se+1);de(o,-2,O("searchers",!0))},n=function(o){ye(o),Z(o,0,1),Ye(o,-2),we(o,ge,B)},u=function(o){return n(o),Ze(o,He),l(o),yt(o,O("path",!0),ue,T),yt(o,O("jspath",!0),ot,A),I(o,f+`
`+R+`
`+S+`
`+s+`
`+st+`
`),de(o,-2,O("config",!0)),ht(o,ge,ee),de(o,-2,O("loaded",!0)),ht(o,ge,ne),de(o,-2,O("preload",!0)),ce(o),_e(o,-2),gt(o,mt,1),Ke(o,1),1};return al.luaopen_package=u,al}var ll={},Ql;function kr(){if(Ql)return ll;Ql=1;const{lua_pushinteger:f,lua_pushliteral:s,lua_setfield:A}=kn(),{luaL_newlib:T}=Un(),{FENGARI_AUTHORS:S,FENGARI_COPYRIGHT:R,FENGARI_RELEASE:$,FENGARI_VERSION:ge,FENGARI_VERSION_MAJOR:le,FENGARI_VERSION_MINOR:Se,FENGARI_VERSION_NUM:q,FENGARI_VERSION_RELEASE:Z,to_luastring:Q}=In(),Te=function(J){return T(J,{}),s(J,S),A(J,-2,Q("AUTHORS")),s(J,R),A(J,-2,Q("COPYRIGHT")),s(J,$),A(J,-2,Q("RELEASE")),s(J,ge),A(J,-2,Q("VERSION")),s(J,le),A(J,-2,Q("VERSION_MAJOR")),s(J,Se),A(J,-2,Q("VERSION_MINOR")),f(J,q),A(J,-2,Q("VERSION_NUM")),s(J,Z),A(J,-2,Q("VERSION_RELEASE")),1};return ll.luaopen_fengari=Te,ll}var rl={},er;function hs(){if(er)return rl;er=1;const{lua_pop:f}=kn(),{luaL_requiref:s}=Un(),{to_luastring:A}=In(),T={},S=function(Le){for(let ye in T)s(Le,A(ye),T[ye],1),f(Le,1)};rl.luaL_openlibs=S;const R=Ca(),{luaopen_base:$}=dr(),{luaopen_coroutine:ge}=hr(),{luaopen_debug:le}=Tr(),{luaopen_math:Se}=br(),{luaopen_package:q}=Er(),{luaopen_os:Z}=gr(),{luaopen_string:Q}=mr(),{luaopen_table:Te}=pr(),{luaopen_utf8:J}=Ar();T._G=$,T[R.LUA_LOADLIBNAME]=q,T[R.LUA_COLIBNAME]=ge,T[R.LUA_TABLIBNAME]=Te,T[R.LUA_OSLIBNAME]=Z,T[R.LUA_STRLIBNAME]=Q,T[R.LUA_MATHLIBNAME]=Se,T[R.LUA_UTF8LIBNAME]=J,T[R.LUA_DBLIBNAME]=le;const{luaopen_fengari:Me}=kr();return T[R.LUA_FENGARILIBNAME]=Me,rl}var tr;function Ca(){if(tr)return Lt;tr=1;const{LUA_VERSION_MAJOR:f,LUA_VERSION_MINOR:s}=kn(),A="_"+f+"_"+s;Lt.LUA_VERSUFFIX=A,Lt.lua_assert=function(J){},Lt.luaopen_base=dr().luaopen_base;const T="coroutine";Lt.LUA_COLIBNAME=T,Lt.luaopen_coroutine=hr().luaopen_coroutine;const S="table";Lt.LUA_TABLIBNAME=S,Lt.luaopen_table=pr().luaopen_table;const R="os";Lt.LUA_OSLIBNAME=R,Lt.luaopen_os=gr().luaopen_os;const $="string";Lt.LUA_STRLIBNAME=$,Lt.luaopen_string=mr().luaopen_string;const ge="utf8";Lt.LUA_UTF8LIBNAME=ge,Lt.luaopen_utf8=Ar().luaopen_utf8;const le="bit32";Lt.LUA_BITLIBNAME=le;const Se="math";Lt.LUA_MATHLIBNAME=Se,Lt.luaopen_math=br().luaopen_math;const q="debug";Lt.LUA_DBLIBNAME=q,Lt.luaopen_debug=Tr().luaopen_debug;const Z="package";Lt.LUA_LOADLIBNAME=Z,Lt.luaopen_package=Er().luaopen_package;const Q="fengari";Lt.LUA_FENGARILIBNAME=Q,Lt.luaopen_fengari=kr().luaopen_fengari;const Te=hs();return Lt.luaL_openlibs=Te.luaL_openlibs,Lt}/**
@license MIT

Copyright © 2017-2019 Benoit Giannangeli
Copyright © 2017-2019 Daurnimator
Copyright © 1994–2017 Lua.org, PUC-Rio.
*/var nr;function Or(){if(nr)return Qt;nr=1;const f=In();Qt.FENGARI_AUTHORS=f.FENGARI_AUTHORS,Qt.FENGARI_COPYRIGHT=f.FENGARI_COPYRIGHT,Qt.FENGARI_RELEASE=f.FENGARI_RELEASE,Qt.FENGARI_VERSION=f.FENGARI_VERSION,Qt.FENGARI_VERSION_MAJOR=f.FENGARI_VERSION_MAJOR,Qt.FENGARI_VERSION_MINOR=f.FENGARI_VERSION_MINOR,Qt.FENGARI_VERSION_NUM=f.FENGARI_VERSION_NUM,Qt.FENGARI_VERSION_RELEASE=f.FENGARI_VERSION_RELEASE,Qt.luastring_eq=f.luastring_eq,Qt.luastring_indexOf=f.luastring_indexOf,Qt.luastring_of=f.luastring_of,Qt.to_jsstring=f.to_jsstring,Qt.to_luastring=f.to_luastring,Qt.to_uristring=f.to_uristring;const s=vn(),A=kn(),T=Un(),S=Ca();return Qt.luaconf=s,Qt.lua=A,Qt.lauxlib=T,Qt.lualib=S,Qt}var ps=Or();const wa=us(ps),{lua:Pt,lauxlib:on,lualib:gs}=wa;function Sa(f){return wa.to_luastring(String(f))}function ms(f,s){if(typeof s=="number")Pt.lua_pushnumber(f,s);else if(typeof s=="boolean")Pt.lua_pushboolean(f,s);else if(s==null)Pt.lua_pushnil(f);else{const A=Sa(s);Pt.lua_pushlstring(f,A,A.length)}}function ar(f,s){return wa.to_jsstring(on.luaL_checkstring(f,s))}function lr(f,s,A){return wa.to_jsstring(on.luaL_optstring(f,s,A))}class As{constructor(s,A,T){this.name=s,this.displayName=s,this.priority=0,this.scene=[],this.lastError=null,this.takeover=!1,this._getCanvasSize=T;const S=on.luaL_newstate();gs.luaL_openlibs(S),this.L=S,this._registerHostApi();const R=on.luaL_dostring(S,Sa(A));if(R!==0){const $=Pt.lua_isstring(S,-1)?wa.to_jsstring(on.luaL_tolstring(S,-1)):`load failed (code ${R})`;throw Pt.lua_pop(S,1),new Error($.trim())}this._readConfig()}_readConfig(){const s=this.L;if(Pt.lua_getglobal(s,Sa("config")),!Pt.lua_isfunction(s,-1)){Pt.lua_pop(s,1);return}if(Pt.lua_pcall(s,0,1,0)!==0||!Pt.lua_istable(s,-1)){Pt.lua_settop(s,0);return}const T=Pt.lua_gettop(s),S=this._tableValue(T,"name");typeof S=="string"&&S!==""&&(this.displayName=S);const R=this._tableValue(T,"priority");typeof R=="number"&&Number.isFinite(R)&&(this.priority=R),Pt.lua_settop(s,0)}_tableValue(s,A){const T=this.L,S=Sa(A);Pt.lua_pushlstring(T,S,S.length),Pt.lua_gettable(T,s);let R=null;return Pt.lua_isnumber(T,-1)?R=Pt.lua_tonumber(T,-1):Pt.lua_isstring(T,-1)&&(R=wa.to_jsstring(on.luaL_tolstring(T,-1))),Pt.lua_pop(T,1),R}_registerHostApi(){const s=this.L,A=(T,S)=>{Pt.lua_pushcfunction(s,S),Pt.lua_setglobal(s,Sa(T))};A("clearCanvas",()=>(this.scene.length=0,0)),A("drawText",T=>{const S=ar(T,1),R=on.luaL_checknumber(T,2),$=on.luaL_checknumber(T,3),ge=on.luaL_optnumber(T,4,24),le=lr(T,5,"#ffffff");return this.scene.push({type:"text",text:S,x:R,y:$,size:ge,color:le}),0}),A("drawImage",T=>{const S=ar(T,1),R=on.luaL_checknumber(T,2),$=on.luaL_checknumber(T,3),ge=Pt.lua_gettop(T)>=4&&!Pt.lua_isnil(T,4)?on.luaL_checknumber(T,4):null,le=Pt.lua_gettop(T)>=5&&!Pt.lua_isnil(T,5)?on.luaL_checknumber(T,5):null;return this.scene.push({type:"image",src:S,x:R,y:$,w:ge,h:le}),0}),A("drawRectangle",T=>{const S=on.luaL_checknumber(T,1),R=on.luaL_checknumber(T,2),$=on.luaL_checknumber(T,3),ge=on.luaL_checknumber(T,4),le=lr(T,5,"#ffffff");return this.scene.push({type:"rect",x:S,y:R,w:$,h:ge,fill:le}),0}),A("now",()=>(Pt.lua_pushnumber(s,Date.now()/1e3),1)),A("canvasWidth",()=>(Pt.lua_pushnumber(s,this._getCanvasSize()[0]),1)),A("canvasHeight",()=>(Pt.lua_pushnumber(s,this._getCanvasSize()[1]),1)),A("takeoverCanvas",T=>(this.takeover=Pt.lua_gettop(T)>=1&&!!Pt.lua_toboolean(T,1),0))}_call(s,A){const T=this.L;if(Pt.lua_getglobal(T,Sa(s)),!Pt.lua_isfunction(T,-1)){Pt.lua_pop(T,1);return}for(const R of A)ms(T,R);const S=Pt.lua_pcall(T,A.length,0,0);S!==0&&(this.lastError=Pt.lua_isstring(T,-1)?wa.to_jsstring(on.luaL_tolstring(T,-1)):`error code ${S}`),Pt.lua_settop(T,0)}dispose(){this.L=null,this.takeover=!1,this.scene.length=0}}class bs{constructor(s=()=>[0,0]){this._scripts=[],this._getCanvasSize=s,this._nextId=1}add(s,A){try{const T=new As(s,A,this._getCanvasSize),S=this._nextId++;return this._scripts.push({id:S,script:T,enabled:!0}),{ok:!0,id:S,displayName:T.displayName,priority:T.priority}}catch(T){return{ok:!1,error:T.message}}}setEnabled(s,A){const T=this._scripts.find(S=>S.id===s);T&&(T.enabled=!!A)}remove(s){const A=this._scripts.find(T=>T.id===s);A&&(A.script.dispose(),this._scripts=this._scripts.filter(T=>T.id!==s))}clear(){for(const{script:s}of this._scripts)s.dispose();this._scripts.length=0}get size(){return this._scripts.length}scripts(){return this._scripts.map(({id:s,script:A,enabled:T})=>({id:s,name:A.name,enabled:T,lastError:A.lastError}))}scenes(){const s=this._scripts.filter(({enabled:A})=>A);for(const A of s)if(A.script.takeover)return[{name:A.script.name,scene:A.script.scene}];return[...s].sort((A,T)=>A.script.priority-T.script.priority).map(({script:A})=>({name:A.name,scene:A.scene}))}onLogLine(s){for(const{script:A,enabled:T}of this._scripts)T&&A._call("onLogLine",[s])}onChangeZone(s){for(const{script:A,enabled:T}of this._scripts)T&&A._call("onChangeZone",[s])}onCombatStart(){for(const{script:s,enabled:A}of this._scripts)A&&s._call("onCombatStart",[])}onCombatEnd(s,A){for(const{script:T,enabled:S}of this._scripts)S&&T._call("onCombatEnd",[s,A])}frame(s){for(const{script:A,enabled:T}of this._scripts)T&&A._call("onFrame",[s])}}const Ts=`-- DMU Phase 4 real/fake debuff tracker (Kefka / Neo Exdeath / Chaos).
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

-- Sidebar label + draw priority: later phases carry higher priorities so they
-- render over any lingering display from an earlier phase.
function config()
    return { name = "P4 Debuffs", priority = 30 }
end

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

-- P4's final mechanic is the late-round Tsunami / thunder-blizzard AOE. Once it has
-- resolved (tsunami reality known), keep the display up this long so the outcome can
-- be read, then clear: the fight moves on to P5 and a lingering table would overlap
-- other trackers (e.g. Celestriad). If tsunami never resolves (missed tell) the
-- CLEAR_MS idle window above is the fallback. Stopgap: raised to 2 minutes from
-- 60s — in real pulls the display dropped before the AOE outcome had been read.
local FINAL_HIDE_MS = 120000

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

-- Identity comes ONLY from a ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change and re-injected by the app at boot). There is no
-- fallback character: without an identity line we cannot know who "you" are, so the
-- display warns instead of guessing.
local MY_NAME = nil
local MY_ID   = nil -- character ids are per-shard; only a 02 line sets these
local NO_CHARACTER_MSG = "No character detected - enter any zone once"

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
local finalResolvedAtMs = nil -- when P4's final mechanic (Tsunami / thunder-blizzard AOE) resolved

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
  finalResolvedAtMs = nil
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
  -- IINACT line type 02: "02|ts|<charID hex>|<charName>", emitted on zone change.
  -- Captured logs zero-pad the code; accept the unpadded form as well.
  if #f < 4 or (f[1] ~= "2" and f[1] ~= "02") then return end
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

  -- No identity line seen this session: warn instead of guessing a fallback character.
  if MY_ID == nil then
    local w, h = canvasWidth(), canvasHeight()
    local size = math.floor(w * 0.94 / (#NO_CHARACTER_MSG * 0.62))
    drawText(NO_CHARACTER_MSG, centerText(w / 2, NO_CHARACTER_MSG, size),
      math.floor(h / 2 + size * 0.35), size, C_WARN)
    return
  end

  -- Nothing to show until a mechanic happens; once quiet for CLEAR_MS the whole
  -- round is considered resolved and clears out.
  if lastActivityMs == nil then return end
  if tMs - lastActivityMs > CLEAR_MS then resetAll(); return end

  -- P4's final mechanic has resolved (tsunami reality known — set by an apply/cast
  -- line above or the per-frame tell re-check): keep the outcome visible for a short
  -- read window, then clear so later-phase trackers get a clean canvas.
  if finalResolvedAtMs == nil and mechs.tsunami and mechs.tsunami.reality then
    finalResolvedAtMs = tMs
  end
  if finalResolvedAtMs ~= nil and tMs - finalResolvedAtMs > FINAL_HIDE_MS then
    resetAll(); return
  end

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
`,Es=`-- Kefka P3 limit cut tracker, ported from DMUP4DebuffHelper/P3LimitCutTracker.cs.
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

-- Sidebar label + draw priority: later phases carry higher priorities so they
-- render over any lingering display from an earlier phase.
function config()
    return { name = 'P3 Limit Cut', priority = 20 }
end

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
`,ks=`-- DMU Phase 3 black hole tracker ("Accretion" debuff).
--
-- Right after limit cut resolves, Kefka slams a black hole onto exactly two players
-- (status "Accretion", ~14s). Their names are drawn as two huge lines in the same
-- oversized style as the P4 tracker's resolution windows; YOUR line is highlighted
-- in accent gold with a [YOU] tag.
--
-- The apply line is a plain status-apply (line 26):
--   "26|ts|<statusId>|Accretion|<dur>|E0000000||<targetId>|<targetName>|.."
-- Matched by status NAME so a patch shifting the hex id cannot starve the tracker.
-- Identity comes only from type-2 lines (no fallback character — without one the
-- display warns instead of guessing who "you" is).
--
-- This display lands while the limit-cut table is still up, so while there is anything
-- fresh to show the script holds a canvas takeover (takeoverCanvas): other scripts'
-- scenes keep updating but are not drawn until this one clears.

-- Sidebar label + draw priority: lands while the limit-cut table is still up, so it
-- carries a higher priority than P3 Limit Cut and renders over it (takeover aside).
function config()
    return { name = 'P3 Black Hole', priority = 21 }
end

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

-- Identity comes ONLY from a ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change and re-injected by the app at boot). There is no
-- fallback character: without an identity line we cannot know who "you" are, so the
-- display warns instead of guessing.
local MY_NAME = nil
local MY_ID   = nil -- character ids are per-shard; only a 02 line sets these
local NO_CHARACTER_MSG = 'No character detected - enter any zone once'

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
  -- IINACT line type 02: "02|ts|<charID hex>|<charName>", emitted on zone change.
  -- Captured logs zero-pad the code; accept the unpadded form as well.
  if #f < 4 or (f[1] ~= '2' and f[1] ~= '02') then return end
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
  -- No identity line seen this session: warn instead of guessing a fallback character.
  if MY_ID == nil then
    local w, h = canvasWidth(), canvasHeight()
    local size = math.floor(w * 0.94 / (#NO_CHARACTER_MSG * 0.62))
    drawText(NO_CHARACTER_MSG, centerText(w / 2, NO_CHARACTER_MSG, size),
      math.floor(h / 2 + size * 0.35), size, C_WARN)
    return
  end
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
`,Os=`-- DMU Phase 2 Forsaken tracker.
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

-- Sidebar label + draw priority: later phases carry higher priorities so they
-- render over any lingering display from an earlier phase.
function config()
    return { name = 'P2 Forsaken', priority = 10 }
end

local C_TITLE  = '#ffffff'
local C_BRIGHT = '#e8ecf8'
local C_ACCENT = '#ffd24c'
local C_WARN   = '#ffd27f'
local C_DIMMED = '#6a6a80'
local TITLE_SIZE = 16

-- PLACEHOLDER marker names — update these to the real icon names.
local MARKER_NAMES = {
  ['02CB'] = 'STACK',
  ['02CC'] = 'SPREAD',
  ['02CD'] = 'CONE',
}

-- Identity comes ONLY from a ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change and re-injected by the app at boot). There is no
-- fallback character: without an identity line we cannot know who "you" are, so the
-- display warns instead of guessing.
local MY_NAME = nil
local MY_ID   = nil -- character ids are per-shard; only a 02 line sets these
local NO_CHARACTER_MSG = 'No character detected - enter any zone once'

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
  -- IINACT line type 02: "02|ts|<charID hex>|<charName>", emitted on zone change.
  -- Captured logs zero-pad the code; accept the unpadded form as well.
  if #f < 4 or (f[1] ~= '2' and f[1] ~= '02') then return end
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
  -- No identity line seen this session: warn instead of guessing a fallback character.
  if MY_ID == nil then
    local w, h = canvasWidth(), canvasHeight()
    local size = math.floor(w * 0.94 / (#NO_CHARACTER_MSG * 0.62))
    drawText(NO_CHARACTER_MSG, centerText(w / 2, NO_CHARACTER_MSG, size),
      math.floor(h / 2 + size * 0.35), size, C_WARN)
    return
  end
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
`,ws=`-- DMU Phase 5 Celestriad element tracker (Kefka).
--
-- Kefka's "Celestriad" cast (BB42) assigns six of the eight players one of Fire /
-- Ice / Lightning Resistance Down II; two players get none. Only the INITIAL
-- assignment matters: elements rotate as the mechanic plays out, and those later
-- re-applies must not change what is shown. Displays YOUR element big —
-- FIRE / LIGHTNING / ICE, or NONE if you are one of the clean ones.

-- Sidebar label + draw priority: later phases carry higher priorities so they
-- render over any lingering display from an earlier phase.
function config()
    return { name = "P5 Celestriad", priority = 40 }
end

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
local C_WARN   = "#ffd27f"
local C_DIMMED = "#6a6a80"

-- Identity comes ONLY from a ChangePrimaryPlayer line (type 2: "2|ts|<charID>|<name>",
-- emitted by IINACT on zone change and re-injected by the app at boot). There is no
-- fallback character: without an identity line we cannot know who "you" are, so the
-- display warns instead of guessing.
local MY_NAME = nil
local MY_ID   = nil -- character ids are per-shard; only a 02 line sets these
local NO_CHARACTER_MSG = "No character detected - enter any zone once"

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
  -- IINACT line type 02: "02|ts|<charID hex>|<charName>", emitted on zone change.
  -- Captured logs zero-pad the code; accept the unpadded form as well.
  if #f < 4 or (f[1] ~= "2" and f[1] ~= "02") then return end
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
  -- No identity line seen this session: warn instead of guessing a fallback character.
  if MY_ID == nil then
    local w, h = canvasWidth(), canvasHeight()
    local size = math.floor(w * 0.94 / (#NO_CHARACTER_MSG * 0.62))
    drawText(NO_CHARACTER_MSG, centerText(w / 2, NO_CHARACTER_MSG, size),
      math.floor(h / 2 + size * 0.35), size, C_WARN)
    return
  end
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
`,dl=[{name:"dmu-p4-debuffs.lua",code:Ts},{name:"dmu-p3-limit-cut.lua",code:Es},{name:"dmu-p3-blackhole.lua",code:ks},{name:"dmu-p2-forsaken.lua",code:Os},{name:"dmu-p5-celestriad.lua",code:ws}],Oa=new ls,Ra=document.getElementById("draw-canvas"),pn=Ra.getContext("2d");function wr(){const f=Ra.parentElement.getBoundingClientRect();return[f.width,f.height]}const dn=new bs(wr),vr=document.getElementById("player-name"),vs=document.getElementById("zone-name"),ys=document.getElementById("combat-time"),rr=document.getElementById("combat-state"),yr=document.getElementById("app"),Ka=document.getElementById("sidebar-toggle"),hl="ffxiv-raid-viewer-player-name",Sr="ffxiv-raid-viewer-player-id";function Ss(f,s){vr.textContent=s;try{localStorage.setItem(hl,s),f&&localStorage.setItem(Sr,f)}catch{}}try{const f=localStorage.getItem(hl);f&&(vr.textContent=f)}catch{}const sr=document.getElementById("conn-status"),Ns=document.getElementById("msg-count"),Rs=document.getElementById("ws-url"),Nr=document.getElementById("connect-btn"),or=document.getElementById("log-file"),xs=document.getElementById("file-label"),Is=document.getElementById("replay-speed"),pl=document.getElementById("replay-btn"),Fa=document.getElementById("replay-status"),sl=document.getElementById("event-list"),ol=document.getElementById("lua-file"),Da=document.getElementById("script-list"),jn=document.getElementById("lua-error"),Ms={[zn.Idle]:"Idle",[zn.Combat]:"In Combat",[zn.Defeated]:"Wiped",[zn.Victory]:"Victory"};function Rr(){ys.textContent=fl(Oa.elapsedMs()),rr.textContent=Ms[Oa.state]??Oa.state,rr.dataset.state=Oa.state}function Wn(f){const s=document.createElement("li"),A=new Date().toLocaleTimeString();for(s.innerHTML=`<span class="stamp">${A}</span> ${f}`,sl.prepend(s);sl.children.length>50;)sl.lastChild.remove()}const Us=is();function Cs(f){const s=cr(f);s&&xr(s,f)}function xr(f,s){const A=Us(f);if(A){const S=new Date(A.timestampMs).toISOString();if(A.kind==="base-reset")console.info(`[gap] ${S} action-seq base reset +${A.jump} (combat start)`);else{const R=`${S} action-seq +${A.jump} (${A.from.toString(16)} -> ${A.to.toString(16)}) — ~${A.jump} cast line(s) missing`;A.jump>=8?console.warn("[gap]",R):console.info("[gap]",R)}}const T=Oa.handleLine(f);if(T)if(T.kind==="start")Wn("Combat started"),dn.onCombatStart();else if(T.kind==="end"){const S=T.result==="defeat"?"Wiped":"Victory";Wn(`Combat ended — ${S} (${fl(T.elapsedMs)})`),dn.onCombatEnd(T.result,T.elapsedMs)}else T.kind==="zone-reset"&&Wn("Combat reset — zone change");if(f.type===va.ChangeZone){const S=f.fields[1];S&&(vs.textContent=S,dn.onChangeZone(S))}else if(f.type===va.PlayerName){const S=f.fields[1];S&&Ss(f.fields[0],S)}dn.onLogLine(s)}const Pa=new rs({onLogLine:Cs,onMessageCount:f=>{Ns.textContent=f?`${f.toLocaleString()} lines`:""},onState:f=>{sr.dataset.state=f,sr.textContent=f[0].toUpperCase()+f.slice(1),Nr.textContent=Pa.connected?"Disconnect":"Connect"}}),ir=new Map;function Ps(f){if(f.type==="text")pn.font=`${f.size}px monospace`,pn.fillStyle=f.color,pn.fillText(f.text,f.x,f.y);else if(f.type==="rect")pn.fillStyle=f.fill,pn.fillRect(f.x,f.y,f.w,f.h);else if(f.type==="image"){let s=ir.get(f.src);s||(s=new Image,s.src=f.src,ir.set(f.src,s)),s.complete&&s.naturalWidth>0&&(f.w!==null&&f.h!==null?pn.drawImage(s,f.x,f.y,f.w,f.h):pn.drawImage(s,f.x,f.y))}}function Ir(){const f=window.devicePixelRatio||1,s=Ra.parentElement.getBoundingClientRect();Ra.width=Math.max(1,Math.floor(s.width*f)),Ra.height=Math.max(1,Math.floor(s.height*f)),pn.setTransform(f,0,0,f,0,0)}function Ds(){const[f,s]=wr();pn.clearRect(0,0,f,s);for(const{scene:A}of dn.scenes())for(const T of A)Ps(T);dn.size===0&&Oa.running&&(pn.save(),pn.globalAlpha=.35,pn.fillStyle="#cfd8ff",pn.font="28px monospace",pn.fillText(fl(Oa.elapsedMs()),16,s-16),pn.restore())}let Na=0,ul=null,Mr=!1;const Bs=f=>new Promise(s=>setTimeout(s,f));function Ga(f){Mr=f,pl.textContent=f?"Stop":"Replay"}async function Ks(f){const s=++Na;Pa.disconnect(),Ga(!0);const A=[];for(const S of f.split(`
`)){if(!S.trim())continue;const R=cr(S);R&&!Number.isNaN(R.timestampMs)&&A.push({parsed:R,raw:S})}A.sort((S,R)=>S.parsed.timestampMs-R.parsed.timestampMs),Fa.textContent=`${A.length.toLocaleString()} lines`,Wn(`Replay started (${A.length.toLocaleString()} lines)`);let T=null;for(const{parsed:S,raw:R}of A){if(s!==Na)return;const $=Number(Is.value)||1;if(T!==null){const ge=Math.max(0,(S.timestampMs-T)/$);if(ge>0&&await Bs(ge),s!==Na)return}T=S.timestampMs,xr(S,R)}s===Na&&(Ga(!1),Fa.textContent="done",Wn("Replay finished"))}const Ur="ffxiv-raid-viewer-lua-scripts";function Fs(){const f=()=>({custom:new Map,enabled:new Map});let s=null;try{const S=localStorage.getItem(Ur);S&&(s=JSON.parse(S))}catch{}if(!s||typeof s!="object"||Array.isArray(s))return f();const A=f();if(typeof s.custom=="object"&&s.custom!==null){for(const[S,R]of Object.entries(s.custom))typeof R=="string"&&A.custom.set(S,R);if(s.enabled&&typeof s.enabled=="object")for(const[S,R]of Object.entries(s.enabled))typeof R=="boolean"&&A.enabled.set(S,R);return A}const T=new Set(dl.map(S=>S.name));for(const[S,R]of Object.entries(s))typeof R=="string"&&!T.has(S)&&A.custom.set(S,R);return A}const qn=Fs();function Va(){try{localStorage.setItem(Ur,JSON.stringify({custom:Object.fromEntries(qn.custom),enabled:Object.fromEntries(qn.enabled)}))}catch(f){Wn(`Could not save scripts to localStorage: ${f.message}`)}}const Ba=document.createElement("li");Ba.className="script-section";Ba.textContent="Built-in";let da=null;function cl(f,s,{builtin:A=!1,enabled:T=!0,displayName:S}={}){const R=document.createElement("li");R.dataset.scriptId=String(f),A&&(R.dataset.builtin="true"),R.dataset.displayName=S??s;const $=document.createElement("input");$.type="checkbox",$.className="script-toggle",$.checked=T,$.title=A?"Built-in script — enable or disable":"Enable or disable script",$.addEventListener("change",()=>{dn.setEnabled(f,$.checked),qn.enabled.set(s,$.checked),Va(),R.classList.toggle("script-disabled",!$.checked)});const ge=document.createElement("span");if(ge.className="script-name",ge.textContent=S??s,S&&S!==s&&(ge.title=s),R.append($,ge),!A){const le=document.createElement("button");le.className="script-remove",le.title="Remove script",le.textContent="✕",le.addEventListener("click",()=>{dn.remove(f),R.remove(),dn.scripts().some(Se=>Se.name===s)||(qn.custom.delete(s),qn.enabled.delete(s),Va()),Gs(),Wn(`Script removed: ${s}`)}),R.appendChild(le)}return T||(dn.setEnabled(f,!1),R.classList.add("script-disabled")),R}function Gs(){![...Da.querySelectorAll("li[data-script-id]")].some(s=>!s.dataset.builtin)&&da&&(da.remove(),da=null)}function Cr(f){da||(da=document.createElement("li"),da.className="script-section",da.textContent="Custom",Ba.before(da)),([...Da.querySelectorAll("li[data-script-id]")].filter(A=>!A.dataset.builtin&&A!==f).find(A=>f.dataset.displayName.localeCompare(A.dataset.displayName)<0)??Ba).before(f)}function Vs(){let f=null;for(const s of dn.scripts()){const A=Da.querySelector(`li[data-script-id="${s.id}"]`);A&&(A.classList.toggle("script-error",!!s.lastError),s.lastError&&!f&&(f=s))}f?(jn.hidden=!1,jn.textContent=`${f.name}: ${f.lastError}`):(jn.hidden=!0,jn.textContent="")}const Hs=new Set(dl.map(f=>f.name));ol.addEventListener("change",async()=>{for(const f of[...ol.files??[]]){if(Hs.has(f.name)){jn.hidden=!1,jn.textContent=`${f.name} ships with the app — toggle it in the list below`;continue}const s=await f.text(),A=dn.add(f.name,s);A.ok?(qn.custom.set(f.name,s),Va(),Cr(cl(A.id,f.name,{displayName:A.displayName})),Wn(`Script loaded: ${f.name}`)):(jn.hidden=!1,jn.textContent=`${f.name}: ${A.error}`,Wn(`Script failed to load: ${f.name}`))}ol.value=""});(function(){Da.appendChild(Ba);let s=0;for(const[T,S]of[...qn.custom]){const R=dn.add(T,S);R.ok?(Cr(cl(R.id,T,{enabled:qn.enabled.get(T)??!0})),s++):qn.custom.delete(T)}const A=[];for(const T of dl){const S=dn.add(T.name,T.code);if(!S.ok){jn.hidden=!1,jn.textContent=`${T.name}: ${S.error}`;continue}A.push(cl(S.id,T.name,{builtin:!0,displayName:S.displayName,enabled:qn.enabled.get(T.name)??!0}))}A.sort((T,S)=>T.dataset.displayName.localeCompare(S.dataset.displayName));for(const T of A)Da.appendChild(T);Va(),s>0&&Wn(`Restored ${s} custom script(s) from localStorage`)})();try{const f=localStorage.getItem(Sr),s=localStorage.getItem(hl);f&&s&&dn.onLogLine(`02|${new Date().toISOString()}|${f}|${s}`)}catch{}Nr.addEventListener("click",()=>{if(Na++,Ga(!1),Pa.connected){Pa.disconnect();return}Fa.textContent="",Pa.connect(Rs.value.trim())});or.addEventListener("change",async()=>{var s;const f=(s=or.files)==null?void 0:s[0];f&&(xs.textContent=`${f.name} (${(f.size/1e6).toFixed(1)} MB)`,pl.disabled=!1,ul=await f.text())});pl.addEventListener("click",()=>{if(Mr){Na++,Ga(!1),Fa.textContent="stopped";return}ul&&Ks(ul)});let il=null,ur=0;function Pr(f){const s=il===null?0:Math.min(.25,(f-il)/1e3);il=f,Rr(),dn.frame(s),f>=ur&&(Vs(),ur=f+1e3),Ds(),requestAnimationFrame(Pr)}new ResizeObserver(Ir).observe(Ra.parentElement);Ir();const Dr="ffxiv-raid-viewer-sidebar-collapsed";function Br(f){yr.classList.toggle("sidebar-collapsed",f),Ka.textContent=f?"▶":"◀",Ka.title=f?"Expand sidebar":"Collapse sidebar",Ka.setAttribute("aria-expanded",String(!f));try{localStorage.setItem(Dr,f?"1":"0")}catch{}}Ka.addEventListener("click",()=>{Br(!yr.classList.contains("sidebar-collapsed"))});let Kr=!1;try{Kr=localStorage.getItem(Dr)==="1"}catch{}const Xs=window.matchMedia("(max-width: 760px)").matches||Kr;Br(Xs);let zs=null;async function Fr(){if("wakeLock"in navigator)try{zs=document.visibilityState==="visible"?await navigator.wakeLock.request("screen"):null}catch{}}document.addEventListener("visibilitychange",()=>{Fr()});Fr();Rr();requestAnimationFrame(Pr);
