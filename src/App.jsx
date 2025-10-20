import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('genogram');
  const [genogramElements, setGenogramElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [bodyChartMarks, setBodyChartMarks] = useState([]);
  const [selectedBodyMarkType, setSelectedBodyMarkType] = useState('pressure_sore');
  const [houseLayoutItems, setHouseLayoutItems] = useState([]);
  const [selectedHouseItem, setSelectedHouseItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // テンプレート管理
  const [houseTemplates, setHouseTemplates] = useState([
    {
      id: 'house',
      name: '一軒家',
      items: [
        { id: 1, type: 'room', x: 100, y: 100, width: 120, height: 100, label: 'リビング' },
        { id: 2, type: 'room', x: 250, y: 100, width: 100, height: 80, label: 'キッチン' },
        { id: 3, type: 'room', x: 100, y: 220, width: 80, height: 80, label: '寝室' },
        { id: 4, type: 'room', x: 200, y: 220, width: 60, height: 60, label: '浴室' },
        { id: 5, type: 'furniture', x: 120, y: 130, width: 60, height: 30, label: 'ソファ' },
        { id: 6, type: 'furniture', x: 270, y: 120, width: 40, height: 20, label: 'テーブル' }
      ]
    },
    {
      id: '3ldk',
      name: '3LDK',
      items: [
        { id: 1, type: 'room', x: 150, y: 100, width: 100, height: 80, label: 'LDK' },
        { id: 2, type: 'room', x: 270, y: 100, width: 80, height: 60, label: '洋室1' },
        { id: 3, type: 'room', x: 270, y: 180, width: 80, height: 60, label: '洋室2' },
        { id: 4, type: 'room', x: 150, y: 200, width: 80, height: 60, label: '洋室3' },
        { id: 5, type: 'room', x: 100, y: 100, width: 40, height: 60, label: '浴室' },
        { id: 6, type: 'room', x: 100, y: 180, width: 40, height: 40, label: 'トイレ' }
      ]
    }
  ]);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // 履歴管理（元に戻す機能）
  const [genogramHistory, setGenogramHistory] = useState([]);
  const [bodyHistory, setBodyHistory] = useState([]);
  const [houseHistory, setHouseHistory] = useState([]);
  
  const canvasRef = useRef(null);
  const bodyCanvasRef = useRef(null);
  const houseCanvasRef = useRef(null);

  // 履歴保存関数
  const saveToHistory = (type, data) => {
    const newState = JSON.parse(JSON.stringify(data));
    switch (type) {
      case 'genogram':
        setGenogramHistory(prev => [...prev.slice(-19), newState]); // 最大20個の履歴
        break;
      case 'body':
        setBodyHistory(prev => [...prev.slice(-19), newState]);
        break;
      case 'house':
        setHouseHistory(prev => [...prev.slice(-19), newState]);
        break;
    }
  };

  // 元に戻す関数
  const undo = (type) => {
    switch (type) {
      case 'genogram':
        if (genogramHistory.length > 0) {
          const lastState = genogramHistory[genogramHistory.length - 1];
          setGenogramElements(lastState);
          setGenogramHistory(prev => prev.slice(0, -1));
          setSelectedElement(null);
        }
        break;
      case 'body':
        if (bodyHistory.length > 0) {
          const lastState = bodyHistory[bodyHistory.length - 1];
          setBodyChartMarks(lastState);
          setBodyHistory(prev => prev.slice(0, -1));
        }
        break;
      case 'house':
        if (houseHistory.length > 0) {
          const lastState = houseHistory[houseHistory.length - 1];
          setHouseLayoutItems(lastState);
          setHouseHistory(prev => prev.slice(0, -1));
          setSelectedHouseItem(null);
        }
        break;
    }
  };

  // ジェノグラム機能
  const addGenogramPerson = (type) => {
    saveToHistory('genogram', genogramElements);
    const newPerson = {
      id: Date.now(),
      type,
      x: 300 + Math.random() * 200,
      y: 300 + Math.random() * 200,
      name: '',
      age: '',
      memo: ''
    };
    setGenogramElements([...genogramElements, newPerson]);
    setSelectedElement(newPerson);
  };

  const updateSelectedElement = (field, value) => {
    if (!selectedElement) return;
    const updated = { ...selectedElement, [field]: value };
    setSelectedElement(updated);
    setGenogramElements(genogramElements.map(el => 
      el.id === selectedElement.id ? updated : el
    ));
  };

  const deleteSelectedElement = () => {
    if (!selectedElement) return;
    saveToHistory('genogram', genogramElements);
    setGenogramElements(genogramElements.filter(el => el.id !== selectedElement.id));
    setSelectedElement(null);
  };

  // ジェノグラムテンプレート機能
  const loadGenogramTemplate = () => {
    saveToHistory('genogram', genogramElements);
    const template = [
      { id: Date.now() + 1, type: 'male', x: 250, y: 200, name: '父', age: '65', memo: '' },
      { id: Date.now() + 2, type: 'female', x: 400, y: 200, name: '母', age: '62', memo: '' },
      { id: Date.now() + 3, type: 'female', x: 250, y: 350, name: '長女', age: '35', memo: '' },
      { id: Date.now() + 4, type: 'male', x: 400, y: 350, name: '長男', age: '32', memo: '' }
    ];
    setGenogramElements([...genogramElements, ...template]);
  };

  const handleGenogramMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 人物選択
    const clicked = genogramElements.find(person => {
      const dx = x - person.x;
      const dy = y - person.y;
      return Math.sqrt(dx * dx + dy * dy) < 30;
    });
    
    if (clicked) {
      setSelectedElement(clicked);
      setIsDragging(true);
      setDragOffset({
        x: x - clicked.x,
        y: y - clicked.y
      });
    } else {
      setSelectedElement(null);
    }
  };

  const handleGenogramMouseMove = (e) => {
    if (!isDragging || !selectedElement) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newX = x - dragOffset.x;
    const newY = y - dragOffset.y;
    
    const updated = { ...selectedElement, x: newX, y: newY };
    setSelectedElement(updated);
    setGenogramElements(genogramElements.map(el => 
      el.id === selectedElement.id ? updated : el
    ));
  };

  const handleGenogramMouseUp = () => {
    if (isDragging && selectedElement) {
      saveToHistory('genogram', genogramElements);
    }
    setIsDragging(false);
  };

  // 身体図機能
  const addBodyMark = (type, x, y) => {
    saveToHistory('body', bodyChartMarks);
    const newMark = {
      id: Date.now(),
      type,
      x,
      y,
      severity: 'mild',
      note: ''
    };
    setBodyChartMarks([...bodyChartMarks, newMark]);
  };

  const handleBodyCanvasClick = (e) => {
    const canvas = bodyCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 右クリックの場合は削除
    if (e.button === 2) {
      const clickedMark = bodyChartMarks.find(mark => {
        const dx = x - mark.x;
        const dy = y - mark.y;
        return Math.sqrt(dx * dx + dy * dy) < 15;
      });
      
      if (clickedMark) {
        saveToHistory('body', bodyChartMarks);
        setBodyChartMarks(bodyChartMarks.filter(mark => mark.id !== clickedMark.id));
      }
      return;
    }
    
    // 選択されたマークタイプを追加
    addBodyMark(selectedBodyMarkType, x, y);
  };

  const deleteAllBodyMarks = () => {
    saveToHistory('body', bodyChartMarks);
    setBodyChartMarks([]);
  };

  // 家屋図機能
  const addHouseItem = (type) => {
    saveToHistory('house', houseLayoutItems);
    const newItem = {
      id: Date.now(),
      type,
      x: 200 + Math.random() * 300,
      y: 200 + Math.random() * 200,
      width: type === 'room' ? 100 : 50,
      height: type === 'room' ? 80 : 30,
      label: type === 'room' ? '部屋' : 
             type === 'furniture' ? '家具' : 
             type === 'barrier_free' ? 'バリアフリー' : '危険箇所',
      zIndex: houseLayoutItems.length // 新しいアイテムほど手前に
    };
    setHouseLayoutItems([...houseLayoutItems, newItem]);
  };

  // 家屋図テンプレート機能
  const loadHouseTemplate = (templateId) => {
    const template = houseTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    saveToHistory('house', houseLayoutItems);
    const newItems = template.items.map(item => ({
      ...item,
      id: Date.now() + item.id,
      zIndex: houseLayoutItems.length + item.id
    }));
    setHouseLayoutItems([...houseLayoutItems, ...newItems]);
  };

  // レイヤー操作機能
  const moveToFront = () => {
    if (!selectedHouseItem) return;
    saveToHistory('house', houseLayoutItems);
    const maxZIndex = Math.max(...houseLayoutItems.map(item => item.zIndex || 0));
    const updated = { ...selectedHouseItem, zIndex: maxZIndex + 1 };
    setSelectedHouseItem(updated);
    setHouseLayoutItems(houseLayoutItems.map(item => 
      item.id === selectedHouseItem.id ? updated : item
    ));
  };

  const moveToBack = () => {
    if (!selectedHouseItem) return;
    saveToHistory('house', houseLayoutItems);
    const minZIndex = Math.min(...houseLayoutItems.map(item => item.zIndex || 0));
    const updated = { ...selectedHouseItem, zIndex: minZIndex - 1 };
    setSelectedHouseItem(updated);
    setHouseLayoutItems(houseLayoutItems.map(item => 
      item.id === selectedHouseItem.id ? updated : item
    ));
  };

  const moveForward = () => {
    if (!selectedHouseItem) return;
    saveToHistory('house', houseLayoutItems);
    const currentZ = selectedHouseItem.zIndex || 0;
    const updated = { ...selectedHouseItem, zIndex: currentZ + 1 };
    setSelectedHouseItem(updated);
    setHouseLayoutItems(houseLayoutItems.map(item => 
      item.id === selectedHouseItem.id ? updated : item
    ));
  };

  const moveBackward = () => {
    if (!selectedHouseItem) return;
    saveToHistory('house', houseLayoutItems);
    const currentZ = selectedHouseItem.zIndex || 0;
    const updated = { ...selectedHouseItem, zIndex: currentZ - 1 };
    setSelectedHouseItem(updated);
    setHouseLayoutItems(houseLayoutItems.map(item => 
      item.id === selectedHouseItem.id ? updated : item
    ));
  };

  // テンプレート管理機能
  const saveCurrentAsTemplate = () => {
    if (houseLayoutItems.length === 0) {
      alert('保存するアイテムがありません');
      return;
    }
    
    const name = prompt('テンプレート名を入力してください:');
    if (!name) return;
    
    const newTemplate = {
      id: Date.now().toString(),
      name,
      items: houseLayoutItems.map((item, index) => ({
        ...item,
        id: index + 1
      }))
    };
    
    setHouseTemplates([...houseTemplates, newTemplate]);
    alert('テンプレートを保存しました');
  };

  const deleteTemplate = (templateId) => {
    if (confirm('このテンプレートを削除しますか？')) {
      setHouseTemplates(houseTemplates.filter(t => t.id !== templateId));
    }
  };

  const editTemplate = (templateId) => {
    const template = houseTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    setEditingTemplateId(templateId);
    setNewTemplateName(template.name);
    setIsEditingTemplate(true);
  };

  const saveTemplateEdit = () => {
    if (!newTemplateName.trim()) {
      alert('テンプレート名を入力してください');
      return;
    }
    
    setHouseTemplates(houseTemplates.map(t => 
      t.id === editingTemplateId 
        ? { ...t, name: newTemplateName.trim() }
        : t
    ));
    
    setIsEditingTemplate(false);
    setEditingTemplateId(null);
    setNewTemplateName('');
  };

  const cancelTemplateEdit = () => {
    setIsEditingTemplate(false);
    setEditingTemplateId(null);
    setNewTemplateName('');
  };

  // 改善されたアイテム選択ロジック（重なったアイテムの場合、zIndexが高いものを優先）
  const handleHouseMouseDown = (e) => {
    const canvas = houseCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 重なったアイテムを全て取得し、zIndexでソート（高い順）
    const overlappingItems = houseLayoutItems
      .filter(item => 
        x >= item.x && x <= item.x + item.width &&
        y >= item.y && y <= item.y + item.height
      )
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
    
    const clicked = overlappingItems[0]; // 最も手前のアイテムを選択
    
    if (clicked) {
      setSelectedHouseItem(clicked);
      
      // リサイズハンドルのチェック（右下角）
      const resizeHandleSize = 10;
      const isResizeHandle = x >= clicked.x + clicked.width - resizeHandleSize &&
                            y >= clicked.y + clicked.height - resizeHandleSize;
      
      if (isResizeHandle) {
        setIsResizing(true);
        setDragOffset({
          x: x - (clicked.x + clicked.width),
          y: y - (clicked.y + clicked.height)
        });
      } else {
        setIsDragging(true);
        setDragOffset({
          x: x - clicked.x,
          y: y - clicked.y
        });
      }
    } else {
      setSelectedHouseItem(null);
    }
  };

  const handleHouseMouseMove = (e) => {
    if ((!isDragging && !isResizing) || !selectedHouseItem) return;
    
    const canvas = houseCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let updated;
    
    if (isResizing) {
      // サイズ変更
      const newWidth = Math.max(30, x - selectedHouseItem.x - dragOffset.x);
      const newHeight = Math.max(20, y - selectedHouseItem.y - dragOffset.y);
      updated = { ...selectedHouseItem, width: newWidth, height: newHeight };
    } else {
      // 移動
      const newX = x - dragOffset.x;
      const newY = y - dragOffset.y;
      updated = { ...selectedHouseItem, x: newX, y: newY };
    }
    
    setSelectedHouseItem(updated);
    setHouseLayoutItems(houseLayoutItems.map(item => 
      item.id === selectedHouseItem.id ? updated : item
    ));
  };

  const handleHouseMouseUp = () => {
    if ((isDragging || isResizing) && selectedHouseItem) {
      saveToHistory('house', houseLayoutItems);
      // 修正: 移動時に自動的に最前面に移動する機能を削除
    }
    setIsDragging(false);
    setIsResizing(false);
  };

  const deleteSelectedHouseItem = () => {
    if (!selectedHouseItem) return;
    saveToHistory('house', houseLayoutItems);
    setHouseLayoutItems(houseLayoutItems.filter(item => item.id !== selectedHouseItem.id));
    setSelectedHouseItem(null);
  };

  const deleteAllHouseItems = () => {
    saveToHistory('house', houseLayoutItems);
    setHouseLayoutItems([]);
    setSelectedHouseItem(null);
  };

  const saveAsImage = (canvasRef, filename) => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  // Canvas描画関数
  useEffect(() => {
    if (activeTab === 'genogram' && canvasRef.current) {
      drawGenogram();
    } else if (activeTab === 'body' && bodyCanvasRef.current) {
      drawBodyChart();
    } else if (activeTab === 'house' && houseCanvasRef.current) {
      drawHouseLayout();
    }
  }, [genogramElements, selectedElement, bodyChartMarks, houseLayoutItems, activeTab, selectedHouseItem]);

  const drawGenogram = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // グリッド描画
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // 人物描画
    genogramElements.forEach(person => {
      ctx.fillStyle = person.type === 'male' ? '#3b82f6' : 
                     person.type === 'female' ? '#ec4899' :
                     person.type === 'unknown' ? '#6b7280' :
                     person.type === 'deceased_male' ? '#1e40af' :
                     '#be185d';
      
      ctx.strokeStyle = selectedElement?.id === person.id ? '#f59e0b' : '#374151';
      ctx.lineWidth = selectedElement?.id === person.id ? 3 : 2;

      if (person.type === 'male' || person.type === 'deceased_male' || person.type === 'unknown') {
        // 四角形
        ctx.fillRect(person.x - 25, person.y - 25, 50, 50);
        ctx.strokeRect(person.x - 25, person.y - 25, 50, 50);
        
        // 故人の場合はX印
        if (person.type === 'deceased_male') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(person.x - 15, person.y - 15);
          ctx.lineTo(person.x + 15, person.y + 15);
          ctx.moveTo(person.x + 15, person.y - 15);
          ctx.lineTo(person.x - 15, person.y + 15);
          ctx.stroke();
        }
      } else {
        // 円形
        ctx.beginPath();
        ctx.arc(person.x, person.y, 25, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // 故人の場合はX印
        if (person.type === 'deceased_female') {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(person.x - 15, person.y - 15);
          ctx.lineTo(person.x + 15, person.y + 15);
          ctx.moveTo(person.x + 15, person.y - 15);
          ctx.lineTo(person.x - 15, person.y + 15);
          ctx.stroke();
        }
      }

      // 名前と年齢表示
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      const displayName = person.name || '名前なし';
      ctx.fillText(displayName, person.x, person.y + 45);
      if (person.age) {
        ctx.fillText(`${person.age}歳`, person.x, person.y + 60);
      }
    });
  };

  const drawBodyChart = () => {
    const canvas = bodyCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 人体の輪郭を描画
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#f9fafb';
    
    // 頭部
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 80, 40, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // 胴体
    ctx.fillRect(canvas.width / 2 - 50, 120, 100, 200);
    ctx.strokeRect(canvas.width / 2 - 50, 120, 100, 200);
    
    // 腕
    ctx.fillRect(canvas.width / 2 - 100, 140, 50, 120);
    ctx.strokeRect(canvas.width / 2 - 100, 140, 50, 120);
    ctx.fillRect(canvas.width / 2 + 50, 140, 50, 120);
    ctx.strokeRect(canvas.width / 2 + 50, 140, 50, 120);
    
    // 脚
    ctx.fillRect(canvas.width / 2 - 40, 320, 35, 150);
    ctx.strokeRect(canvas.width / 2 - 40, 320, 35, 150);
    ctx.fillRect(canvas.width / 2 + 5, 320, 35, 150);
    ctx.strokeRect(canvas.width / 2 + 5, 320, 35, 150);

    // マークを描画
    bodyChartMarks.forEach(mark => {
      ctx.fillStyle = mark.type === 'pressure_sore' ? '#ef4444' :
                     mark.type === 'paralysis' ? '#3b82f6' :
                     mark.type === 'amputation' ? '#6b7280' : '#f59e0b';
      
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // マークタイプの表示
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const symbol = mark.type === 'pressure_sore' ? '褥' :
                    mark.type === 'paralysis' ? '麻' :
                    mark.type === 'amputation' ? '欠' : '他';
      ctx.fillText(symbol, mark.x, mark.y + 3);
    });
  };

  const drawHouseLayout = () => {
    const canvas = houseCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // グリッド描画
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 20) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // zIndexでソートしてアイテムを描画（低い順に描画して、高いものが手前に）
    const sortedItems = [...houseLayoutItems].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    sortedItems.forEach(item => {
      ctx.fillStyle = item.type === 'room' ? '#dbeafe' :
                     item.type === 'furniture' ? '#fef3c7' :
                     item.type === 'barrier_free' ? '#d1fae5' : '#fecaca';
      
      ctx.strokeStyle = selectedHouseItem?.id === item.id ? '#f59e0b' :
                       item.type === 'room' ? '#3b82f6' :
                       item.type === 'furniture' ? '#f59e0b' :
                       item.type === 'barrier_free' ? '#10b981' : '#ef4444';
      
      ctx.lineWidth = selectedHouseItem?.id === item.id ? 3 : 2;
      ctx.fillRect(item.x, item.y, item.width, item.height);
      ctx.strokeRect(item.x, item.y, item.width, item.height);
      
      // 選択されたアイテムにリサイズハンドルを表示
      if (selectedHouseItem?.id === item.id) {
        const handleSize = 8;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(item.x + item.width - handleSize, item.y + item.height - handleSize, handleSize, handleSize);
      }
      
      // ラベル表示
      ctx.fillStyle = '#374151';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, item.x + item.width / 2, item.y + item.height / 2 + 4);
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'genogram':
        return (
          <div className="tool-content">
            <div className="tool-header">
              <h2>ジェノグラム</h2>
              <p>家族関係図の作成</p>
              <div className="tool-actions">
                <button className="btn-secondary">使い方</button>
                <button className="btn-secondary" onClick={() => saveAsImage(canvasRef, 'genogram.png')}>保存</button>
              </div>
            </div>
            
            <div className="genogram-container">
              <div className="control-panel">
                <div className="control-section">
                  <h3>基本操作</h3>
                  <div className="button-group">
                    <button 
                      className="btn-warning" 
                      onClick={() => undo('genogram')}
                      disabled={genogramHistory.length === 0}
                    >
                      元に戻す
                    </button>
                    <button className="btn-danger" onClick={deleteSelectedElement} disabled={!selectedElement}>削除</button>
                    <button className="btn-success" onClick={() => saveAsImage(canvasRef, 'genogram.png')}>画像保存</button>
                  </div>
                </div>

                <div className="control-section">
                  <h3>人物追加</h3>
                  <div className="person-buttons">
                    <button className="person-btn male" onClick={() => addGenogramPerson('male')}>
                      <span className="person-icon">□</span> 男性
                    </button>
                    <button className="person-btn female" onClick={() => addGenogramPerson('female')}>
                      <span className="person-icon">○</span> 女性
                    </button>
                    <button className="person-btn unknown" onClick={() => addGenogramPerson('unknown')}>
                      <span className="person-icon">□</span> 不明
                    </button>
                    <button className="person-btn deceased-male" onClick={() => addGenogramPerson('deceased_male')}>
                      <span className="person-icon">□</span> 故人(男)
                    </button>
                    <button className="person-btn deceased-female" onClick={() => addGenogramPerson('deceased_female')}>
                      <span className="person-icon">○</span> 故人(女)
                    </button>
                  </div>
                </div>

                <div className="control-section">
                  <h3>テンプレート</h3>
                  <button className="btn-template" onClick={loadGenogramTemplate}>
                    核家族（4人）を追加
                  </button>
                </div>

                {selectedElement && (
                  <div className="control-section">
                    <h3>人物編集</h3>
                    <div className="person-type-badge">
                      {selectedElement.type === 'male' ? '男性' :
                       selectedElement.type === 'female' ? '女性' :
                       selectedElement.type === 'unknown' ? '不明' :
                       selectedElement.type === 'deceased_male' ? '故人(男)' : '故人(女)'}
                    </div>
                    <div className="form-group">
                      <label>名前</label>
                      <input
                        type="text"
                        placeholder="名前を入力"
                        value={selectedElement.name}
                        onChange={(e) => updateSelectedElement('name', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>年齢</label>
                      <input
                        type="text"
                        placeholder="年齢"
                        value={selectedElement.age}
                        onChange={(e) => updateSelectedElement('age', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>メモ</label>
                      <textarea
                        placeholder="メモを入力"
                        value={selectedElement.memo}
                        onChange={(e) => updateSelectedElement('memo', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="control-section">
                  <h3>使い方</h3>
                  <ul className="usage-list">
                    <li>• 人物追加ボタンで家族を追加</li>
                    <li>• 人物をクリックして選択・編集</li>
                    <li>• <strong>ドラッグで人物を移動</strong></li>
                    <li>• 削除ボタンで選択した人物を削除</li>
                    <li>• <strong>元に戻すボタンでアンドゥ</strong></li>
                    <li>• 画像保存でPNG形式で出力</li>
                  </ul>
                </div>
              </div>

              <div className="canvas-area">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={500}
                  onMouseDown={handleGenogramMouseDown}
                  onMouseMove={handleGenogramMouseMove}
                  onMouseUp={handleGenogramMouseUp}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                />
              </div>
            </div>
          </div>
        );

      case 'body':
        return (
          <div className="tool-content">
            <div className="tool-header">
              <h2>身体図</h2>
              <p>身体状況の記録</p>
              <div className="tool-actions">
                <button className="btn-secondary">使い方</button>
                <button className="btn-secondary" onClick={() => saveAsImage(bodyCanvasRef, 'body-chart.png')}>保存</button>
              </div>
            </div>
            
            <div className="body-chart-container">
              <div className="control-panel">
                <div className="control-section">
                  <h3>マーク選択</h3>
                  <div className="mark-buttons">
                    <button 
                      className={`mark-btn pressure-sore ${selectedBodyMarkType === 'pressure_sore' ? 'active' : ''}`}
                      onClick={() => setSelectedBodyMarkType('pressure_sore')}
                    >
                      <span className="mark-icon">褥</span> 床ずれ
                    </button>
                    <button 
                      className={`mark-btn paralysis ${selectedBodyMarkType === 'paralysis' ? 'active' : ''}`}
                      onClick={() => setSelectedBodyMarkType('paralysis')}
                    >
                      <span className="mark-icon">麻</span> 麻痺
                    </button>
                    <button 
                      className={`mark-btn amputation ${selectedBodyMarkType === 'amputation' ? 'active' : ''}`}
                      onClick={() => setSelectedBodyMarkType('amputation')}
                    >
                      <span className="mark-icon">欠</span> 欠損
                    </button>
                    <button 
                      className={`mark-btn other ${selectedBodyMarkType === 'other' ? 'active' : ''}`}
                      onClick={() => setSelectedBodyMarkType('other')}
                    >
                      <span className="mark-icon">他</span> その他
                    </button>
                  </div>
                  <p className="selected-mark">選択中: <strong>
                    {selectedBodyMarkType === 'pressure_sore' ? '床ずれ' :
                     selectedBodyMarkType === 'paralysis' ? '麻痺' :
                     selectedBodyMarkType === 'amputation' ? '欠損' : 'その他'}
                  </strong></p>
                </div>

                <div className="control-section">
                  <h3>操作</h3>
                  <div className="button-group">
                    <button 
                      className="btn-warning" 
                      onClick={() => undo('body')}
                      disabled={bodyHistory.length === 0}
                    >
                      元に戻す
                    </button>
                    <button className="btn-danger" onClick={deleteAllBodyMarks}>全削除</button>
                    <button className="btn-success" onClick={() => saveAsImage(bodyCanvasRef, 'body-chart.png')}>画像保存</button>
                  </div>
                </div>

                <div className="control-section">
                  <h3>使い方</h3>
                  <ul className="usage-list">
                    <li>• <strong>マークボタンで種類を選択</strong></li>
                    <li>• 身体図をクリックしてマークを追加</li>
                    <li>• <strong>右クリックでマークを削除</strong></li>
                    <li>• <strong>元に戻すボタンでアンドゥ</strong></li>
                    <li>• 全削除ボタンで全てのマークを削除</li>
                    <li>• 画像保存でPNG形式で出力</li>
                  </ul>
                </div>
              </div>

              <div className="canvas-area">
                <canvas
                  ref={bodyCanvasRef}
                  width={400}
                  height={500}
                  onClick={handleBodyCanvasClick}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleBodyCanvasClick(e);
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 'house':
        return (
          <div className="tool-content">
            <div className="tool-header">
              <h2>家屋図</h2>
              <p>住環境の図面作成</p>
              <div className="tool-actions">
                <button className="btn-secondary">使い方</button>
                <button className="btn-secondary" onClick={() => saveAsImage(houseCanvasRef, 'house-layout.png')}>保存</button>
              </div>
            </div>
            
            <div className="house-layout-container">
              <div className="control-panel">
                <div className="control-section">
                  <h3>アイテム追加</h3>
                  <div className="item-buttons">
                    <button className="item-btn room" onClick={() => addHouseItem('room')}>
                      部屋
                    </button>
                    <button className="item-btn furniture" onClick={() => addHouseItem('furniture')}>
                      家具
                    </button>
                    <button className="item-btn barrier-free" onClick={() => addHouseItem('barrier_free')}>
                      バリアフリー
                    </button>
                    <button className="item-btn hazard" onClick={() => addHouseItem('hazard')}>
                      危険箇所
                    </button>
                  </div>
                </div>

                <div className="control-section">
                  <h3>テンプレート</h3>
                  <div className="template-list">
                    {houseTemplates.map(template => (
                      <div key={template.id} className="template-item">
                        {isEditingTemplate && editingTemplateId === template.id ? (
                          <div className="template-edit">
                            <input
                              type="text"
                              value={newTemplateName}
                              onChange={(e) => setNewTemplateName(e.target.value)}
                              className="template-name-input"
                            />
                            <div className="template-edit-buttons">
                              <button className="btn btn-success-small" onClick={saveTemplateEdit}>保存</button>
                              <button className="btn btn-secondary-small" onClick={cancelTemplateEdit}>キャンセル</button>
                            </div>
                          </div>
                        ) : (
                          <div className="template-display">
                            <button 
                              className="btn-template" 
                              onClick={() => loadHouseTemplate(template.id)}
                            >
                              {template.name}
                            </button>
                            <div className="template-actions">
                              <button 
                                className="btn btn-edit-small" 
                                onClick={() => editTemplate(template.id)}
                                title="名前を編集"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn btn-delete-small" 
                                onClick={() => deleteTemplate(template.id)}
                                title="削除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-template-save" onClick={saveCurrentAsTemplate}>
                    現在の配置をテンプレートとして保存
                  </button>
                </div>

                {selectedHouseItem && (
                  <div className="control-section">
                    <h3>選択中のアイテム</h3>
                    <div className="person-type-badge">
                      {selectedHouseItem.label}
                    </div>
                    <div className="size-info">
                      <p>サイズ: {selectedHouseItem.width} × {selectedHouseItem.height}</p>
                      <p className="resize-hint">右下角をドラッグしてサイズ変更</p>
                      <p className="layer-info">レイヤー: {selectedHouseItem.zIndex || 0}</p>
                    </div>
                    
                    <div className="layer-controls">
                      <h4>レイヤー操作</h4>
                      <div className="layer-button-group">
                        <button className="btn btn-layer" onClick={moveToFront} title="最前面へ">
                          最前面
                        </button>
                        <button className="btn btn-layer" onClick={moveForward} title="前面へ">
                          前面へ
                        </button>
                        <button className="btn btn-layer" onClick={moveBackward} title="背面へ">
                          背面へ
                        </button>
                        <button className="btn btn-layer" onClick={moveToBack} title="最背面へ">
                          最背面
                        </button>
                      </div>
                    </div>
                    
                    <button className="btn btn-danger" onClick={deleteSelectedHouseItem}>選択したアイテムを削除</button>
                  </div>
                )}

                <div className="control-section">
                  <h3>操作</h3>
                  <div className="button-group">
                    <button 
                      className="btn-warning" 
                      onClick={() => undo('house')}
                      disabled={houseHistory.length === 0}
                    >
                      元に戻す
                    </button>
                    <button className="btn-danger" onClick={deleteAllHouseItems}>全削除</button>
                    <button className="btn-success" onClick={() => saveAsImage(houseCanvasRef, 'house-layout.png')}>画像保存</button>
                  </div>
                </div>

                <div className="control-section">
                  <h3>使い方</h3>
                  <ul className="usage-list">
                    <li>• アイテムボタンで部屋や家具を追加</li>
                    <li>• <strong>ドラッグでアイテムを移動</strong></li>
                    <li>• <strong>右下角をドラッグしてサイズ変更</strong></li>
                    <li>• <strong>重なったアイテムは手前のものを選択</strong></li>
                    <li>• <strong>レイヤー操作で前面・背面を調整</strong></li>
                    <li>• <strong>テンプレートの編集・削除・追加が可能</strong></li>
                    <li>• <strong>元に戻すボタンでアンドゥ</strong></li>
                    <li>• 削除ボタンで選択したアイテムを削除</li>
                    <li>• 画像保存でPNG形式で出力</li>
                  </ul>
                </div>
              </div>

              <div className="canvas-area">
                <canvas
                  ref={houseCanvasRef}
                  width={600}
                  height={500}
                  onMouseDown={handleHouseMouseDown}
                  onMouseMove={handleHouseMouseMove}
                  onMouseUp={handleHouseMouseUp}
                  style={{ cursor: isDragging ? 'grabbing' : isResizing ? 'nw-resize' : 'grab' }}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-decoration">
              <div className="logo-circle"></div>
              <div className="logo-square"></div>
            </div>
            <h1>介護アセスメントツール</h1>
          </div>
          <p className="subtitle">
            カイポケでの記録作成を支援する専用ツール。ジェノグラム、身体図、家屋図を
            効率的に作成し、画像やPDFで出力してカイポケの記録に活用できます。
          </p>
        </div>
      </header>

      <div className="tool-tabs">
        <div 
          className={`tool-card ${activeTab === 'genogram' ? 'active' : ''}`}
          onClick={() => setActiveTab('genogram')}
        >
          <div className="tool-card-header">
            <div className="tool-indicator genogram"></div>
            <h3>ジェノグラム</h3>
          </div>
          <p>家族関係図の作成</p>
          <div className="tool-features">
            <span>標準記号準拠</span>
            <span>ドラッグ移動</span>
            <span>テンプレート</span>
            <span>アンドゥ機能</span>
          </div>
        </div>

        <div 
          className={`tool-card ${activeTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          <div className="tool-card-header">
            <div className="tool-indicator body"></div>
            <h3>身体図</h3>
          </div>
          <p>身体状況の記録</p>
          <div className="tool-features">
            <span>身体輪郭表示</span>
            <span>マーク選択</span>
            <span>右クリック削除</span>
            <span>アンドゥ機能</span>
          </div>
        </div>

        <div 
          className={`tool-card ${activeTab === 'house' ? 'active' : ''}`}
          onClick={() => setActiveTab('house')}
        >
          <div className="tool-card-header">
            <div className="tool-indicator house"></div>
            <h3>家屋図</h3>
          </div>
          <p>住環境の図面作成</p>
          <div className="tool-features">
            <span>レイヤー管理</span>
            <span>テンプレート管理</span>
            <span>サイズ調整</span>
            <span>アンドゥ機能</span>
          </div>
        </div>
      </div>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
