'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SpaceFolderIcon } from '@/components/SpaceFolderIcon';
import { BlackHoleBackground } from '@/components/BlackHoleBackground';
import { 
  File, Image as ImageIcon, Music, Video, 
  MoreVertical, Plus, ArrowLeft, Upload, FileText, 
  Trash2, Edit2, X, Download, Smartphone, Search,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Type, Settings2, Save
} from 'lucide-react';

// --- Types ---
type NodeType = 'folder' | 'file' | 'image' | 'video' | 'audio';

interface FileNode {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  size?: number; // em bytes
  updatedAt: number;
  content?: string; // Para arquivos de texto
  dataUrl?: string; // Para imagens/arquivos base64
}

// --- Utils ---
const generateId = () => Math.random().toString(36).substring(2, 9);

const formatBytes = (bytes?: number, decimals = 2) => {
  if (bytes === undefined || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
};

const getFileType = (mimeType: string): NodeType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'file';
};

const getIconForType = (type: NodeType, className?: string) => {
  const props = { className: className || "w-6 h-6 text-gray-400" };
  switch (type) {
    case 'folder': return <SpaceFolderIcon className={props.className.replace('text-gray-400', '')} />;
    case 'image': return <ImageIcon {...props} className={props.className.replace('text-gray-400', 'text-blue-400')} />;
    case 'video': return <Video {...props} className={props.className.replace('text-gray-400', 'text-purple-400')} />;
    case 'audio': return <Music {...props} className={props.className.replace('text-gray-400', 'text-red-400')} />;
    case 'file':
    default: return <FileText {...props} className={props.className.replace('text-gray-400', 'text-gray-400')} />;
  }
};

// --- Initial Mock Data ---
const initialNodes: FileNode[] = [
  { id: '1', name: 'Documentos', type: 'folder', parentId: 'root', updatedAt: Date.now() - 100000 },
  { id: '2', name: 'Imagens', type: 'folder', parentId: 'root', updatedAt: Date.now() - 500000 },
  { id: '3', name: 'Downloads', type: 'folder', parentId: 'root', updatedAt: Date.now() - 200000 },
  { id: '4', name: 'Anotações.txt', type: 'file', parentId: '1', size: 1024, updatedAt: Date.now(), content: 'Bem-vindo ao seu gerenciador de arquivos web!\n\nVocê pode criar novas pastas, arquivos de texto, renomear e deletar itens.' }
];

export default function App() {
  const [nodes, setNodes] = useState<FileNode[]>(initialNodes);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [isLoaded, setIsLoaded] = useState(false);
  
  // UI States
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [contextMenuSettings, setContextMenuSettings] = useState<{ id: string, x: number, y: number } | null>(null);
  const [modalState, setModalState] = useState<{
    type: 'createFolder' | 'createTextFile' | 'rename' | 'viewFile' | 'viewImage' | 'deleteConfirm' | null;
    payload?: any;
  }>({ type: null });

  // Text Viewer Settings
  const [textFontFamily, setTextFontFamily] = useState<'font-mono' | 'font-sans' | 'font-serif'>('font-mono');
  const [textFontSize, setTextFontSize] = useState<'text-xs' | 'text-sm' | 'text-base' | 'text-lg'>('text-sm');
  const [showTextSettings, setShowTextSettings] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextContent, setEditingTextContent] = useState('');

  // Image Viewer Settings
  const [imageZoom, setImageZoom] = useState(1);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Index ref
  const fileIndexRef = useRef<Map<string, { nameLower: string; ancestors: Set<string>; node: FileNode }>>(new Map());

  const buildIndex = (nodesList: FileNode[]) => {
      const index = new Map<string, { nameLower: string; ancestors: Set<string>; node: FileNode }>();
      const ancestorsCache = new Map<string, Set<string>>();
      
      const resolveAncestors = (nodeId: string, parentId: string | null): Set<string> => {
        if (ancestorsCache.has(nodeId)) return ancestorsCache.get(nodeId)!;
        if (!parentId || parentId === 'root') {
          const set = new Set(['root']);
          ancestorsCache.set(nodeId, set);
          return set;
        }
        const parentNode = nodesList.find(n => n.id === parentId);
        let parentAncestors: Set<string>;
        if (parentNode) {
          parentAncestors = new Set(resolveAncestors(parentNode.id, parentNode.parentId));
          parentAncestors.add(parentId);
        } else {
          parentAncestors = new Set(['root']);
        }
        ancestorsCache.set(nodeId, parentAncestors);
        return parentAncestors;
      };

      nodesList.forEach(node => {
         index.set(node.id, {
           node,
           nameLower: node.name.toLowerCase(),
           ancestors: resolveAncestors(node.id, node.parentId)
         });
      });
      fileIndexRef.current = index;
  };

  const addToIndex = (node: FileNode) => {
    const parentAncestors = node.parentId && fileIndexRef.current.has(node.parentId) 
      ? new Set(fileIndexRef.current.get(node.parentId)!.ancestors) 
      : new Set(['root']);
    if (node.parentId && node.parentId !== 'root') {
      parentAncestors.add(node.parentId);
    }
    fileIndexRef.current.set(node.id, {
      node,
      nameLower: node.name.toLowerCase(),
      ancestors: parentAncestors
    });
  };

  const removeFromIndex = (id: string, cascade = true) => {
    fileIndexRef.current.delete(id);
    if (cascade) {
      for (const [key, value] of Array.from(fileIndexRef.current.entries())) {
        if (value.ancestors.has(id)) {
          fileIndexRef.current.delete(key);
        }
      }
    }
  };

  const updateNodeInIndex = (id: string, updatedNode: FileNode) => {
    const entry = fileIndexRef.current.get(id);
    if (entry) {
      entry.nameLower = updatedNode.name.toLowerCase();
      entry.node = updatedNode;
    }
  };

  // Load from LocalStorage
  useEffect(() => {
    let loadedNodes = initialNodes;
    const saved = localStorage.getItem('android-vfs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) loadedNodes = parsed;
      } catch (e) {
        console.error('Failed to parse VFS from local storage');
      }
    }
    buildIndex(loadedNodes);
    Promise.resolve().then(() => {
      setNodes(loadedNodes);
      setIsLoaded(true);
    });
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (isLoaded) {
      // Don't save large dataUrls to prevent quota exceeded, just keep metadata for demo
      const toSave = nodes.map(n => ({...n, dataUrl: n.dataUrl?.slice(0, 100) === n.dataUrl ? n.dataUrl : undefined }));
      localStorage.setItem('android-vfs', JSON.stringify(toSave));
    }
  }, [nodes, isLoaded]);

  // Derived state
  const folderNodes = useMemo(() => {
    return nodes
      .filter(n => n.parentId === currentFolderId)
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (b.type === 'folder' && a.type !== 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [nodes, currentFolderId]);

  const [searchResults, setSearchResults] = useState<FileNode[]>([]);
  useEffect(() => {
    if (searchQuery.trim() && isLoaded) {
      const results: FileNode[] = [];
      const searchStr = searchQuery.toLowerCase();
      
      for (const entry of Array.from(fileIndexRef.current.values())) {
         const isDescendant = entry.ancestors.has(currentFolderId);
         if (isDescendant && entry.nameLower.includes(searchStr)) {
            results.push(entry.node);
         }
      }
      
      results.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (b.type === 'folder' && a.type !== 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      Promise.resolve().then(() => setSearchResults(results));
    }
  }, [searchQuery, currentFolderId, nodes, isLoaded]);

  const currentNodes = searchQuery.trim() ? searchResults : folderNodes;

  const path = useMemo(() => {
    const breadcrumbs = [];
    let current = currentFolderId;
    while (current !== 'root') {
      const folder = nodes.find(n => n.id === current);
      if (folder) {
        breadcrumbs.unshift(folder);
        current = folder.parentId || 'root';
      } else {
        break;
      }
    }
    return breadcrumbs;
  }, [nodes, currentFolderId]);

  const currentFolderName = currentFolderId === 'root' 
    ? 'Armazenamento Interno' 
    : path[path.length - 1]?.name || 'Pasta Desconhecida';

  const currentFolderImages = useMemo(() => {
    return currentNodes.filter(n => n.type === 'image');
  }, [currentNodes]);

  const handleNextImage = () => {
    if (modalState.type !== 'viewImage' || !modalState.payload) return;
    const currentIndex = currentFolderImages.findIndex(img => img.id === modalState.payload.id);
    if (currentIndex >= 0 && currentIndex < currentFolderImages.length - 1) {
      setModalState({ type: 'viewImage', payload: currentFolderImages[currentIndex + 1] });
      setImageZoom(1);
    }
  };

  const handlePrevImage = () => {
    if (modalState.type !== 'viewImage' || !modalState.payload) return;
    const currentIndex = currentFolderImages.findIndex(img => img.id === modalState.payload.id);
    if (currentIndex > 0) {
      setModalState({ type: 'viewImage', payload: currentFolderImages[currentIndex - 1] });
      setImageZoom(1);
    }
  };

  // --- Actions ---
  const handleNavigateUp = () => {
    if (currentFolderId !== 'root') {
      const parent = path.length > 1 ? path[path.length - 2].id : 'root';
      setCurrentFolderId(parent);
    }
  };

  const handleNodeClick = (node: FileNode) => {
    if (node.type === 'folder') {
      setCurrentFolderId(node.id);
    } else if (node.type === 'file' || node.type === 'audio' || node.type === 'video') {
      setModalState({ type: 'viewFile', payload: node });
      if (node.type === 'file') {
        setIsEditingText(false);
        setEditingTextContent(node.content || '');
      }
    } else if (node.type === 'image') {
      setModalState({ type: 'viewImage', payload: node });
    }
  };

  const handleDelete = (id: string) => {
    // Recursive delete for folders
    const getChildrenIds = (parentId: string): string[] => {
      const children = nodes.filter(n => n.parentId === parentId);
      return children.reduce((acc, child) => [...acc, child.id, ...getChildrenIds(child.id)], [] as string[]);
    };

    const idsToDelete = [id, ...getChildrenIds(id)];
    removeFromIndex(id);
    setNodes(prev => prev.filter(n => !idsToDelete.includes(n.id)));
    setContextMenuSettings(null);
  };

  const handleCreateFolder = (name: string) => {
    if (!name.trim()) return;
    const newNode: FileNode = { id: generateId(), name, type: 'folder', parentId: currentFolderId, updatedAt: Date.now() };
    addToIndex(newNode);
    setNodes(prev => [...prev, newNode]);
    setModalState({ type: null });
  };

  const handleCreateTextFile = (name: string, content: string) => {
    if (!name.trim()) return;
    const filename = name.endsWith('.txt') ? name : `${name}.txt`;
    const newNode: FileNode = { 
      id: generateId(), 
      name: filename, 
      type: 'file', 
      parentId: currentFolderId, 
      size: new Blob([content]).size,
      updatedAt: Date.now(),
      content 
    };
    addToIndex(newNode);
    setNodes(prev => [...prev, newNode]);
    setModalState({ type: null });
  };

  const handleRename = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setNodes(prev => prev.map(n => {
      if (n.id === id) {
        const updated = { ...n, name: newName, updatedAt: Date.now() };
        updateNodeInIndex(id, updated);
        return updated;
      }
      return n;
    }));
    setModalState({ type: null });
    setContextMenuSettings(null);
  };

  const handleSaveTextFile = (id: string, newContent: string) => {
    setNodes(prev => prev.map(n => {
      if (n.id === id) {
        const updated = { ...n, content: newContent, size: new Blob([newContent]).size, updatedAt: Date.now() };
        updateNodeInIndex(id, updated);
        return updated;
      }
      return n;
    }));
  };

  const handleDownloadFile = (node: FileNode) => {
    if (node.content) {
      const blob = new Blob([node.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (node.dataUrl) {
      const a = document.createElement('a');
      a.href = node.dataUrl;
      a.download = node.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
        reader.onload = (event) => {
          const newNode: FileNode = {
            id: generateId(),
            name: file.name,
            type: 'file',
            parentId: currentFolderId,
            size: file.size,
            updatedAt: Date.now(),
            content: event.target?.result as string
          };
          addToIndex(newNode);
          setNodes(prev => [...prev, newNode]);
        };
        reader.readAsText(file);
      } else {
        reader.onload = (event) => {
          const newNode: FileNode = {
            id: generateId(),
            name: file.name,
            type: getFileType(file.type),
            parentId: currentFolderId,
            size: file.size,
            updatedAt: Date.now(),
            dataUrl: event.target?.result as string
          };
          addToIndex(newNode);
          setNodes(prev => [...prev, newNode]);
        };
        reader.readAsDataURL(file);
      }
    });
    setIsFabOpen(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenuSettings(null);
    if (contextMenuSettings) {
      window.addEventListener('click', handleClick);
    }
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenuSettings]);

  if (!isLoaded) return <div className="h-screen bg-slate-950" />;

  return (
    <div className="h-screen w-full bg-slate-950/80 flex flex-col font-sans overflow-hidden select-none relative text-white">
      <BlackHoleBackground />
      {/* --- Top App Bar (Android Style) --- */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/10 text-white shadow-xl z-10 flex-shrink-0">
        {/* Status bar simulation */}
        <div className="h-6 w-full flex justify-between items-center px-4 text-xs font-medium text-white/70 hidden sm:flex">
          <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          <div className="flex items-center gap-1">
             <Smartphone className="w-3 h-3" />
             <span>100%</span>
          </div>
        </div>
        
        <div className="h-14 px-4 flex items-center gap-4">
          <AnimatePresence mode="popLayout">
            {!isSearching && currentFolderId !== 'root' && (
              <motion.button 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={handleNavigateUp}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
            )}
            {isSearching && (
              <motion.button 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => { setIsSearching(false); setSearchQuery(''); }}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </motion.button>
            )}
          </AnimatePresence>
          <div className="flex-1 min-w-0">
            {isSearching ? (
              <motion.input
                initial={{ opacity: 0, scaleX: 0.9 }}
                animate={{ opacity: 1, scaleX: 1 }}
                autoFocus
                type="text"
                placeholder="Pesquisar em arquivos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 text-white placeholder-white/50 px-4 py-1.5 rounded-full outline-none focus:bg-slate-700/80 transition-colors text-sm border border-white/10 focus:border-blue-500/50"
              />
            ) : (
              <motion.h1 
                key={currentFolderId}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-medium truncate"
              >
                {currentFolderName}
              </motion.h1>
            )}
          </div>
          {!isSearching && (
            <button 
              onClick={() => setIsSearching(true)} 
              className="p-2 -mr-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              <Search className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </header>

      {/* --- File List --- */}
      <main className="flex-1 overflow-y-auto pb-24 relative" onContextMenu={(e) => e.preventDefault()}>
        {currentNodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <SpaceFolderIcon className="w-16 h-16 mb-4 text-gray-500/50" />
            <p>{searchQuery.trim() ? 'Nenhum resultado encontrado' : 'Esta pasta está vazia'}</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {currentNodes.map(node => (
              <li key={node.id} className="relative">
                <button
                  onClick={() => handleNodeClick(node)}
                  className="w-full flex items-center p-4 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <div className="mr-4 flex-shrink-0 drop-shadow-md">
                    {getIconForType(node.type, "w-10 h-10")}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h2 className="text-gray-100 font-medium truncate text-[15px]">{node.name}</h2>
                    <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-2">
                       <span>{formatDate(node.updatedAt)}</span>
                       {node.type !== 'folder' && <span>• {formatBytes(node.size)}</span>}
                    </p>
                  </div>
                  
                  {/* Context Menu Button */}
                  <div 
                    className="p-2 -mr-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors text-gray-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenuSettings({ id: node.id, x: rect.right - 150, y: rect.bottom });
                    }}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* --- Context Menu Dropdown --- */}
      <AnimatePresence>
        {contextMenuSettings && (
          <>
            {/* Backdrop for mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/5" 
            />
            {/* Menu */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              style={{
                top: Math.min(contextMenuSettings.y, window.innerHeight - 150),
                left: Math.max(10, Math.min(contextMenuSettings.x, window.innerWidth - 160))
              }}
              className="fixed z-50 w-40 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-md shadow-2xl overflow-hidden text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setModalState({ type: 'rename', payload: nodes.find(n => n.id === contextMenuSettings.id) })}
                className="w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 flex items-center gap-3 text-sm transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Renomear
              </button>
              <button 
                onClick={() => {
                  setContextMenuSettings(null);
                  setModalState({ type: 'deleteConfirm', payload: nodes.find(n => n.id === contextMenuSettings.id) });
                }}
                className="w-full text-left px-4 py-3 hover:bg-white/10 active:bg-white/20 flex items-center gap-3 text-sm text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Floating Action Button (FAB) --- */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col-reverse items-end gap-4">
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform duration-300 active:scale-95 ${isFabOpen ? 'rotate-45 bg-slate-700' : ''}`}
        >
          <Plus className="w-6 h-6" />
        </button>

        <AnimatePresence>
          {isFabOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="flex flex-col gap-3 items-end"
            >
              <div className="flex items-center gap-3">
                <span className="bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-white/10 text-xs font-medium text-white">Nova Pasta</span>
                <button 
                  onClick={() => { setIsFabOpen(false); setModalState({ type: 'createFolder' }); }}
                  className="w-10 h-10 bg-slate-800/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center border border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  <SpaceFolderIcon className="w-5 h-5 text-amber-400" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-white/10 text-xs font-medium text-white">Novo Arquivo TxT</span>
                <button 
                  onClick={() => { setIsFabOpen(false); setModalState({ type: 'createTextFile' }); }}
                  className="w-10 h-10 bg-slate-800/90 backdrop-blur-md text-blue-400 rounded-full shadow-lg flex items-center justify-center border border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  <FileText className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-lg border border-white/10 text-xs font-medium text-white">Enviar Arquivo</span>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 bg-slate-800/90 backdrop-blur-md text-green-400 rounded-full shadow-lg flex items-center justify-center border border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileUpload} 
          multiple
        />
      </div>

      {isFabOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/10 backdrop-blur-[1px]" 
          onClick={() => setIsFabOpen(false)} 
        />
      )}

      {/* --- Modals --- */}
      <AnimatePresence>
        {modalState.type && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/50"
              onClick={() => modalState.type !== 'viewImage' && setModalState({ type: null })}
            />
            
            {/* Delete Confirm Dialog */}
            {modalState.type === 'deleteConfirm' && (
              <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-slate-900/90 backdrop-blur-3xl rounded-xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden border border-white/10"
               >
                 <div className="p-6">
                   <h2 className="text-xl font-medium text-white mb-2">Excluir item?</h2>
                   <p className="text-gray-300 mb-6 text-sm">
                     Tem certeza que deseja excluir &quot;{modalState.payload?.name}&quot;{modalState.payload?.type === 'folder' ? ' e todo o seu conteúdo' : ''}? Esta ação não pode ser desfeita.
                   </p>
                   <div className="flex justify-end gap-2 -mb-2 -mr-2">
                     <button 
                       onClick={() => setModalState({ type: null })}
                       className="px-4 py-2 text-gray-300 font-medium hover:bg-white/10 rounded-md transition-colors"
                     >
                       CANCELAR
                     </button>
                     <button 
                       onClick={() => { handleDelete(modalState.payload.id); setModalState({ type: null }); }}
                       className="px-4 py-2 text-red-400 font-medium hover:bg-red-500/10 rounded-md transition-colors"
                     >
                       EXCLUIR
                     </button>
                   </div>
                 </div>
              </motion.div>
            )}

            {/* Create Folder / Rename Dialog */}
            {(modalState.type === 'createFolder' || modalState.type === 'rename') && (
               <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-slate-900/90 backdrop-blur-3xl rounded-xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden border border-white/10"
               >
                 <div className="p-6">
                   <h2 className="text-xl font-medium text-white mb-4">
                     {modalState.type === 'createFolder' ? 'Nova pasta' : 'Renomear'}
                   </h2>
                   <form onSubmit={(e) => {
                     e.preventDefault();
                     const formData = new FormData(e.currentTarget);
                     const name = formData.get('name') as string;
                     if (modalState.type === 'createFolder') handleCreateFolder(name);
                     if (modalState.type === 'rename') handleRename(modalState.payload.id, name);
                   }}>
                     <input 
                       name="name"
                       defaultValue={modalState.payload?.name || ''}
                       autoFocus
                       className="w-full border-b-2 border-blue-500/50 focus:border-blue-500 bg-white/5 focus:bg-white/10 transition-colors px-3 py-2 text-white outline-none rounded-t-md"
                       placeholder="Digite o nome"
                       autoComplete="off"
                     />
                     <div className="flex justify-end gap-2 mt-8 -mb-2 -mr-2">
                       <button 
                         type="button" 
                         onClick={() => setModalState({ type: null })}
                         className="px-4 py-2 text-gray-300 font-medium hover:bg-white/10 rounded-md transition-colors"
                       >
                         CANCELAR
                       </button>
                       <button 
                         type="submit"
                         className="px-4 py-2 text-blue-400 font-medium hover:bg-blue-500/10 rounded-md transition-colors"
                       >
                         OK
                       </button>
                     </div>
                   </form>
                 </div>
               </motion.div>
            )}

            {/* Create/Edit Text File Dialog */}
            {modalState.type === 'createTextFile' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-slate-900/90 backdrop-blur-3xl rounded-xl w-full max-w-lg shadow-2xl relative z-10 flex flex-col max-h-[90vh] border border-white/10"
              >
                 <div className="p-6 flex flex-col flex-1 min-h-0">
                   <h2 className="text-xl font-medium text-white mb-4 flex-shrink-0">Novo arquivo de texto</h2>
                   <form 
                     className="flex flex-col flex-1 min-h-0 min-w-0"
                     onSubmit={(e) => {
                       e.preventDefault();
                       const formData = new FormData(e.currentTarget);
                       handleCreateTextFile(formData.get('name') as string, formData.get('content') as string);
                     }}
                   >
                     <input 
                       name="name"
                       autoFocus
                       required
                       className="w-full border-b border-white/20 focus:border-blue-500 bg-transparent px-2 py-2 mb-4 text-white outline-none placeholder-white/40"
                       placeholder="Nome do arquivo (ex: notas.txt)"
                     />
                     <textarea 
                       name="content"
                       className="w-full flex-1 p-3 bg-white/5 border border-white/10 rounded-md focus:border-blue-500 outline-none resize-none font-mono text-sm min-h-[200px] text-white placeholder-white/30"
                       placeholder="Digite o conteúdo aqui..."
                     />
                     <div className="flex justify-end gap-2 mt-6 flex-shrink-0">
                       <button 
                         type="button" 
                         onClick={() => setModalState({ type: null })}
                         className="px-4 py-2 text-gray-300 font-medium hover:bg-white/10 rounded-md transition-colors"
                       >
                         Cancelar
                       </button>
                       <button 
                         type="submit"
                         className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-md transition-colors"
                       >
                         Salvar Arquivo
                       </button>
                     </div>
                   </form>
                 </div>
              </motion.div>
            )}

            {/* View File Text/Info Dialog */}
            {modalState.type === 'viewFile' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/90 backdrop-blur-3xl rounded-xl w-full max-w-lg shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden border border-white/10"
              >
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 flex-shrink-0">
                  <div className="flex items-center gap-3 truncate">
                    {getIconForType(modalState.payload.type, "w-6 h-6 shrink-0")}
                    <h3 className="font-medium text-white truncate pr-4">{modalState.payload.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDownloadFile(modalState.payload)}
                      className="p-2 rounded-full hover:bg-white/10 text-gray-400 transition-colors"
                      title="Baixar"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    {modalState.payload.type === 'file' && modalState.payload.content !== undefined && (
                      <div className="flex items-center relative">
                        {isEditingText ? (
                          <button 
                            onClick={() => {
                              handleSaveTextFile(modalState.payload.id, editingTextContent);
                              const newPayload = { ...modalState.payload, content: editingTextContent };
                              setModalState({ type: 'viewFile', payload: newPayload });
                              setIsEditingText(false);
                            }}
                            className="p-2 rounded-full transition-colors hover:bg-white/10 text-green-400"
                            title="Salvar"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingTextContent(modalState.payload.content || '');
                              setIsEditingText(true);
                            }}
                            className="p-2 rounded-full transition-colors hover:bg-white/10 text-blue-400"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        )}
                        <button 
                          onClick={() => setShowTextSettings(!showTextSettings)}
                          className={`p-2 rounded-full transition-colors ${showTextSettings ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-gray-400'}`}
                          title="Configurações de Texto"
                        >
                          <Settings2 className="w-5 h-5" />
                        </button>
                        <AnimatePresence>
                          {showTextSettings && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute right-0 top-full mt-2 w-48 bg-slate-800/90 backdrop-blur-xl rounded-md shadow-2xl border border-white/10 p-3 z-20 flex flex-col gap-3 text-white"
                            >
                              <div>
                                <p className="text-xs font-semibold uppercase mb-2 text-gray-400">Fonte</p>
                                <div className="flex bg-black/30 p-1 rounded-md">
                                  <button onClick={() => setTextFontFamily('font-sans')} className={`flex-1 text-sm py-1 rounded-sm ${textFontFamily === 'font-sans' ? 'bg-white/10 shadow-sm font-medium' : 'text-gray-400'}`}>Sans</button>
                                  <button onClick={() => setTextFontFamily('font-serif')} className={`flex-1 text-sm py-1 rounded-sm ${textFontFamily === 'font-serif' ? 'bg-white/10 shadow-sm font-medium' : 'text-gray-400'}`}>Serif</button>
                                  <button onClick={() => setTextFontFamily('font-mono')} className={`flex-1 text-sm py-1 rounded-sm ${textFontFamily === 'font-mono' ? 'bg-white/10 shadow-sm font-medium' : 'text-gray-400'}`}>Mono</button>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase mb-2 text-gray-400">Tamanho</p>
                                <div className="flex bg-black/30 p-1 rounded-md">
                                  <button onClick={() => setTextFontSize('text-xs')} className={`flex-1 text-xs py-1 rounded-sm ${textFontSize === 'text-xs' ? 'bg-white/10 shadow-sm font-medium' : 'text-gray-400'}`}>P</button>
                                  <button onClick={() => setTextFontSize('text-sm')} className={`flex-1 text-sm py-1 rounded-sm ${textFontSize === 'text-sm' ? 'bg-white/10 shadow-sm font-medium' : 'text-gray-400'}`}>M</button>
                                  <button onClick={() => setTextFontSize('text-base')} className={`flex-1 text-base py-1 rounded-sm ${textFontSize === 'text-base' ? 'bg-white/10 shadow-sm font-medium' : 'text-gray-400'}`}>G</button>
                                  <button onClick={() => setTextFontSize('text-lg')} className={`flex-1 text-lg py-1 rounded-sm ${textFontSize === 'text-lg' ? 'bg-white/10 shadow-sm font-medium' : 'text-gray-400'}`}>GG</button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <button onClick={() => setModalState({ type: null })} className="p-2 hover:bg-white/10 rounded-full shrink-0">
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 text-gray-300">
                  {modalState.payload.type === 'file' && modalState.payload.content !== undefined ? (
                    isEditingText ? (
                      <textarea
                        value={editingTextContent}
                        onChange={(e) => setEditingTextContent(e.target.value)}
                        className={`w-full min-h-[50vh] bg-transparent resize-none outline-none ${textFontFamily} ${textFontSize} text-white`}
                        placeholder="Digite o texto do arquivo..."
                      />
                    ) : (
                      <pre className={`${textFontFamily} ${textFontSize} whitespace-pre-wrap`}>{modalState.payload.content}</pre>
                    )
                  ) : modalState.payload.type === 'video' && modalState.payload.dataUrl ? (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-black/50 rounded-lg overflow-hidden">
                      <video src={modalState.payload.dataUrl} controls className="max-w-full max-h-full rounded-md" />
                    </div>
                  ) : modalState.payload.type === 'audio' && modalState.payload.dataUrl ? (
                    <div className="flex flex-col items-center justify-center p-8 w-full bg-white/5 rounded-lg border border-white/5">
                      {getIconForType(modalState.payload.type, "w-24 h-24 text-red-500 mb-8 drop-shadow-lg")}
                      <p className="text-white font-medium mb-6">{modalState.payload.name}</p>
                      <audio src={modalState.payload.dataUrl} controls className="w-full max-w-md" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white/5 rounded-lg border border-white/5">
                      {getIconForType(modalState.payload.type, "w-16 h-16 text-gray-500 mb-4")}
                      <p className="text-white font-medium mb-1">Preview não disponível</p>
                      <p className="text-gray-400 text-xs mb-4">Tamanho: {formatBytes(modalState.payload.size)}</p>
                      
                      {modalState.payload.dataUrl && (
                        <a 
                          href={modalState.payload.dataUrl} 
                          download={modalState.payload.name}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                          <Download className="w-4 h-4" /> Baixar
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* View Image Dialog */}
            {modalState.type === 'viewImage' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none"
              >
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownloadFile(modalState.payload); }} 
                    className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md"
                    title="Baixar Imagem"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setImageZoom(Math.min(imageZoom + 0.25, 4)); }} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md">
                    <ZoomIn className="w-5 h-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setImageZoom(Math.max(imageZoom - 0.25, 0.5)); }} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md">
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setModalState({ type: null }); setImageZoom(1); }} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur-md">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-auto">
                  <button onClick={(e) => { e.stopPropagation(); handlePrevImage(); }} className="p-3 bg-black/30 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors disabled:opacity-30 disabled:hover:bg-black/30" disabled={currentFolderImages.findIndex(img => img.id === modalState.payload.id) <= 0}>
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                </div>
                
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-auto">
                  <button onClick={(e) => { e.stopPropagation(); handleNextImage(); }} className="p-3 bg-black/30 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-colors disabled:opacity-30 disabled:hover:bg-black/30" disabled={currentFolderImages.findIndex(img => img.id === modalState.payload.id) >= currentFolderImages.length - 1}>
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </div>

                {modalState.payload.dataUrl ? (
                  <motion.div 
                    className="overflow-auto pointer-events-auto flex items-center justify-center max-w-full max-h-full p-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <motion.img 
                      src={modalState.payload.dataUrl} 
                      alt={modalState.payload.name} 
                      animate={{ scale: imageZoom }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl bg-black/20 origin-center"
                    />
                  </motion.div>
                ) : (
                  <div className="w-full h-64 bg-slate-900 rounded-lg flex items-center justify-center text-gray-400 pointer-events-auto">
                    Nenhum dado de imagem encontrado
                  </div>
                )}
                <p className="absolute bottom-6 text-white text-sm font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-md pointer-events-auto">
                  {modalState.payload.name} ({formatBytes(modalState.payload.size)}) • {Math.round(imageZoom * 100)}%
                </p>
              </motion.div>
            )}
            
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
