
import React, { useState } from 'react';
import { Plus, Wrench, Search, ChevronDown, CheckCircle, Clock, Phone } from 'lucide-react';
import { MaintenanceJob, Product } from '../types';

interface MaintenanceProps {
  jobs: MaintenanceJob[];
  setJobs: React.Dispatch<React.SetStateAction<MaintenanceJob[]>>;
  parts: Product[];
}

const Maintenance: React.FC<MaintenanceProps> = ({ jobs, setJobs, parts }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    phoneModel: '',
    issue: '',
    cost: 0,
  });

  const addJob = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: MaintenanceJob = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      status: 'pending',
      date: new Date().toISOString(),
    };
    setJobs([newJob, ...jobs]);
    setShowAdd(false);
    setFormData({ customerName: '', customerPhone: '', phoneModel: '', issue: '', cost: 0 });
  };

  const updateStatus = (id: string, status: MaintenanceJob['status']) => {
    setJobs(prev => prev.map(job => {
      if (job.id === id) {
        // Financial recording is now handled by MaintenancePOS only
        return { ...job, status };
      }
      return job;
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'delivered': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100';
    }
  };

  // Filter out delivered jobs for the repair management view if desired, or show all
  const activeRepairJobs = jobs.filter(j => j.status !== 'delivered');
  const deliveredRepairJobs = jobs.filter(j => j.status === 'delivered');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Wrench />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">إدارة الورشة</h3>
            <p className="text-sm text-gray-500">متابعة الأجهزة والأعطال الجارية</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus size={20} />
          استلام جهاز جديد
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addJob} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">اسم العميل</label>
              <input 
                required
                className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" 
                value={formData.customerName}
                onChange={e => setFormData({...formData, customerName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">رقم الهاتف (اختياري)</label>
              <input 
                className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" 
                dir="ltr"
                placeholder="01xxxxxxxxx"
                value={formData.customerPhone}
                onChange={e => setFormData({...formData, customerPhone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">نوع الجهاز</label>
              <input 
                required
                className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" 
                value={formData.phoneModel}
                onChange={e => setFormData({...formData, phoneModel: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">المشكلة</label>
              <input 
                required
                className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" 
                value={formData.issue}
                onChange={e => setFormData({...formData, issue: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-600">تكلفة الصيانة المتوقعة</label>
              <input 
                required
                type="number"
                placeholder="0"
                className="w-full p-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900" 
                value={formData.cost || ''}
                onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold">تسجيل الجهاز في الورشة</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h4 className="font-bold text-gray-700 flex items-center gap-2">
            <Clock size={18} />
            أجهزة تحت الصيانة
          </h4>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 text-gray-600">الجهاز والعميل</th>
                  <th className="p-4 text-gray-600">العطل</th>
                  <th className="p-4 text-gray-600 text-center">التكلفة</th>
                  <th className="p-4 text-gray-600 text-center">الحالة</th>
                  <th className="p-4 text-gray-600 text-center">تغيير</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeRepairJobs.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{job.phoneModel}</div>
                      <div className="text-[10px] text-gray-500">{job.customerName}</div>
                    </td>
                    <td className="p-4 text-gray-600 truncate max-w-[150px]">{job.issue}</td>
                    <td className="p-4 text-center font-bold text-gray-700">{job.cost} ج</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusColor(job.status)}`}>
                        {job.status === 'pending' && 'انتظار'}
                        {job.status === 'in-progress' && 'جاري'}
                        {job.status === 'completed' && 'تم التصليح'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <select 
                        value={job.status}
                        onChange={(e) => updateStatus(job.id, e.target.value as any)}
                        className="text-[10px] border border-gray-200 rounded p-1 bg-white"
                      >
                        <option value="pending">انتظار</option>
                        <option value="in-progress">جاري</option>
                        <option value="completed">تم</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeRepairJobs.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                الورشة خالية من الأجهزة حالياً
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-700">قطع الغيار</h4>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="space-y-4">
              {parts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">لا يوجد قطع غيار</p>
              ) : (
                parts.map(part => (
                  <div key={part.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-100 transition-all">
                    <div className="font-bold text-sm text-gray-800">{part.name}</div>
                    <div className="flex items-center gap-4">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${part.stock < 3 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                         {part.stock}
                       </span>
                       <span className="text-xs font-bold text-gray-700">{part.price} ج</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
