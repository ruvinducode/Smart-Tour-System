import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, Lock, Phone, Globe, ChevronRight, Camera, FileText, CreditCard, CheckCircle2, AlertCircle, Eye, EyeOff, Compass, Shield } from 'lucide-react'
import { registerDriver, registerUser } from '../services/api.js'
import SriLankaMap from '../components/SriLankaMap.jsx'

const SL_DISTRICTS = ['Ampara','Anuradhapura','Badulla','Batticaloa','Colombo','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Trincomalee','Vavuniya']
const VEHICLE_TYPES = ['Mini car','Car','Mini van','Van','SUV','Mini bus','Bus']
const EMPTY_DRIVER_REG = {
  full_name:'',phone:'',email:'',nic_number:'',date_of_birth:'',gender:'',home_district:'',home_address:'',profile_photo:null,
  license_number:'',license_expiry_date:'',license_front_image:null,license_back_image:null,
  vehicle_type:'',vehicle_brand:'',vehicle_number:'',vehicle_color:'',capacity:'',
  vehicle_reg_book_image:null,revenue_license_image:null,insurance_cert_image:null,
  vehicle_front_image:null,vehicle_rear_image:null,vehicle_side_image:null,password:''
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
.lp-body{font-family:'Plus Jakarta Sans',sans-serif;}
.lp-serif{font-family:'Playfair Display',serif;}
.lp-input{width:100%;background:white;border:1.5px solid rgba(6,78,59,0.12);border-radius:14px;padding:14px 16px;font-size:13px;color:#1c1917;outline:none;transition:border-color 0.2s,box-shadow 0.2s;font-family:'Plus Jakarta Sans',sans-serif;}
.lp-input:focus{border-color:#064e3b;box-shadow:0 0 0 4px rgba(6,78,59,0.07);}
.lp-input::placeholder{color:#94a3b8;}
.lp-scroll::-webkit-scrollbar{width:4px;}
.lp-scroll::-webkit-scrollbar-thumb{background:#d1fae5;border-radius:4px;}
`
if(typeof document!=='undefined'&&!document.getElementById('lp-css')){const s=document.createElement('style');s.id='lp-css';s.textContent=css;document.head.appendChild(s)}

function ImgUpload({label,fieldName,value,onChange,required}){
  const ref=useRef(null)
  const url=value?URL.createObjectURL(value):null
  return(
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}{required&&<span className="text-amber-500 ml-0.5">*</span>}</p>
      <div onClick={()=>ref.current?.click()} className="h-24 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-all overflow-hidden">
        {url?<img src={url} className="h-full w-full object-cover" alt=""/>:<><Camera size={20} className="text-slate-300"/><span className="text-[10px] text-slate-400 mt-1">Upload</span></>}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e=>onChange(fieldName,e.target.files[0]||null)}/>
      </div>
      {value&&<p className="text-[10px] text-emerald-600 truncate">✓ {value.name}</p>}
    </div>
  )
}

function Field({label,icon:Icon,children}){
  return(
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        {Icon&&<Icon size={12} className="text-amber-500"/>}{label}
      </label>
      {children}
    </div>
  )
}

export default function LoginPage({error,info,loading,loginForm,setLoginForm,onLogin,onDriverLogin,initialAccountType='user',initialMode='login'}){
  const [acct,setAcct]=useState(initialAccountType)
  const [mode,setMode]=useState(initialMode)
  const [showPw,setShowPw]=useState(false)
  const [regLoading,setRegLoading]=useState(false)
  const [regError,setRegError]=useState('')
  const [regInfo,setRegInfo]=useState('')
  const [reg,setReg]=useState({full_name:'',email:'',password:'',phone:'',country:''})
  const [drv,setDrv]=useState(EMPTY_DRIVER_REG)

  useEffect(()=>{setAcct(initialAccountType);setMode(initialMode);setRegError('');setRegInfo('')},[initialAccountType,initialMode])

  const onDriverField=(f,v)=>setDrv(p=>({...p,[f]:v}))

  const onUserReg=async e=>{
    e.preventDefault();setRegError('');setRegInfo('');setRegLoading(true)
    try{const d=await registerUser(reg);setRegInfo(d.message||'Account created!');setMode('login');setLoginForm(p=>({...p,email:reg.email}))}
    catch(err){setRegError(err.message||'Failed')}finally{setRegLoading(false)}
  }
  const onDrvReg=async e=>{
    e.preventDefault();setRegError('');setRegInfo('');setRegLoading(true)
    try{const d=await registerDriver(drv);setRegInfo(d.message||'Submitted! Await approval.');setMode('login')}
    catch(err){setRegError(err.message||'Failed')}finally{setRegLoading(false)}
  }

  const inp=(extra='')=>`lp-input${extra?' '+extra:''}`

  return(
    <div className="lp-body min-h-screen bg-gradient-to-br from-slate-100 via-amber-50 to-emerald-50 flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[1300px] flex flex-col lg:flex-row overflow-hidden rounded-[2.5rem] shadow-[0_40px_80px_-10px_rgba(0,0,0,0.18)] bg-white min-h-[850px] transition-all duration-500 ease-in-out">

        {/* LEFT: FORM */}
        <div className="flex flex-col flex-1 p-8 md:p-12 overflow-hidden" style={{minWidth:0}}>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-emerald-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Compass size={22} className="text-white"/>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-[0.3em]">Sri Lanka</p>
              <h1 className="text-lg font-extrabold text-emerald-950 leading-none tracking-tight">Smart Tour</h1>
            </div>
          </div>

          {/* Title */}
          <AnimatePresence mode="wait">
            <motion.div key={mode+acct} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="mb-8">
              <h2 className="lp-serif text-3xl sm:text-4xl text-emerald-950 mb-2">
                {mode==='login'?(acct==='driver'?'Driver Portal':'Welcome Back'):(acct==='driver'?'Partner Registration':'Create Account')}
              </h2>
              <p className="text-slate-400 text-sm">
                {mode==='login'?'Sign in to manage your journeys across the island.':'Join Smart Tour and explore Sri Lanka like never before.'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Tabs */}
          <div className="flex flex-wrap gap-3 mb-8">
            <div className="flex bg-slate-100 rounded-2xl p-1 gap-0.5">
              {['login','register'].map(m=>(
                <button key={m} onClick={()=>{setMode(m);setRegError('');setRegInfo('')}}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${mode===m?'bg-white text-emerald-900 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                  {m==='login'?'Sign In':'Register'}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 rounded-2xl p-1 gap-0.5">
              <button onClick={()=>{setAcct('user');setRegError('');setRegInfo('')}}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${acct==='user'?'bg-emerald-900 text-white shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                Traveler
              </button>
              <button onClick={()=>{setAcct('driver');setRegError('');setRegInfo('')}}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${acct==='driver'?'bg-amber-500 text-emerald-950 shadow-sm':'text-slate-400 hover:text-slate-600'}`}>
                Driver
              </button>
            </div>
          </div>

          {/* Alerts */}
          {(error||regError)&&<div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold"><AlertCircle size={15}/>{error||regError}</div>}
          {(info||regInfo)&&<div className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold"><CheckCircle2 size={15}/>{info||regInfo}</div>}

          {/* FORM AREA */}
          <div className="flex-1 overflow-y-auto lp-scroll -mr-2 pr-2">
            <AnimatePresence mode="wait">

              {/* LOGIN */}
              {mode==='login'&&(
                <motion.form key="login" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}}
                  onSubmit={acct==='driver'?onDriverLogin:onLogin} className="space-y-5">
                  <Field label="Email Address" icon={Mail}>
                    <div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input type="email" required value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))} className={inp()} style={{paddingLeft:'40px'}} placeholder="you@example.com"/>
                    </div>
                  </Field>
                  <Field label="Password" icon={Lock}>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input type={showPw?'text':'password'} required value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))} className={inp()} style={{paddingLeft:'40px',paddingRight:'48px'}} placeholder="••••••••"/>
                      <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-900 transition-colors">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                    </div>
                  </Field>
                  <motion.button whileHover={{scale:1.01}} whileTap={{scale:0.99}} type="submit" disabled={loading}
                    className="w-full py-4 rounded-2xl bg-emerald-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-all disabled:opacity-60 mt-2">
                    {loading?'Authenticating…':'Sign In'}<ChevronRight size={17}/>
                  </motion.button>
                </motion.form>
              )}

              {/* REGISTER USER */}
              {mode==='register'&&acct==='user'&&(
                <motion.form key="reg-user" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}}
                  onSubmit={onUserReg} className="space-y-5 pb-4">
                  <Field label="Full Name" icon={User}>
                    <div className="relative"><User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input type="text" required value={reg.full_name} onChange={e=>setReg(p=>({...p,full_name:e.target.value}))} className={inp()} style={{paddingLeft:'40px'}} placeholder="Your Full Name"/>
                    </div>
                  </Field>
                  <Field label="Email Address" icon={Mail}>
                    <div className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input type="email" required value={reg.email} onChange={e=>setReg(p=>({...p,email:e.target.value}))} className={inp()} style={{paddingLeft:'40px'}} placeholder="you@example.com"/>
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Phone" icon={Phone}>
                      <div className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                        <input type="tel" required value={reg.phone} onChange={e=>setReg(p=>({...p,phone:e.target.value}))} className={inp()} style={{paddingLeft:'40px'}} placeholder="+94"/>
                      </div>
                    </Field>
                    <Field label="Country" icon={Globe}>
                      <div className="relative"><Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                        <input type="text" required value={reg.country} onChange={e=>setReg(p=>({...p,country:e.target.value}))} className={inp()} style={{paddingLeft:'40px'}} placeholder="Country"/>
                      </div>
                    </Field>
                  </div>
                  <Field label="Password" icon={Lock}>
                    <div className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input type={showPw?'text':'password'} required value={reg.password} onChange={e=>setReg(p=>({...p,password:e.target.value}))} className={inp()} style={{paddingLeft:'40px',paddingRight:'48px'}} placeholder="Create password"/>
                      <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-900">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                    </div>
                  </Field>
                  <motion.button whileHover={{scale:1.01}} whileTap={{scale:0.99}} type="submit" disabled={regLoading}
                    className="w-full py-4 rounded-2xl bg-emerald-900 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 hover:bg-emerald-800 transition-all disabled:opacity-60">
                    {regLoading?'Creating…':'Create Traveler Account'}
                  </motion.button>
                </motion.form>
              )}

              {/* REGISTER DRIVER */}
              {mode==='register'&&acct==='driver'&&(
                <motion.form key="reg-driver" initial={{opacity:0,x:-16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:16}}
                  onSubmit={onDrvReg} className="space-y-8 pb-6">

                  {/* Section 1 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center">1</span>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Personal Info</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input className={inp()} placeholder="Full Name (NIC)*" required value={drv.full_name} onChange={e=>onDriverField('full_name',e.target.value)}/>
                      <input className={inp()} placeholder="NIC Number*" required value={drv.nic_number} onChange={e=>onDriverField('nic_number',e.target.value)}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="date" className={inp()} required value={drv.date_of_birth} onChange={e=>onDriverField('date_of_birth',e.target.value)}/>
                      <select className={inp()} required value={drv.gender} onChange={e=>onDriverField('gender',e.target.value)}>
                        <option value="">Gender*</option><option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input className={inp()} placeholder="Phone*" required value={drv.phone} onChange={e=>onDriverField('phone',e.target.value)}/>
                      <input type="email" className={inp()} placeholder="Email (optional)" value={drv.email} onChange={e=>onDriverField('email',e.target.value)}/>
                    </div>
                    <select className={inp()} required value={drv.home_district} onChange={e=>onDriverField('home_district',e.target.value)}>
                      <option value="">District*</option>{SL_DISTRICTS.map(d=><option key={d}>{d}</option>)}
                    </select>
                    <ImgUpload label="Profile Photo" fieldName="profile_photo" value={drv.profile_photo} onChange={onDriverField} required/>
                  </div>

                  {/* Section 2 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center">2</span>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Driving License</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input className={inp()} placeholder="License Number*" required value={drv.license_number} onChange={e=>onDriverField('license_number',e.target.value)}/>
                      <input type="date" className={inp()} required value={drv.license_expiry_date} onChange={e=>onDriverField('license_expiry_date',e.target.value)}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <ImgUpload label="License Front" fieldName="license_front_image" value={drv.license_front_image} onChange={onDriverField} required/>
                      <ImgUpload label="License Back" fieldName="license_back_image" value={drv.license_back_image} onChange={onDriverField} required/>
                    </div>
                  </div>

                  {/* Section 3 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-black flex items-center justify-center">3</span>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Vehicle Details</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <select className={inp()} required value={drv.vehicle_type} onChange={e=>onDriverField('vehicle_type',e.target.value)}>
                        <option value="">Vehicle Type*</option>{VEHICLE_TYPES.map(v=><option key={v}>{v}</option>)}
                      </select>
                      <input className={inp()} placeholder="Brand (Toyota…)*" required value={drv.vehicle_brand} onChange={e=>onDriverField('vehicle_brand',e.target.value)}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input className={inp()} placeholder="Reg. Number*" required value={drv.vehicle_number} onChange={e=>onDriverField('vehicle_number',e.target.value)}/>
                      <input type="number" min="1" max="60" className={inp()} placeholder="Capacity*" required value={drv.capacity} onChange={e=>onDriverField('capacity',e.target.value)}/>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <ImgUpload label="Reg. Book" fieldName="vehicle_reg_book_image" value={drv.vehicle_reg_book_image} onChange={onDriverField} required/>
                      <ImgUpload label="Revenue Lic." fieldName="revenue_license_image" value={drv.revenue_license_image} onChange={onDriverField} required/>
                      <ImgUpload label="Insurance" fieldName="insurance_cert_image" value={drv.insurance_cert_image} onChange={onDriverField} required/>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-xs font-black flex items-center justify-center"><Shield size={12}/></span>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Account Password</h4>
                    </div>
                    <div className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                      <input type={showPw?'text':'password'} required value={drv.password} onChange={e=>onDriverField('password',e.target.value)} className={inp()} style={{paddingLeft:'40px',paddingRight:'48px'}} placeholder="Create a strong password"/>
                      <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">{showPw?<EyeOff size={16}/>:<Eye size={16}/>}</button>
                    </div>
                  </div>

                  <motion.button whileHover={{scale:1.01}} whileTap={{scale:0.99}} type="submit" disabled={regLoading}
                    className="w-full py-4 rounded-2xl bg-amber-500 text-emerald-950 font-bold text-sm shadow-lg hover:bg-amber-400 transition-all disabled:opacity-60">
                    {regLoading?'Submitting…':'Submit Driver Application'}
                  </motion.button>
                </motion.form>
              )}

            </AnimatePresence>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            <span>© 2026 Smart Tour LK</span>
            <div className="flex gap-4"><a href="#" className="hover:text-emerald-700 transition-colors">Support</a><a href="#" className="hover:text-emerald-700 transition-colors">Privacy</a></div>
          </div>
        </div>

        {/* RIGHT: MAP PANEL */}
        <div className="hidden lg:flex flex-col items-center justify-start relative bg-emerald-950 overflow-hidden" style={{width:'550px',flexShrink:0}}>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-emerald-950 to-emerald-900/60"/>
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] opacity-20" style={{background:'#d97706'}}/>
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[100px] opacity-15" style={{background:'#34d399'}}/>

          <div className="relative z-10 w-full h-full flex flex-col items-center px-8 pb-8 pt-0 text-center">
            <div className="w-full flex items-center justify-center pt-8 mb-2">
              <SriLankaMap/>
            </div>
            <div className="shrink-0 w-full max-w-xs">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`text-${acct}-${mode}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="lp-serif text-white text-3xl mb-3">
                    {acct === 'driver' 
                      ? (mode === 'register' ? 'Join Our Fleet' : 'Driver Portal') 
                      : (mode === 'register' ? 'Start Your Journey' : 'Discover the Island')}
                  </h3>
                  <p className="text-emerald-100/40 text-sm leading-relaxed mb-8">
                    {acct === 'driver' 
                      ? (mode === 'register' ? 'Partner with Smart Tour and turn your vehicle into a thriving business.' : 'Access your dashboard, manage your trips, and track your earnings seamlessly.') 
                      : (mode === 'register' ? 'Create an account to book verified local drivers across every corner of Sri Lanka.' : 'Smart Tour connects travelers with verified local drivers across every corner of Sri Lanka.')}
                  </p>
                  <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-left backdrop-blur-sm">
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_,i)=><span key={i} className="text-amber-400 text-sm">★</span>)}
                    </div>
                    <p className="text-white text-sm font-medium leading-relaxed mb-2">
                      {acct === 'driver' 
                        ? '"Smart Tour completely transformed my business. The platform is easy to use and provides steady bookings."' 
                        : '"Absolutely seamless experience. Our driver knew every hidden gem along the southern coast."'}
                    </p>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
                      {acct === 'driver' ? '— Kamal P., Kandy' : '— Sarah K., United Kingdom'}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
