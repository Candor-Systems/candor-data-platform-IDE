import React, { useState } from 'react';
import { Plus, Search, BookOpen, Edit3, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const Glossary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryTerm | null>(null);
  const [formData, setFormData] = useState({
    term: '',
    definition: '',
    category: 'general',
    tags: ''
  });

  // Mock glossary data
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([
    {
      id: '1',
      term: 'Customer ID',
      definition: 'A unique identifier assigned to each customer in the system. Typically numeric and auto-incrementing.',
      category: 'identifiers',
      tags: ['primary-key', 'customer', 'unique'],
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15'
    },
    {
      id: '2',
      term: 'Email Address',
      definition: 'Electronic mail address used for customer communication. Must follow standard email format validation.',
      category: 'contact',
      tags: ['email', 'communication', 'validation'],
      createdAt: '2024-01-16',
      updatedAt: '2024-01-20'
    },
    {
      id: '3',
      term: 'Registration Date',
      definition: 'The date and time when a customer account was first created in the system.',
      category: 'temporal',
      tags: ['date', 'timestamp', 'creation'],
      createdAt: '2024-01-17',
      updatedAt: '2024-01-17'
    },
    {
      id: '4',
      term: 'Phone Number',
      definition: 'Customer contact phone number. May include country code and should support international formats.',
      category: 'contact',
      tags: ['phone', 'contact', 'international'],
      createdAt: '2024-01-18',
      updatedAt: '2024-01-18'
    },
    {
      id: '5',
      term: 'Status Code',
      definition: 'A coded value representing the current state of an entity (e.g., active, inactive, pending).',
      category: 'status',
      tags: ['status', 'state', 'enum'],
      createdAt: '2024-01-19',
      updatedAt: '2024-01-19'
    }
  ]);

  const categories = [
    { value: 'all', label: 'All Categories', count: glossaryTerms.length },
    { value: 'identifiers', label: 'Identifiers', count: glossaryTerms.filter(t => t.category === 'identifiers').length },
    { value: 'contact', label: 'Contact Info', count: glossaryTerms.filter(t => t.category === 'contact').length },
    { value: 'temporal', label: 'Date/Time', count: glossaryTerms.filter(t => t.category === 'temporal').length },
    { value: 'status', label: 'Status Fields', count: glossaryTerms.filter(t => t.category === 'status').length },
    { value: 'general', label: 'General', count: glossaryTerms.filter(t => t.category === 'general').length },
  ];

  const filteredTerms = glossaryTerms.filter(term => {
    const matchesSearch = term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         term.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddTerm = () => {
    if (!formData.term || !formData.definition) {
      toast.error('Please fill in term and definition');
      return;
    }

    const newTerm: GlossaryTerm = {
      id: Date.now().toString(),
      term: formData.term,
      definition: formData.definition,
      category: formData.category,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setGlossaryTerms(prev => [...prev, newTerm]);
    setFormData({ term: '', definition: '', category: 'general', tags: '' });
    setShowAddForm(false);
    toast.success('Term added to glossary');
  };

  const handleEditTerm = (term: GlossaryTerm) => {
    setEditingTerm(term);
    setFormData({
      term: term.term,
      definition: term.definition,
      category: term.category,
      tags: term.tags.join(', ')
    });
    setShowAddForm(true);
  };

  const handleUpdateTerm = () => {
    if (!editingTerm || !formData.term || !formData.definition) {
      toast.error('Please fill in term and definition');
      return;
    }

    setGlossaryTerms(prev => prev.map(term => 
      term.id === editingTerm.id ? {
        ...term,
        term: formData.term,
        definition: formData.definition,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        updatedAt: new Date().toISOString().split('T')[0]
      } : term
    ));

    setFormData({ term: '', definition: '', category: 'general', tags: '' });
    setEditingTerm(null);
    setShowAddForm(false);
    toast.success('Term updated successfully');
  };

  const handleDeleteTerm = (id: string) => {
    if (window.confirm('Are you sure you want to delete this term?')) {
      setGlossaryTerms(prev => prev.filter(term => term.id !== id));
      toast.success('Term deleted from glossary');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BookOpen className="h-8 w-8 text-primary-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Business Glossary</h2>
              <p className="text-gray-600">Centralized definitions for data elements and business terms</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Term</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search terms, definitions, or tags..."
            />
          </div>

          {/* Category Filter */}
          <div className="flex space-x-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.label}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  selectedCategory === category.value
                    ? 'bg-primary-200 text-primary-800'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTerms.map(term => (
          <div key={term.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{term.term}</h3>
                <span className="inline-flex px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
                  {term.category}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEditTerm(term)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTerm(term.id)}
                  className="p-2 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed">{term.definition}</p>

            {term.tags.length > 0 && (
              <div className="flex items-center space-x-2 mb-3">
                <Tag className="h-4 w-4 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {term.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Created: {term.createdAt}</span>
              {term.updatedAt !== term.createdAt && (
                <span>Updated: {term.updatedAt}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No terms found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Start building your business glossary by adding terms'
            }
          </p>
          {!searchTerm && selectedCategory === 'all' && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add First Term</span>
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Term Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTerm ? 'Edit Term' : 'Add New Term'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term *</label>
                <input
                  type="text"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Customer ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Definition *</label>
                <textarea
                  value={formData.definition}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  placeholder="Provide a clear, comprehensive definition..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="general">General</option>
                  <option value="identifiers">Identifiers</option>
                  <option value="contact">Contact Info</option>
                  <option value="temporal">Date/Time</option>
                  <option value="status">Status Fields</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="primary-key, unique, customer (comma-separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTerm(null);
                  setFormData({ term: '', definition: '', category: 'general', tags: '' });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingTerm ? handleUpdateTerm : handleAddTerm}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {editingTerm ? 'Update Term' : 'Add Term'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2025 UltraAI Agent. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Glossary;