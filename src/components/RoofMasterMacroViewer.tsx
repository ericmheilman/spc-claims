'use client';

import { useState, useEffect } from 'react';
import { Search, Edit3, Save, X, Plus, Trash2, DollarSign, Package, FileText } from 'lucide-react';

interface MacroItem {
  id: string;
  description: string;
  unit: string;
  unit_price: number;
}

interface RoofMasterMacroViewerProps {
  onClose: () => void;
}

export default function RoofMasterMacroViewer({ onClose }: RoofMasterMacroViewerProps) {
  const [items, setItems] = useState<MacroItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MacroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<MacroItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MacroItem>>({
    description: '',
    unit: '',
    unit_price: 0
  });

  // Fetch macro items on component mount
  useEffect(() => {
    fetchMacroItems();
  }, []);

  // Filter items based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.unit.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchTerm, items]);

  const fetchMacroItems = async () => {
    try {
      const response = await fetch('/api/roof-master-macro');
      const data = await response.json();
      
      if (data.success) {
        setItems(data.items);
        setFilteredItems(data.items);
      } else {
        console.error('Failed to fetch macro items:', data.error);
      }
    } catch (error) {
      console.error('Error fetching macro items:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMacroItems = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/roof-master-macro', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Roof master macro updated successfully!');
      } else {
        alert('Failed to update roof master macro: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving macro items:', error);
      alert('Error saving changes');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: MacroItem) => {
    setEditingItem(item.id);
    setEditValues({ ...item });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValues({});
  };

  const saveEdit = () => {
    if (!editingItem || !editValues.description || !editValues.unit || editValues.unit_price === undefined) {
      alert('Please fill in all fields');
      return;
    }

    const updatedItems = items.map(item =>
      item.id === editingItem ? { ...item, ...editValues } : item
    );
    
    setItems(updatedItems);
    setEditingItem(null);
    setEditValues({});
  };

  const deleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const updatedItems = items.filter(item => item.id !== itemId);
      setItems(updatedItems);
    }
  };

  const addNewItem = () => {
    if (!newItem.description || !newItem.unit || newItem.unit_price === undefined) {
      alert('Please fill in all fields');
      return;
    }

    const item: MacroItem = {
      id: `macro-${Date.now()}`,
      description: newItem.description!,
      unit: newItem.unit!,
      unit_price: newItem.unit_price!
    };

    const updatedItems = [...items, item];
    setItems(updatedItems);
    setNewItem({ description: '', unit: '', unit_price: 0 });
    setShowAddForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium">Loading roof master macro...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-white" />
              <div>
                <h2 className="text-2xl font-bold text-white">Roof Master Macro Editor</h2>
                <p className="text-blue-100 text-sm">View and edit all roof master macro items ({items.length} items)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 font-medium transition-all duration-200 border border-white/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
              <button
                onClick={saveMacroItems}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {/* Add New Item Form */}
            {showAddForm && (
              <div className="p-6 bg-green-50 border-b">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Add New Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={newItem.description || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter description..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={newItem.unit || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="SQ, EA, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newItem.unit_price || 0}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={addNewItem}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      Add Item
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewItem({ description: '', unit: '', unit_price: 0 });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="p-6 flex-1 overflow-hidden flex flex-col">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                value={editValues.description || ''}
                                onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">{item.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {editingItem === item.id ? (
                              <input
                                type="text"
                                value={editValues.unit || ''}
                                onChange={(e) => setEditValues(prev => ({ ...prev, unit: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <div className="text-sm text-gray-900">{item.unit}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {editingItem === item.id ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editValues.unit_price || 0}
                                onChange={(e) => setEditValues(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            ) : (
                              <div className="text-sm font-semibold text-green-600">{formatCurrency(item.unit_price)}</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-2">
                              {editingItem === item.id ? (
                                <>
                                  <button
                                    onClick={saveEdit}
                                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Save changes"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Cancel editing"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Edit item"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteItem(item.id)}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Delete item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? 'Try adjusting your search terms' : 'No items in the roof master macro'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredItems.length} of {items.length} items
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={saveMacroItems}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
