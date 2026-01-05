
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, CarRecord, EditRequest, ActivityLog } from './types';
import Layout from './components/Layout';
import AuthForm from './components/AuthForm';
import CarForm from './components/CarForm';
import UserManagement from './components/UserManagement';
import { StatusBadge, CAR_BRANDS } from './constants';
import { getCarSummary } from './services/geminiService';

const INITIAL_USERS: User[] = [
  { id: '1', username: 'Admin', password: '123', role: UserRole.ADMIN, isActive: true, createdAt: '2023-10-01' },
  { id: '2', username: 'Moderator', password: '123', role: UserRole.MODERATOR, isActive: true, createdAt: '2023-10-02' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [cars, setCars] = useState<CarRecord[]>([]);
  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [chassisSearch, setChassisSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' | null }>({ message: '', type: null });

  // توجيه المستعلم دائماً لتبويب البحث ومنعه من رؤية أي شيء آخر
  useEffect(() => {
    if (user?.role === UserRole.USER && activeTab !== 'cars') {
      setActiveTab('cars');
    }
  }, [user, activeTab]);

  const notify = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: null }), 4000);
  };

  const addLog = (action: string, details: string, overrideUser?: User) => {
    const activeUser = overrideUser || user;
    if (!activeUser) return;
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      userId: activeUser.id,
      username: activeUser.username,
      action,
      details,
      timestamp: new Date().toLocaleString('ar-EG'),
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleLogin = (username: string, pass: string) => {
    const found = users.find(u => u.username === username.trim() && u.password === pass.trim());
    if (found) {
      if (!found.isActive) {
        notify("⚠️ عذراً، هذا الحساب معطل حالياً من قبل الإدارة.", "warning");
        return;
      }
      setUser(found);
      setActiveTab(found.role === UserRole.USER ? 'cars' : 'dashboard');
      addLog("LOGIN", `قام بتسجيل الدخول إلى النظام من جهاز متصفح`, found);
      notify(`أهلاً بك يا ${found.username}`, "success");
    } else {
      notify("❌ اسم المستخدم أو كلمة المرور غير صحيحة", "error");
    }
  };

  const handleRegister = (data: any) => {
    if (users.find(u => u.username === data.username.trim())) {
      notify("⚠️ اسم المستخدم موجود مسبقاً", "error");
      return false;
    }
    const isActive = data.role !== UserRole.INSPECTOR; // الفاحص بانتظار تفعيل الأدمن
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: data.username.trim(),
      password: data.password.trim(),
      role: data.role,
      nationalId: data.nationalId,
      isActive: isActive,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setUsers([...users, newUser]);
    addLog("REGISTER", `مستخدم جديد سجل في النظام بنوع: ${data.role}`, newUser);
    if (!isActive) notify("✅ تم التسجيل! حسابك كفاحص بانتظار تفعيل الإدارة.", "success");
    else notify("✅ تم التسجيل بنجاح! يمكنك الدخول الآن.", "success");
    return true;
  };

  const handleAddCar = (data: any) => {
    if (!user) return;
    const newCar: CarRecord = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      inspectorId: user.id,
      inspectorName: user.username,
      inspectionDate: new Date().toLocaleString('ar-EG'),
      status: 'LOCKED'
    };
    setCars([newCar, ...cars]);
    addLog("ADD_CAR", `أضاف سيارة جديدة (شاسيه: ${data.chassisNumber})`);
    notify("✅ تم حفظ الفحص بنجاح وقفل البيانات.", "success");
    setActiveTab('cars');
  };

  const requestEditPermission = (carId: string) => {
    if (!user) return;
    const car = cars.find(c => c.id === carId);
    if (!car) return;
    const newRequest: EditRequest = {
      id: Math.random().toString(36).substr(2, 9),
      carId,
      inspectorId: user.id,
      inspectorName: user.username,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      allowedEditsCount: 1, // السماح بتعديل واحد فقط
      usedEditsCount: 0
    };
    setRequests([newRequest, ...requests]);
    setCars(cars.map(c => c.id === carId ? { ...c, status: 'PENDING_PERMISSION' } : c));
    addLog("REQUEST_EDIT", `طلب إذن لتعديل السيارة ذات الشاسيه: ${car.chassisNumber}`);
    notify("📩 تم إرسال طلب إذن التعديل للإدارة.", "success");
  };

  const approveRequest = (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;
    setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'APPROVED' } : r));
    setCars(cars.map(c => c.id === req.carId ? { ...c, status: 'PERMISSION_GRANTED' } : c));
    addLog("APPROVE_EDIT", `تم منح الفاحص ${req.inspectorName} إذن تعديل لمرة واحدة`);
    notify("✅ تمت الموافقة على منح صلاحية التعديل لمرة واحدة.", "success");
  };

  const handlePerformEdit = (carId: string, updatedData: any) => {
    if (!user) return;
    const car = cars.find(c => c.id === carId);
    const req = requests.find(r => r.carId === carId && r.status === 'APPROVED');
    if (!car || !req) return;

    // توثيق التعديلات بدقة للمقارنة
    const diffs: string[] = [];
    Object.keys(updatedData).forEach(key => {
      if ((updatedData as any)[key] !== (car as any)[key] && key !== 'images') {
        diffs.push(`${key}: [${(car as any)[key]}] -> [${(updatedData as any)[key]}]`);
      }
    });

    setCars(cars.map(c => c.id === carId ? { ...c, ...updatedData, status: 'LOCKED' } : c));
    setRequests(requests.map(r => r.id === req.id ? { 
      ...r, 
      status: 'COMPLETED', 
      usedEditsCount: 1, 
      oldData: { ...car }, 
      newData: { ...updatedData } 
    } : r));
    
    addLog("EDIT_CAR", `قام بتعديل السيارة ${car.chassisNumber}. التغييرات: ${diffs.join(' | ')}`);
    notify("✅ تم تحديث البيانات وقفل الصلاحية فوراً.", "success");
    setActiveTab('cars');
  };

  const filteredCars = useMemo(() => {
    const isOnlyUser = user?.role === UserRole.USER;
    // المستعلم يرى النتائج فقط إذا أدخل رقم شاسيه كامل/صحيح
    if (isOnlyUser && chassisSearch.trim() === '') return [];
    
    return cars.filter(c => {
      // البحث برقم الشاسيه للأمن والدقة
      const matchChassis = chassisSearch === '' || c.chassisNumber.toLowerCase().trim() === chassisSearch.toLowerCase().trim();
      
      if (isOnlyUser) return matchChassis;
      
      const matchSearch = searchQuery === '' || c.type.toLowerCase().includes(searchQuery.toLowerCase()) || c.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchBrand = selectedBrand === '' || c.brand === selectedBrand;
      return matchSearch && (chassisSearch === '' || c.chassisNumber.toLowerCase().includes(chassisSearch.toLowerCase())) && matchBrand;
    });
  }, [cars, searchQuery, chassisSearch, selectedBrand, user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        {notification.message && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl bg-indigo-600 text-white font-bold animate-bounce-slow">
            {notification.message}
          </div>
        )}
        <AuthForm onLogin={handleLogin} onRegister={handleRegister} />
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={() => setUser(null)} activeTab={activeTab} setActiveTab={setActiveTab}>
      {notification.message && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl bg-indigo-600 text-white font-bold animate-fade-in">
          {notification.message}
        </div>
      )}

      {/* لوحة تحكم الأدمن والرقابة */}
      {activeTab === 'dashboard' && user.role !== UserRole.USER && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label="إجمالي الفحوصات" value={cars.length} icon="car" color="blue" />
            <StatsCard label="طلبات تعديل معلقة" value={requests.filter(r => r.status === 'PENDING').length} icon="edit" color="amber" />
            <StatsCard label="المستخدمين" value={users.length} icon="users" color="indigo" />
          </div>

          {(user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) && (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2 text-gray-800">
                <i className="fas fa-list-check text-indigo-600"></i>
                سجل الرقابة الإدارية والنشاط
              </h3>
              <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 italic">لا توجد عمليات مسجلة حالياً.</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-dashed hover:bg-white hover:border-indigo-200 transition-all flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-indigo-700">{log.username}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black text-white ${
                            log.action === 'LOGIN' ? 'bg-blue-500' : 
                            log.action === 'ADD_CAR' ? 'bg-green-500' : 
                            log.action === 'EDIT_CAR' ? 'bg-purple-600' : 'bg-gray-400'
                          }`}>
                            {log.action}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{log.details}</p>
                      </div>
                      <div className="text-[10px] text-gray-400 whitespace-nowrap self-end md:self-center font-mono bg-white px-2 py-1 rounded border">
                        {log.timestamp}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* واجهة البحث */}
      {activeTab === 'cars' && (
        <div className="space-y-6">
          <div className={`bg-white p-8 rounded-3xl shadow-sm border border-indigo-50 ${user.role === UserRole.USER ? 'max-w-2xl mx-auto text-center' : ''}`}>
             <h2 className="text-xl font-black mb-6 text-gray-800">
               {user.role === UserRole.USER ? 'البحث عن تقرير فحص سيارة' : 'إدارة فحوصات السيارات'}
             </h2>
            <div className={`grid grid-cols-1 gap-6 ${user.role === UserRole.USER ? '' : 'md:grid-cols-3'}`}>
              <div className="relative">
                <i className="fas fa-search absolute right-4 top-4 text-indigo-300"></i>
                <input 
                  placeholder="أدخل رقم الشاسيه للبحث..." 
                  className={`w-full pr-12 pl-4 py-3 border-2 border-indigo-50 rounded-2xl outline-none focus:border-indigo-500 bg-indigo-50/20 font-black text-indigo-900 placeholder:text-indigo-200 ${user.role === UserRole.USER ? 'text-center text-xl' : ''}`}
                  value={chassisSearch}
                  onChange={(e) => setChassisSearch(e.target.value)}
                />
              </div>
              {user.role !== UserRole.USER && (
                <>
                  <input placeholder="بحث عام (ماركة، نوع)..." className="w-full px-4 py-3 border-2 border-gray-50 rounded-2xl outline-none focus:border-indigo-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <select className="w-full px-4 py-3 border-2 border-gray-50 rounded-2xl bg-white outline-none focus:border-indigo-500" value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                    <option value="">كل الماركات</option>
                    {CAR_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </>
              )}
            </div>
            {user.role === UserRole.USER && (
              <p className="text-xs text-gray-400 mt-4 italic">يجب إدخال رقم الشاسيه بشكل مطابق تماماً لعرض التقرير الرسمي.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredCars.map(c => (
              <div key={c.id} className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col border-indigo-50 group hover:shadow-2xl transition-all duration-300">
                {c.images && c.images.length > 0 && (
                  <div className="h-64 flex overflow-x-auto p-5 gap-4 scrollbar-hide bg-gray-50/50 border-b border-indigo-50">
                    {c.images.map((img, idx) => (
                      <img key={idx} src={img} className="h-full rounded-3xl object-cover aspect-[4/3] shadow-xl border-4 border-white ring-1 ring-black/5 transform hover:scale-105 transition-transform" alt={`car-${idx}`} />
                    ))}
                  </div>
                )}
                <div className="p-8 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-2xl font-black text-gray-800">{c.brand} {c.type}</h4>
                      <p className="text-sm text-indigo-600 font-bold mt-1">
                        سنة الصنع: {c.model} - اللون: {c.color}
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-500">بتاريخ: {c.inspectionDate}</span>
                      </p>
                    </div>
                    {/* إخفاء حالة الفحص للمستعلم */}
                    {user.role !== UserRole.USER && <StatusBadge status={c.status} />}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/50">
                      <span className="text-[10px] font-bold text-indigo-300 block mb-1 uppercase tracking-widest">رقم الشاسيه المميز</span>
                      <span className="font-mono font-black text-indigo-900 text-lg">{c.chassisNumber}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-widest">المسافة الفعلية</span>
                      <span className="font-black text-gray-700 text-lg">{c.mileage.toLocaleString()} كم</span>
                    </div>
                  </div>

                  <div className="bg-gray-50/80 p-6 rounded-3xl border border-dashed border-gray-200 text-sm text-gray-600 leading-relaxed relative">
                    <div className="absolute -top-3 right-6 bg-white px-3 py-1 rounded-full border border-gray-100 text-[10px] font-bold text-indigo-600">نتائج الفحص الفني</div>
                    {c.notes}
                  </div>
                </div>
                
                {/* الإجراءات الداخلية - مخفية تماماً للمستعلم */}
                {user.role !== UserRole.USER && (
                  <div className="bg-gray-50/50 px-8 py-6 flex gap-3 border-t border-gray-100">
                    {user.role === UserRole.INSPECTOR && c.inspectorId === user.id && (
                      <>
                        {c.status === 'LOCKED' && (
                          <button onClick={() => requestEditPermission(c.id)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-2xl font-black transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2">
                            <i className="fas fa-unlock-alt"></i> طلب إذن تعديل
                          </button>
                        )}
                        {c.status === 'PERMISSION_GRANTED' && (
                          <button onClick={() => setActiveTab(`edit-${c.id}`)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-black transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2">
                            <i className="fas fa-edit"></i> تعديل الآن
                          </button>
                        )}
                        {c.status === 'PENDING_PERMISSION' && (
                          <div className="flex-1 bg-gray-200 text-gray-500 py-3 rounded-2xl font-black text-center text-sm border-2 border-dashed border-gray-300">بانتظار الموافقة...</div>
                        )}
                      </>
                    )}
                    <button onClick={() => { notify("🤖 جاري تحليل البيانات..."); getCarSummary(c).then(s => setAiSummaries(prev => ({...prev, [c.id]: s}))) }} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-black transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                      <i className="fas fa-robot"></i> تحليل ذكي
                    </button>
                  </div>
                )}
                
                {aiSummaries[c.id] && (
                  <div className="p-8 bg-indigo-950 text-indigo-50 text-xs leading-relaxed animate-fade-in border-t border-indigo-800">
                    <div className="flex items-center gap-2 mb-3 text-indigo-300 font-bold uppercase tracking-tighter">
                      <i className="fas fa-brain text-sm"></i> ملخص الذكاء الاصطناعي
                    </div>
                    {aiSummaries[c.id]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {user.role === UserRole.USER && chassisSearch.trim() === '' && (
            <div className="text-center py-32 bg-white rounded-[4rem] border-8 border-dashed border-indigo-50/50 shadow-inner">
              <i className="fas fa-car-crash text-indigo-100 text-9xl mb-10 opacity-50"></i>
              <h3 className="text-3xl font-black text-indigo-200 uppercase tracking-widest mb-4">أدخل رقم الشاسيه لعرض التقرير المعتمد</h3>
              <p className="text-gray-300 max-w-md mx-auto">نظام أوتو هب يضمن لك الوصول إلى بيانات الفحص الفنية الحقيقية والموثقة بضغطة زر واحدة.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add-car' && <CarForm onSubmit={handleAddCar} currentUser={user} />}
      
      {activeTab.startsWith('edit-') && (
        <CarForm 
          isEdit 
          initialData={cars.find(c => c.id === activeTab.replace('edit-', ''))} 
          currentUser={user} 
          onSubmit={(data) => handlePerformEdit(activeTab.replace('edit-', ''), data)} 
        />
      )}

      {activeTab === 'users' && (
        <UserManagement 
          users={users} 
          currentUser={user} 
          onToggleStatus={(id) => { 
            const target = users.find(u => u.id === id);
            setUsers(users.map(u => u.id === id ? {...u, isActive: !u.isActive} : u)); 
            addLog("USER_STATUS", `قام بتغيير حالة المستخدم ${target?.username} إلى ${!target?.isActive ? 'نشط' : 'معطل'}`);
          }} 
          onDelete={(id) => { 
            const target = users.find(u => u.id === id);
            setUsers(users.filter(u => u.id !== id)); 
            addLog("DELETE_USER", `قام بحذف حساب المستخدم: ${target?.username}`);
          }} 
          onUpdatePassword={(id, p) => setUsers(users.map(u => u.id === id ? {...u, password: p} : u))} 
          onUpdateRole={(id, r) => setUsers(users.map(u => u.id === id ? {...u, role: r} : u))} 
        />
      )}

      {activeTab === 'requests' && (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) && (
        <div className="space-y-12">
          {/* طلبات الأذونات */}
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm border-indigo-50">
            <h2 className="text-3xl font-black mb-10 flex items-center gap-4 text-gray-800">
              <i className="fas fa-key text-amber-500 text-4xl"></i>
              طلبات أذونات التعديل المشروطة
            </h2>
            <div className="space-y-6">
              {requests.filter(r => r.status === 'PENDING').length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-[2rem] text-gray-400 italic font-bold">لا توجد طلبات معلقة حالياً.</div>
              ) : (
                requests.filter(r => r.status === 'PENDING').map(req => (
                  <div key={req.id} className="p-8 bg-amber-50/30 border-2 border-amber-100 rounded-[2rem] flex flex-col lg:flex-row justify-between items-center gap-8 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-amber-500 text-3xl shadow-sm border border-amber-100">
                        <i className="fas fa-user-edit"></i>
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-xl">طلب إذن تعديل من الفاحص: {req.inspectorName}</p>
                        <p className="text-sm text-amber-600 font-bold mt-1 bg-white px-3 py-1 rounded-full inline-block border border-amber-200">السيارة شاسيه: {cars.find(c => c.id === req.carId)?.chassisNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 w-full lg:w-auto">
                      <button onClick={() => approveRequest(req.id)} className="flex-1 lg:flex-none bg-green-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-green-700 shadow-xl shadow-green-100 transition-all transform active:scale-95">موافقة (تعديل واحد فقط)</button>
                      <button onClick={() => setRequests(requests.map(r => r.id === req.id ? {...r, status: 'REJECTED'} : r))} className="flex-1 lg:flex-none bg-white border-2 border-red-100 text-red-600 px-10 py-4 rounded-2xl font-black hover:bg-red-50 transition-all">رفض الطلب</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* سجل المراقبة والمقارنة */}
          <div className="bg-white p-10 rounded-[3rem] border shadow-sm border-indigo-50">
            <h2 className="text-3xl font-black mb-10 flex items-center gap-4 text-gray-800">
              <i className="fas fa-history text-indigo-600 text-4xl"></i>
              أرشيف التعديلات المعتمدة (الرقابة الذاتية)
            </h2>
            <div className="space-y-12">
              {requests.filter(r => r.status === 'COMPLETED').length === 0 ? (
                <div className="text-center py-20 text-gray-400 italic">سجل التعديلات فارغ حتى الآن.</div>
              ) : (
                requests.filter(r => r.status === 'COMPLETED').map(req => (
                  <div key={req.id} className="border-4 border-indigo-50 rounded-[3rem] overflow-hidden shadow-sm">
                    <div className="bg-indigo-600 text-white px-10 py-5 flex flex-wrap justify-between items-center gap-4">
                      <div className="flex items-center gap-4">
                        <i className="fas fa-check-double text-2xl"></i>
                        <span className="text-lg font-black tracking-tight">الفاحص: {req.inspectorName} | شاسيه: {req.oldData?.chassisNumber}</span>
                      </div>
                      <span className="bg-white/20 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">تم التنفيذ في: {new Date(req.requestedAt).toLocaleString('ar-EG')}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-indigo-50">
                      <div className="bg-white p-10">
                        <h5 className="text-xs font-black text-red-500 uppercase mb-6 tracking-[0.2em] flex items-center gap-3">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> البيانات الأصلية (قبل التعديل)
                        </h5>
                        <div className="space-y-4 text-sm text-gray-500 font-medium">
                          <div className="flex justify-between border-b pb-2"><span>الماركة والنوع:</span> <span className="text-gray-900 font-bold">{req.oldData?.brand} {req.oldData?.type}</span></div>
                          <div className="flex justify-between border-b pb-2"><span>سنة الموديل:</span> <span className="text-gray-900 font-bold">{req.oldData?.model}</span></div>
                          <div className="flex justify-between border-b pb-2"><span>المسافة المقطوعة:</span> <span className="text-gray-900 font-bold">{req.oldData?.mileage} كم</span></div>
                          <div className="bg-gray-50 p-5 rounded-2xl mt-6 italic text-xs border border-dashed border-gray-200 leading-relaxed shadow-inner">
                            <span className="block text-[10px] font-black text-gray-300 mb-2 uppercase">الملاحظات القديمة</span>
                            {req.oldData?.notes}
                          </div>
                        </div>
                      </div>
                      <div className="bg-indigo-50/20 p-10">
                        <h5 className="text-xs font-black text-green-600 uppercase mb-6 tracking-[0.2em] flex items-center gap-3">
                          <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span> البيانات المحدثة (بعد التعديل)
                        </h5>
                        <div className="space-y-4 text-sm text-indigo-900 font-medium">
                          <div className="flex justify-between border-b border-indigo-100 pb-2"><span>الماركة والنوع:</span> <span className="text-indigo-600 font-black">{req.newData?.brand} {req.newData?.type}</span></div>
                          <div className="flex justify-between border-b border-indigo-100 pb-2"><span>سنة الموديل:</span> <span className="text-indigo-600 font-black">{req.newData?.model}</span></div>
                          <div className="flex justify-between border-b border-indigo-100 pb-2"><span>المسافة المقطوعة:</span> <span className="text-indigo-600 font-black">{req.newData?.mileage} كم</span></div>
                          <div className="bg-white p-5 rounded-2xl mt-6 font-bold text-xs border-2 border-indigo-100 leading-relaxed shadow-sm">
                            <span className="block text-[10px] font-black text-indigo-300 mb-2 uppercase">الملاحظات الجديدة</span>
                            {req.newData?.notes}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const StatsCard: React.FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => {
  const colors: any = { 
    blue: 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-50', 
    amber: 'bg-amber-50 text-amber-600 border-amber-100 ring-amber-50', 
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-50' 
  };
  return (
    <div className={`p-10 rounded-[2.5rem] border-2 shadow-sm flex items-center justify-between transition-all hover:ring-8 ${colors[color] || colors.blue}`}>
      <div>
        <p className="text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">{label}</p>
        <span className="text-5xl font-black tabular-nums tracking-tighter">{value}</span>
      </div>
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-white shadow-xl ring-4 ring-opacity-20 ring-white">
        <i className={`fas fa-${icon} text-3xl`}></i>
      </div>
    </div>
  );
};

export default App;
