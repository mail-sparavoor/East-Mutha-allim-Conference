import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Upload, 
  FolderTree, 
  Building, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  X, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  Download,
  GraduationCap,
  Copy,
  Search
} from 'lucide-react';
import { api } from '../utils/api';

export default function HierarchyManager({ onHierarchyChanged }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Modals: 'division' | 'institution' | 'bulk'
  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState(null);
  const [copiedSample, setCopiedSample] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch full hierarchy tree (Divisions with nested Institutions)
  const loadTree = async () => {
    try {
      setLoading(true);
      const data = await api.getHierarchyTree();
      setTree(data || []);
      // Expand all divisions by default so institutions are immediately visible
      const divMap = {};
      (data || []).forEach(d => { divMap[d.id] = true; });
      setExpandedDivisions(divMap);
    } catch (err) {
      console.error('Failed to load hierarchy tree:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const toggleDivision = (divId) => {
    setExpandedDivisions(prev => ({ ...prev, [divId]: !prev[divId] }));
  };

  const expandAll = () => {
    const divMap = {};
    tree.forEach(d => { divMap[d.id] = true; });
    setExpandedDivisions(divMap);
  };

  const collapseAll = () => {
    setExpandedDivisions({});
  };

  // Add or Edit Division
  const handleSaveDivision = async (e) => {
    e.preventDefault();
    if (!modalData.name?.trim()) return setModalError('Division name is required');
    setModalLoading(true);
    setModalError('');
    try {
      if (modalData.id) {
        await api.updateDivision(modalData.id, { name: modalData.name, code: modalData.code });
      } else {
        await api.createDivision({ name: modalData.name, code: modalData.code });
      }
      setModalType(null);
      await loadTree();
      if (onHierarchyChanged) onHierarchyChanged();
    } catch (err) {
      setModalError(err.message || 'Error saving division');
    } finally {
      setModalLoading(false);
    }
  };

  // Add or Edit Institution
  const handleSaveInstitution = async (e) => {
    e.preventDefault();
    if (!modalData.name?.trim()) return setModalError('Institution name is required');
    if (!modalData.division_id) return setModalError('Parent division is required');

    setModalLoading(true);
    setModalError('');
    try {
      const quotaVal = (modalData.quota !== undefined && modalData.quota !== null && String(modalData.quota).trim() !== '')
        ? parseInt(modalData.quota, 10)
        : null;

      if (modalData.id) {
        await api.updateInstitution(modalData.id, {
          division_id: modalData.division_id,
          name: modalData.name,
          code: modalData.code,
          quota: quotaVal
        });
      } else {
        await api.createInstitution({
          division_id: modalData.division_id,
          name: modalData.name,
          code: modalData.code,
          quota: quotaVal
        });
      }
      setModalType(null);
      await loadTree();
      if (onHierarchyChanged) onHierarchyChanged();
    } catch (err) {
      setModalError(err.message || 'Error saving institution');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete node
  const handleDeleteNode = async (type, id, name) => {
    const warning = type === 'Division' 
      ? `Delete Division "${name}"?\nAll institutions under this division will also be removed.` 
      : `Delete Institution "${name}"?`;
    
    if (!window.confirm(warning)) return;

    try {
      if (type === 'Division') {
        await api.deleteDivision(id);
      } else if (type === 'Institution') {
        await api.deleteInstitution(id);
      }
      await loadTree();
      if (onHierarchyChanged) onHierarchyChanged();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  // Handle CSV File upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setBulkText(text);
      }
    };
    reader.readAsText(file);
  };

  // Bulk Import Institutions under Divisions
  const handleBulkImport = async () => {
    if (!bulkText.trim()) {
      setModalError('Please enter or paste CSV data, or select a file.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    try {
      const res = await api.bulkImportInstitutions({ text: bulkText });
      setBulkStatus(res.message || 'Import successful!');
      setTimeout(() => {
        setModalType(null);
        setBulkStatus(null);
        setBulkText('');
        loadTree();
        if (onHierarchyChanged) onHierarchyChanged();
      }, 1400);
    } catch (err) {
      setModalError(err.message || 'Failed to process bulk import');
    } finally {
      setModalLoading(false);
    }
  };

  // Download sample CSV template
  const downloadSampleCsv = () => {
    const csv = "Division,Institution,Code,Quota\r\nPulikkal,Markazu Ssaqafathi Ssunniyya (Pulikkal Campus),PLK-01,15\r\nPulikkal,Aikkarappadi Mahallu Dars,PLK-02,10\r\nKondotty,EMEA Arabic College & Dars,KON-01,20\r\nKondotty,Kondotty Qubba Mahallu Dars,KON-02,8\r\nMalappuram,Ma'din Academy Malappuram,MLP-01,25\r\nWandoor,Wandoor Central Mahallu Dars,WND-01,10\r\nAreekode,Areekode Majlis Dawa College,ARK-01,15\r\nManjeri West,Manjeri Central Juma Masjid Dars,MJW-01,12\r\nManjeri East,Karakunnu Mahallu Dars,MJE-01,10\r\nNilambur,Nilambur Town Juma Masjid Dars,NLR-01,10\r\nEdavannappra,Edavannappra Mahallu Dars,EDV-01,10\r\nEdakkara,Edakkara Central Mahallu Dars,EDK-01,10\r\nKolathur,Kolathur Mahallu Dars,KLT-01,10\r\nPerinthalmanna,Jamia Nooriya Arabic College Pattikkad,PTM-01,30\r\n";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'division_institutions_template.csv';
    a.click();
  };

  const copySampleFormat = () => {
    const sample = `Division,Institution,Code,Quota\nPulikkal,Markazu Ssaqafathi Ssunniyya,PLK-01,15\nPulikkal,Aikkarappadi Mahallu Dars,PLK-02,10\nKondotty,EMEA Arabic College & Dars,KON-01,20\nMalappuram,Ma'din Academy,MLP-01,25`;
    navigator.clipboard.writeText(sample);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  // Filter tree based on search
  const filteredTree = tree.filter(div => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const divMatch = div.name.toLowerCase().includes(term) || (div.code && div.code.toLowerCase().includes(term));
    const instMatch = (div.institutions || []).some(i => i.name.toLowerCase().includes(term) || (i.code && i.code.toLowerCase().includes(term)));
    return divMatch || instMatch;
  });

  const totalDivisions = tree.length;
  const totalInstitutions = tree.reduce((acc, div) => acc + (div.institutions?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Action Header Banner */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-600" />
            <span>Hierarchy Management</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure regional Divisions and the Academic Institutions falling under each division.
          </p>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {totalDivisions} Divisions
            </span>
            <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {totalInstitutions} Institutions Configured
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              setModalType('division');
              setModalData({ name: '', code: '' });
              setModalError('');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Division</span>
          </button>

          <button
            onClick={() => {
              setModalType('bulk');
              setBulkText('');
              setModalError('');
              setBulkStatus(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Bulk Upload (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter and Accordion controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search divisions or institutions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            onClick={expandAll}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded-lg transition"
          >
            Expand All
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded-lg transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Hierarchy Tree List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            <span>Loading divisions &amp; institutions...</span>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            {searchTerm ? 'No divisions or institutions match your search query.' : 'No divisions configured yet. Click "Add Division" or "Bulk Upload" above.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTree.map((div) => {
              const institutionsList = div.institutions || [];
              const instCount = institutionsList.length;
              const isExpanded = !!expandedDivisions[div.id];

              return (
                <div key={div.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40 transition">
                  {/* Division Header Row */}
                  <div className="p-3.5 bg-slate-100/80 flex items-center justify-between border-b border-slate-200/60 gap-2">
                    <div 
                      onClick={() => toggleDivision(div.id)}
                      className="flex items-center gap-2.5 select-none flex-1 cursor-pointer"
                    >
                      <button className="text-slate-500 hover:text-slate-800 p-0.5">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <Building className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span className="font-heading font-extrabold text-sm text-slate-900">
                        {div.name}
                      </span>
                      {div.code && (
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                          {div.code}
                        </span>
                      )}
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium ml-1">
                        {instCount} {instCount === 1 ? 'institution' : 'institutions'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Add Institution under this Division */}
                      <button
                        onClick={() => {
                          setModalType('institution');
                          setModalData({ division_id: div.id, division_name: div.name, name: '', code: '', quota: '' });
                          setModalError('');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                        title="Add Institution under this Division"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Add Institution</span>
                      </button>

                      {/* Edit Division */}
                      <button
                        onClick={() => {
                          setModalType('division');
                          setModalData({ id: div.id, name: div.name, code: div.code });
                          setModalError('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition cursor-pointer"
                        title="Edit Division"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Division */}
                      <button
                        onClick={() => handleDeleteNode('Division', div.id, div.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition cursor-pointer"
                        title="Delete Division"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Institutions under Division */}
                  {isExpanded && (
                    <div className="p-3 sm:p-4 pl-6 sm:pl-10 space-y-2 bg-white/70">
                      {instCount === 0 ? (
                        <div className="py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 flex items-center justify-between">
                          <span>No institutions configured under {div.name} yet.</span>
                          <button
                            onClick={() => {
                              setModalType('institution');
                              setModalData({ division_id: div.id, division_name: div.name, name: '', code: '', quota: '' });
                              setModalError('');
                            }}
                            className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add one now
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {institutionsList.map((inst) => (
                            <div 
                              key={inst.id} 
                              className={`bg-white rounded-xl border p-2.5 shadow-2xs flex items-center justify-between gap-2 transition ${
                                inst.is_full ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <GraduationCap className={`w-4 h-4 flex-shrink-0 ${inst.is_full ? 'text-rose-500' : 'text-amber-600'}`} />
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <p className="text-xs font-semibold text-slate-800 truncate" title={inst.name}>
                                      {inst.name}
                                    </p>
                                    {inst.code && (
                                      <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">
                                        ({inst.code})
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {inst.quota && inst.quota > 0 ? (
                                      inst.is_full ? (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                                          Quota Full: {inst.registered_count}/{inst.quota}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                          Quota: {inst.registered_count}/{inst.quota} ({inst.remaining} left)
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                        {inst.registered_count || 0} registered • No limit
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    setModalType('institution');
                                    setModalData({
                                      id: inst.id,
                                      division_id: div.id,
                                      division_name: div.name,
                                      name: inst.name,
                                      code: inst.code,
                                      quota: inst.quota ?? ''
                                    });
                                    setModalError('');
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition cursor-pointer"
                                  title="Edit Institution & Quota"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteNode('Institution', inst.id, inst.name)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition cursor-pointer"
                                  title="Delete Institution"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Division Add/Edit Modal */}
      {modalType === 'division' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>{modalData.id ? 'Edit Division' : 'Add New Division'}</span>
            </h3>
            {modalError && <p className="text-xs text-rose-600 mb-3 font-medium">{modalError}</p>}
            <form onSubmit={handleSaveDivision} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Division Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pulikkal"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Division Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PLK"
                  maxLength={5}
                  value={modalData.code || ''}
                  onChange={(e) => setModalData({ ...modalData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono uppercase"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition cursor-pointer disabled:opacity-75"
                >
                  {modalLoading ? 'Saving...' : 'Save Division'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Institution Add/Edit Modal */}
      {modalType === 'institution' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-1 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>{modalData.id ? 'Edit Institution' : 'Add Institution'}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Assign to Division: <strong>{modalData.division_name || 'Selected Division'}</strong>
            </p>
            {modalError && <p className="text-xs text-rose-600 mb-3 font-medium">{modalError}</p>}
            <form onSubmit={handleSaveInstitution} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Parent Division <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalData.division_id || ''}
                  onChange={(e) => {
                    const selDiv = tree.find(d => String(d.id) === String(e.target.value));
                    setModalData({
                      ...modalData,
                      division_id: e.target.value,
                      division_name: selDiv ? selDiv.name : ''
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- Select Division --</option>
                  {tree.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Institution / Dars Name (English only) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Markazu Ssaqafathi Ssunniyya, Pulikkal Campus"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PLK-01"
                  maxLength={10}
                  value={modalData.code || ''}
                  onChange={(e) => setModalData({ ...modalData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Registration Limit / Quota</span>
                  <span className="text-[10px] font-normal text-slate-400">Leave blank for unlimited</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 10 (Max allowed registrations)"
                  value={modalData.quota ?? ''}
                  onChange={(e) => setModalData({ ...modalData, quota: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  When this limit is reached, public registration for this institution will be blocked.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition cursor-pointer disabled:opacity-75"
                >
                  {modalLoading ? 'Saving...' : 'Save Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {modalType === 'bulk' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Bulk Upload Divisions &amp; Institutions</span>
              </h3>
              <button 
                onClick={() => setModalType(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-2">
              <p>
                Upload a <strong>.CSV</strong> or text file, or paste your list below formatted as:
                <br />
                <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-emerald-800">
                  Division, Institution, Code(optional), Quota(optional)
                </code>
              </p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download CSV Template
                </button>

                <button
                  type="button"
                  onClick={copySampleFormat}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> {copiedSample ? 'Copied to Clipboard!' : 'Copy Sample Format'}
                </button>

                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Choose File (.csv, .txt)</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {modalError && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-medium border border-rose-200">
                {modalError}
              </div>
            )}
            {bulkStatus && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{bulkStatus}</span>
              </div>
            )}

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CSV Data (Paste or edit below):
              </label>
              <textarea
                rows={9}
                placeholder="Pulikkal, Markazu Ssaqafathi Ssunniyya, PLK-01, 15&#10;Pulikkal, Aikkarappadi Mahallu Dars, PLK-02, 10&#10;Kondotty, EMEA Arabic College & Dars, KON-01, 20&#10;Malappuram, Ma'din Academy, MLP-01, 25"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Divisions not yet created will be automatically created.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={modalLoading || !bulkText.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Import Records</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
