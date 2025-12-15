import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Users,
  FileText,
  Calculator,
  Search,
  UserPlus,
  Upload,
  AlertTriangle,
  CheckCircle,
  Activity,
  ArrowRight,
  Brain,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { useNotifications } from './NotificationContext';

// Type Definitions
interface Patient {
  id: string;
  name: string;
  age?: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  allergies: string[];
  medicalConditions: string[];
  currentMedications: string[];
  branchId: string;
  lastVisit: string;
}

interface PrescriptionItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantityPrescribed: number;
  instructions?: string;
}

interface Prescription {
  id: string;
  patientId: string;
  doctorName: string;
  diagnosis: string;
  notes: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  branchId: string;
  items: PrescriptionItem[];
}

interface Branch {
  id: string;
  name: string;
  location: string;
  manager: string;
}

const Clinical: React.FC<{ currentBranchId: string }> = ({ currentBranchId }) => {
  const { showSuccess, showError } = useNotifications();
  const [activeTab, setActiveTab] = useState<'patients' | 'rx' | 'tools'>('patients');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Patient Form State
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [patientForm, setPatientForm] = useState<Partial<Patient>>({
    name: '',
    age: undefined,
    gender: 'Male',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    allergies: [],
    medicalConditions: [],
    currentMedications: []
  });

  // Prescription Form State
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState<Partial<Prescription>>({
    doctorName: '',
    diagnosis: '',
    notes: '',
    items: []
  });

  // Rx Processing State
  const [rxImage, setRxImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Calculator State
  const [calcInput, setCalcInput] = useState({ weight: '', doseMgPerKg: '', concentrationMgPerMl: '' });
  const [calcResult, setCalcResult] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [branchesData, patientsData, prescriptionsData] = await Promise.all([
          api.getBranches(),
          api.getPatients(),
          api.getPrescriptions()
        ]);
        setBranches(branchesData || []);
        setPatients(patientsData || []);
        setPrescriptions(prescriptionsData || []);
      } catch (error) {
        console.error('Failed to load clinical data:', error);
        showError('Data Loading Error', 'Failed to load clinical data from database.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const isHeadOffice = currentBranchId === 'HEAD_OFFICE';
  const branchName = branches.find(b => b.id === currentBranchId)?.name || 'Unknown Branch';

  const filteredPatients = patients.filter(p =>
    (isHeadOffice || p.branchId === currentBranchId) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCalculate = () => {
    const w = parseFloat(calcInput.weight);
    const d = parseFloat(calcInput.doseMgPerKg);
    const c = parseFloat(calcInput.concentrationMgPerMl);

    if (w && d && c) {
      const totalMg = w * d;
      const ml = totalMg / c;
      setCalcResult(`${ml.toFixed(2)} ml`);
    }
  };

  const handleRxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRxImage(reader.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeRx = async () => {
    if (!rxImage) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setAnalysisResult({
        patientName: 'Sample Patient',
        medicines: [
          { name: 'Paracetamol 500mg', dosage: '500mg', frequency: '3x daily' },
          { name: 'Amoxicillin 250mg', dosage: '250mg', frequency: '2x daily' }
        ]
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleAddPatient = async () => {
    if (!patientForm.name) {
      showError('Validation Error', 'Patient name is required.');
      return;
    }

    try {
      const newPatient: Partial<Patient> = {
        name: patientForm.name || '',
        age: patientForm.age,
        gender: patientForm.gender || 'Male',
        phone: patientForm.phone || '',
        email: patientForm.email || '',
        address: patientForm.address || '',
        emergencyContact: patientForm.emergencyContact || '',
        emergencyPhone: patientForm.emergencyPhone || '',
        allergies: patientForm.allergies || [],
        medicalConditions: patientForm.medicalConditions || [],
        currentMedications: patientForm.currentMedications || [],
        branchId: currentBranchId,
        lastVisit: new Date().toISOString()
      };

      const createdPatient = await api.createPatient(newPatient);
      setPatients(prev => [createdPatient, ...prev]);
      setShowPatientModal(false);
      setPatientForm({
        name: '', age: undefined, gender: 'Male', phone: '', email: '', address: '',
        emergencyContact: '', emergencyPhone: '', allergies: [], medicalConditions: [], currentMedications: []
      });
      showSuccess('Patient Added', `${createdPatient.name} has been added to the database.`);
    } catch (error) {
      console.error('Failed to create patient:', error);
      showError('Creation Failed', 'Failed to save patient to database. Please try again.');
    }
  };

  const handleUpdatePatient = async () => {
    if (!editingPatient) return;

    try {
      const updatedPatient = await api.updatePatient(editingPatient.id, patientForm);
      setPatients(prev => prev.map(p => p.id === editingPatient.id ? updatedPatient : p));
      setShowPatientModal(false);
      setEditingPatient(null);
      showSuccess('Patient Updated', 'Patient information has been updated in the database.');
    } catch (error) {
      console.error('Failed to update patient:', error);
      showError('Update Failed', 'Failed to update patient in database. Please try again.');
    }
  };

  const openPatientModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      setPatientForm(patient);
    } else {
      setEditingPatient(null);
      setPatientForm({
        name: '', age: undefined, gender: 'Male', phone: '', email: '', address: '',
        emergencyContact: '', emergencyPhone: '', allergies: [], medicalConditions: [], currentMedications: []
      });
    }
    setShowPatientModal(true);
  };

  const handleAddPrescription = async () => {
    if (!selectedPatient || !prescriptionForm.doctorName) {
      showError('Validation Error', 'Patient and doctor name are required.');
      return;
    }

    try {
      const newPrescription: Partial<Prescription> = {
        patientId: selectedPatient.id,
        doctorName: prescriptionForm.doctorName || '',
        diagnosis: prescriptionForm.diagnosis || '',
        notes: prescriptionForm.notes || '',
        status: 'ACTIVE',
        branchId: currentBranchId,
        items: prescriptionForm.items || []
      };

      const createdPrescription = await api.createPrescription(newPrescription);
      setPrescriptions(prev => [createdPrescription, ...prev]);
      setShowPrescriptionModal(false);
      setSelectedPatient(null);
      setPrescriptionForm({ doctorName: '', diagnosis: '', notes: '', items: [] });
      showSuccess('Prescription Created', 'Prescription has been saved to the database.');
    } catch (error) {
      console.error('Failed to create prescription:', error);
      showError('Creation Failed', 'Failed to save prescription to database. Please try again.');
    }
  };

  const addPrescriptionItem = () => {
    const newItem: PrescriptionItem = {
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: '',
      quantityPrescribed: 1
    };
    setPrescriptionForm(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, value: any) => {
    setPrescriptionForm(prev => ({
      ...prev,
      items: prev.items?.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const removePrescriptionItem = (index: number) => {
    setPrescriptionForm(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Clinical & Rx</h2>
          <p className="text-slate-500 mt-1">
            {isHeadOffice ? 'Centralized Patient & Prescription Records' : `Clinical Services at ${branchName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'patients' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Users size={16} /> Patients (EMR)
          </button>
          <button
            onClick={() => setActiveTab('rx')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'rx' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Brain size={16} /> Smart Rx Scan
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeTab === 'tools' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Calculator size={16} /> Dosage Calc
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'patients' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
          {isLoading ? (
            <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm text-center">
              <Activity className="animate-spin mx-auto mb-4 text-teal-600" size={32} />
              <p>Loading patient records...</p>
            </div>
          ) : (
            <>
              <div className="flex gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search Patient Name or ID..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => openPatientModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium text-sm shadow-md"
                >
                  <UserPlus size={18} /> New Patient
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Patient Name</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Age / Gender</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Phone</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Allergies</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Last Visit</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                          <Users size={48} className="mx-auto mb-2 opacity-20" />
                          <p>No patients found. Add your first patient to get started.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map(patient => (
                        <tr key={patient.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{patient.name}</div>
                            <div className="text-xs text-slate-400">ID: {patient.id}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {patient.age} yrs / {patient.gender}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {patient.phone}
                          </td>
                          <td className="px-6 py-4">
                            {patient.allergies && patient.allergies.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {patient.allergies.map(alg => (
                                  <span key={alg} className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-bold">{alg}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">None Recorded</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openPatientModal(patient)}
                                className="text-teal-600 hover:underline text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setShowPrescriptionModal(true);
                                }}
                                className="text-blue-600 hover:underline text-sm font-medium"
                              >
                                New Rx
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'rx' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[400px]">
            {!rxImage ? (
              <div className="text-center w-full">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload size={32} className="text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Prescription Image</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                  Drag and drop a prescription photo or scan here.
                </p>
                <label className="cursor-pointer bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg inline-block">
                  Select Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleRxUpload} />
                </label>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <div className="relative flex-1 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-4 group">
                  <img src={rxImage} alt="Prescription" className="w-full h-full object-contain" />
                  <button
                    onClick={() => setRxImage(null)}
                    className="absolute top-2 right-2 bg-white/90 p-2 rounded-full text-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <button
                  onClick={handleAnalyzeRx}
                  disabled={isAnalyzing}
                  className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>Analyzing <Activity className="animate-spin" size={16} /></>
                  ) : (
                    <>Digitize with AI <Brain size={16} /></>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="text-teal-600" />
              Extraction Results
            </h3>

            {analysisResult ? (
              <div className="space-y-6 flex-1">
                {analysisResult.error ? (
                  <div className="p-4 bg-rose-50 text-rose-700 rounded-lg">
                    Error: {analysisResult.error}
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                      <h4 className="font-bold text-teal-800 text-sm uppercase mb-2">Patient Details</h4>
                      <div className="flex items-center gap-2">
                        <Users size={16} className="text-teal-600" />
                        <span className="text-slate-700 font-medium">{analysisResult.patientName || 'Not Detected'}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-500 text-sm uppercase mb-3">Identified Medicines</h4>
                      <div className="space-y-3">
                        {analysisResult.medicines?.map((med: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:border-teal-200 transition-colors">
                            <div>
                              <div className="font-bold text-slate-800">{med.name}</div>
                              <div className="text-xs text-slate-500">{med.dosage} • {med.frequency}</div>
                            </div>
                            <CheckCircle size={18} className="text-teal-600" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto pt-6">
                      <button className="w-full py-3 border border-teal-600 text-teal-600 font-bold rounded-xl hover:bg-teal-50 transition-all">
                        Add to Patient Record
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 text-center p-8">
                <Activity size={48} className="mb-4 opacity-20" />
                <p>Upload and analyze a prescription to see results here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Calculator className="text-teal-400" /> Pediatric Dosage Calculator
              </h3>
              <p className="text-slate-400 text-sm mt-1">Calculate safe liquid dosage volume based on weight.</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Patient Weight (kg)</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="e.g. 12"
                    value={calcInput.weight}
                    onChange={(e) => setCalcInput({ ...calcInput, weight: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Target Dose (mg/kg)</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="e.g. 15"
                    value={calcInput.doseMgPerKg}
                    onChange={(e) => setCalcInput({ ...calcInput, doseMgPerKg: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Drug Concentration (mg/ml)</label>
                <input
                  type="number"
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="e.g. 24"
                  value={calcInput.concentrationMgPerMl}
                  onChange={(e) => setCalcInput({ ...calcInput, concentrationMgPerMl: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={handleCalculate}
                  className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg"
                >
                  Calculate
                </button>
                {calcResult && (
                  <div className="flex items-center gap-3 animate-in fade-in">
                    <ArrowRight className="text-slate-400" />
                    <div className="text-2xl font-bold text-teal-700">
                      {calcResult}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 p-4 text-xs text-slate-500 text-center border-t border-slate-100">
              <strong>Disclaimer:</strong> For estimation only. Always verify with medical guidelines.
            </div>
          </div>
        </div>
      )}

      {/* Patient Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">{editingPatient ? 'Edit Patient' : 'Add New Patient'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={patientForm.name || ''}
                  onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Age"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={patientForm.age || ''}
                  onChange={(e) => setPatientForm({ ...patientForm, age: parseInt(e.target.value) || undefined })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={patientForm.gender || 'Male'}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as any })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="tel"
                  placeholder="Phone"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={patientForm.phone || ''}
                  onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                />
              </div>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={patientForm.email || ''}
                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })}
              />
              <textarea
                placeholder="Address"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                rows={2}
                value={patientForm.address || ''}
                onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
              />
              <input
                type="text"
                placeholder="Allergies (comma-separated)"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={patientForm.allergies?.join(', ') || ''}
                onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
              />
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setShowPatientModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={editingPatient ? handleUpdatePatient : handleAddPatient}
                className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg"
              >
                {editingPatient ? 'Update' : 'Add'} Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">New Prescription</h3>
              <p className="text-slate-500 text-sm">Create prescription for {selectedPatient.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Doctor Name *"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={prescriptionForm.doctorName || ''}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorName: e.target.value })}
              />
              <input
                type="text"
                placeholder="Diagnosis"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={prescriptionForm.diagnosis || ''}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
              />
              <textarea
                placeholder="Notes"
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                rows={2}
                value={prescriptionForm.notes || ''}
                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })}
              />

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-800">Medications</h4>
                  <button
                    onClick={addPrescriptionItem}
                    className="flex items-center gap-2 px-3 py-1 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {prescriptionForm.items?.map((item, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          placeholder="Medicine Name"
                          className="p-2 border border-slate-300 rounded text-sm"
                          value={item.medicationName || ''}
                          onChange={(e) => updatePrescriptionItem(index, 'medicationName', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg)"
                          className="p-2 border border-slate-300 rounded text-sm"
                          value={item.dosage || ''}
                          onChange={(e) => updatePrescriptionItem(index, 'dosage', e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Frequency (e.g. 3x daily)"
                          className="p-2 border border-slate-300 rounded text-sm"
                          value={item.frequency || ''}
                          onChange={(e) => updatePrescriptionItem(index, 'frequency', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Quantity"
                          className="p-2 border border-slate-300 rounded text-sm"
                          value={item.quantityPrescribed || 1}
                          onChange={(e) => updatePrescriptionItem(index, 'quantityPrescribed', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="flex justify-between">
                        <input
                          type="text"
                          placeholder="Duration (e.g. 7 days)"
                          className="flex-1 p-2 border border-slate-300 rounded text-sm mr-2"
                          value={item.duration || ''}
                          onChange={(e) => updatePrescriptionItem(index, 'duration', e.target.value)}
                        />
                        <button
                          onClick={() => removePrescriptionItem(index)}
                          className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setShowPrescriptionModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleAddPrescription}
                className="px-4 py-2 bg-teal-600 text-white font-medium hover:bg-teal-700 rounded-lg flex items-center gap-2"
              >
                <Save size={16} /> Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clinical;