import React, { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';
import { api } from '../utils/api';

export default function HierarchyManager({ onHierarchyChanged }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [expandedSectors, setExpandedSectors] = useState({});

  // Modals
  const [modalType, setModalType] = useState(null); // 'division' | 'sector' | 'unit' | 'bulk'
  const [modalData, setModalData] = useState({});
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Bulk import state
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState(null);

  // Fetch full hierarchy tree
  const loadTree = async () => {
    try {
      setLoading(true);
      const data = await api.getHierarchyTree();
      setTree(data);
      // Expand all divisions by default for quick overview
      const divMap = {};
      data.forEach(d => { divMap[d.id] = true; });
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

  const toggleSector = (secId) => {
    setExpandedSectors(prev => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Add Division
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
      loadTree();
      if (onHierarchyChanged) onHierarchyChanged();
    } catch (err) {
      setModalError(err.message || 'Error saving division');
    } finally {
      setModalLoading(false);
    }
  };

  // Add Sector
  const handleSaveSector = async (e) => {
    e.preventDefault();
    if (!modalData.name?.trim()) return setModalError('Sector name is required');
    if (!modalData.division_id) return setModalError('Parent division is required');
    setModalLoading(true);
    setModalError('');
    try {
      if (modalData.id) {
        await api.updateSector(modalData.id, { name: modalData.name, code: modalData.code });
      } else {
        await api.createSector({ division_id: modalData.division_id, name: modalData.name, code: modalData.code });
      }
      setModalType(null);
      loadTree();
      if (onHierarchyChanged) onHierarchyChanged();
    } catch (err) {
      setModalError(err.message || 'Error saving sector');
    } finally {
      setModalLoading(false);
    }
  };

  // Add Unit
  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!modalData.name?.trim()) return setModalError('Unit name is required');
    if (!modalData.sector_id) return setModalError('Parent sector is required');
    setModalLoading(true);
    setModalError('');
    try {
      if (modalData.id) {
        await api.updateUnit(modalData.id, { name: modalData.name, code: modalData.code });
      } else {
        await api.createUnit({ sector_id: modalData.sector_id, name: modalData.name, code: modalData.code });
      }
      setModalType(null);
      loadTree();
      if (onHierarchyChanged) onHierarchyChanged();
    } catch (err) {
      setModalError(err.message || 'Error saving unit');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete node
  const handleDeleteNode = async (type, id, name) => {
    if (!window.confirm(`Delete ${type} "${name}"? Any sub-sectors or units under it may also be deleted.`)) return;
    try {
      if (type === 'Division') await api.deleteDivision(id);
      if (type === 'Sector') await api.deleteSector(id);
      if (type === 'Unit') await api.deleteUnit(id);
      loadTree();
      if (onHierarchyChanged) onHierarchyChanged();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  // Bulk Import
  const handleBulkImport = async () => {
    if (!bulkText.trim()) {
      setModalError('Please paste CSV or JSON data.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    try {
      let rows = [];
      const trimmed = bulkText.trim();
      if (trimmed.startsWith('[')) {
        rows = JSON.parse(trimmed);
      } else {
        // Parse CSV
        const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0);
        const header = lines[0].toLowerCase();
        const startIndex = header.includes('division') ? 1 : 0;
        for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 1) {
            rows.push({
              division: parts[0],
              sector: parts[1] || '',
              unit: parts[2] || ''
            });
          }
        }
      }

      const res = await api.bulkImportHierarchy(rows);
      setBulkStatus(res.message);
      setTimeout(() => {
        setModalType(null);
        setBulkStatus(null);
        setBulkText('');
        loadTree();
        if (onHierarchyChanged) onHierarchyChanged();
      }, 1500);
    } catch (err) {
      setModalError(err.message || 'Failed to process bulk import');
    } finally {
      setModalLoading(false);
    }
  };

  // Download sample CSV template
  const downloadSampleCsv = () => {
    const csv = "Division,Sector,Unit\r\nParavoor East,Kottuvally Sector,Kaitharam\r\nParavoor East,Kottuvally Sector,Koonammavu\r\nParavoor East,Ezhikkara Sector,Chathanad\r\nAluva East,Edathala Sector,Pookkattupady\r\n";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hierarchy_template.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-bold text-lg text-slate-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-emerald-600" />
            <span>Division Management</span>
          </h3>
          <p className="text-xs text-slate-500">
            Configure and manage conference regional divisions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setModalType('division');
              setModalData({ name: '', code: '' });
              setModalError('');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Bulk Import (CSV)</span>
          </button>
        </div>
      </div>

      {/* Hierarchy Tree List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
            <span>Loading divisions...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            No divisions configured yet. Click 'Add Division' or 'Bulk Import' above.
          </div>
        ) : (
          <div className="space-y-3">
            {tree.map((div) => {
              const sectorsCount = div.sectors?.length || 0;
              const hasSectors = sectorsCount > 0;
              const isDivExpanded = hasSectors && !!expandedDivisions[div.id];
              const unitsCount = div.sectors?.reduce((acc, s) => acc + (s.units?.length || 0), 0) || 0;

              return (
                <div key={div.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40">
                  {/* Division Header Row */}
                  <div className="p-3.5 bg-slate-100/70 flex items-center justify-between border-b border-slate-200/60">
                    <div 
                      onClick={() => hasSectors && toggleDivision(div.id)}
                      className={`flex items-center gap-2 select-none flex-1 ${hasSectors ? 'cursor-pointer' : ''}`}
                    >
                      {hasSectors && (
                        <button className="text-slate-500 hover:text-slate-800">
                          {isDivExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                      <Building className="w-4 h-4 text-emerald-700" />
                      <span className="font-heading font-extrabold text-sm text-slate-900">
                        {div.name}
                      </span>
                      {div.code && (
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-bold">
                          {div.code}
                        </span>
                      )}
                      {hasSectors && (
                        <span className="text-xs text-slate-400 font-medium">
                          ({sectorsCount} sectors &bull; {unitsCount} units)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Edit Division */}
                      <button
                        onClick={() => {
                          setModalType('division');
                          setModalData({ id: div.id, name: div.name, code: div.code });
                          setModalError('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white"
                        title="Edit Division"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Division */}
                      <button
                        onClick={() => handleDeleteNode('Division', div.id, div.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                        title="Delete Division"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sectors under Division (only if any exist) */}
                  {hasSectors && isDivExpanded && (
                    <div className="p-3 pl-8 space-y-2">
                      {div.sectors?.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-1">No sectors in this division yet.</p>
                      ) : (
                        div.sectors.map((sec) => {
                          const isSecExpanded = !!expandedSectors[sec.id];
                          const unitsInSec = sec.units?.length || 0;

                          return (
                            <div key={sec.id} className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs space-y-2">
                              {/* Sector Header */}
                              <div className="flex items-center justify-between">
                                <div 
                                  onClick={() => toggleSector(sec.id)}
                                  className="flex items-center gap-2 cursor-pointer select-none flex-1"
                                >
                                  <button className="text-slate-400 hover:text-slate-700">
                                    {isSecExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                  <span className="font-bold text-xs text-slate-800">{sec.name}</span>
                                  <span className="text-[11px] text-slate-400 font-medium">({unitsInSec} units)</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Add Unit under this sector */}
                                  <button
                                    onClick={() => {
                                      setModalType('unit');
                                      setModalData({ sector_id: sec.id, sector_name: sec.name, name: '', code: '' });
                                      setModalError('');
                                    }}
                                    className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Unit
                                  </button>

                                  <button
                                    onClick={() => {
                                      setModalType('sector');
                                      setModalData({ id: sec.id, division_id: div.id, name: sec.name, code: sec.code });
                                      setModalError('');
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                    title="Edit Sector"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteNode('Sector', sec.id, sec.name)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                    title="Delete Sector"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Units under Sector */}
                              {isSecExpanded && (
                                <div className="pl-6 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                                  {sec.units?.length === 0 ? (
                                    <span className="text-[11px] text-slate-400 italic">No units registered</span>
                                  ) : (
                                    sec.units.map((unit) => (
                                      <div 
                                        key={unit.id}
                                        className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-medium transition"
                                      >
                                        <span>{unit.name}</span>
                                        <button
                                          onClick={() => handleDeleteNode('Unit', unit.id, unit.name)}
                                          className="text-slate-400 hover:text-rose-600 transition"
                                          title="Delete Unit"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
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
            <h3 className="font-heading font-bold text-base text-slate-900 mb-3">
              {modalData.id ? 'Edit Division' : 'Add New Division'}
            </h3>
            {modalError && <p className="text-xs text-rose-600 mb-3">{modalError}</p>}
            <form onSubmit={handleSaveDivision} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Division Name</label>
                <input
                  type="text"
                  placeholder="e.g. Paravoor East"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Division Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PVE"
                  maxLength={5}
                  value={modalData.code || ''}
                  onChange={(e) => setModalData({ ...modalData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono uppercase"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  {modalLoading ? 'Saving...' : 'Save Division'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sector Add/Edit Modal */}
      {modalType === 'sector' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-1">
              {modalData.id ? 'Edit Sector' : 'Add Sector'}
            </h3>
            <p className="text-xs text-slate-500 mb-3">Parent Division: <strong>{modalData.division_name || 'Selected Division'}</strong></p>
            {modalError && <p className="text-xs text-rose-600 mb-3">{modalError}</p>}
            <form onSubmit={handleSaveSector} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sector Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kottuvally Sector"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sector Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. KOT"
                  maxLength={5}
                  value={modalData.code || ''}
                  onChange={(e) => setModalData({ ...modalData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono uppercase"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  {modalLoading ? 'Saving...' : 'Save Sector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Add/Edit Modal */}
      {modalType === 'unit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-1">
              {modalData.id ? 'Edit Unit' : 'Add Unit'}
            </h3>
            <p className="text-xs text-slate-500 mb-3">Parent Sector: <strong>{modalData.sector_name || 'Selected Sector'}</strong></p>
            {modalError && <p className="text-xs text-rose-600 mb-3">{modalError}</p>}
            <form onSubmit={handleSaveUnit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unit Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kaitharam"
                  value={modalData.name || ''}
                  onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  {modalLoading ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {modalType === 'bulk' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Bulk Upload Organizational Hierarchy</span>
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500 space-y-2">
              <p>
                Paste CSV data (one entry per line formatted as <code>Division, Sector, Unit</code>) or JSON array:
              </p>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
              >
                <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
              </button>
            </div>

            {modalError && (
              <div className="mt-2 p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs">{modalError}</div>
            )}
            {bulkStatus && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">{bulkStatus}</div>
            )}

            <div className="mt-3">
              <textarea
                rows={8}
                placeholder="Paravoor East, Kottuvally Sector, Kaitharam&#10;Paravoor East, Kottuvally Sector, Koonammavu&#10;Paravoor East, Ezhikkara Sector, Chathanad"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={modalLoading}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition flex items-center gap-1.5 disabled:opacity-75"
              >
                {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Import Hierarchy Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
