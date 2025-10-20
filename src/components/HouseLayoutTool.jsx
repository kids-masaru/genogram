import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  Home, Square, MousePointer, Type, Palette, 
  RotateCcw, Trash2, Download, X, Move, 
  Bed, Sofa, Car, Bath, ChefHat, Tv, Armchair,
  DoorOpen, Stairs, AlertTriangle, Accessibility
} from 'lucide-react'

const HouseLayoutTool = () => {
  const canvasRef = useRef(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [items, setItems] = useState([])
  const [walls, setWalls] = useState([])
  const [comments, setComments] = useState([])
  const [currentTool, setCurrentTool] = useState('select')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentWall, setCurrentWall] = useState(null)
  const [draggedItem, setDraggedItem] = useState(null)
  const [history, setHistory] = useState([])
  const [gridSize] = useState(20)
  const [showGrid, setShowGrid] = useState(true)

  // Drawing tools
  const tools = {
    select: { name: '選択', icon: MousePointer, cursor: 'default' },
    wall: { name: '壁/線', icon: Square, cursor: 'crosshair' },
    comment: { name: 'コメント', icon: Type, cursor: 'text' }
  }

  // Floor materials
  const floorMaterials = {
    tatami: { name: '畳', color: '#a3a3a3', pattern: 'tatami' },
    flooring: { name: 'フローリング', color: '#d97706', pattern: 'wood' },
    tile: { name: 'タイル', color: '#64748b', pattern: 'tile' },
    carpet: { name: 'カーペット', color: '#7c3aed', pattern: 'carpet' }
  }

  // Furniture and fixtures
  const furnitureItems = {
    // 家具
    bed: { name: 'ベッド', icon: Bed, width: 80, height: 160, color: '#8b5cf6', category: 'furniture' },
    sofa: { name: 'ソファ', icon: Sofa, width: 120, height: 60, color: '#06b6d4', category: 'furniture' },
    chair: { name: '椅子', icon: Armchair, width: 40, height: 40, color: '#10b981', category: 'furniture' },
    table: { name: 'テーブル', icon: Square, width: 80, height: 80, color: '#f59e0b', category: 'furniture' },
    tv: { name: 'テレビ', icon: Tv, width: 60, height: 20, color: '#374151', category: 'furniture' },
    
    // 設備
    door: { name: 'ドア', icon: DoorOpen, width: 20, height: 60, color: '#92400e', category: 'fixture' },
    window: { name: '窓', icon: Square, width: 60, height: 20, color: '#3b82f6', category: 'fixture' },
    stairs: { name: '階段', icon: Stairs, width: 80, height: 120, color: '#6b7280', category: 'fixture' },
    bath: { name: '浴槽', icon: Bath, width: 120, height: 80, color: '#0ea5e9', category: 'fixture' },
    kitchen: { name: 'キッチン', icon: ChefHat, width: 100, height: 60, color: '#dc2626', category: 'fixture' },
    
    // バリアフリー・安全
    ramp: { name: 'スロープ', icon: Accessibility, width: 100, height: 40, color: '#16a34a', category: 'safety' },
    handrail: { name: '手すり', icon: Minus, width: 80, height: 10, color: '#ca8a04', category: 'safety' },
    danger: { name: '危険箇所', icon: AlertTriangle, width: 30, height: 30, color: '#dc2626', category: 'safety' }
  }

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = Math.max(600, rect.width * 0.7)
      drawCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [items, walls, comments, selectedItem, showGrid])

  // Save state for undo
  const saveState = () => {
    const state = {
      items: [...items],
      walls: [...walls],
      comments: [...comments]
    }
    setHistory(prev => [...prev.slice(-9), state])
  }

  // Undo function
  const undo = () => {
    if (history.length === 0) return
    const lastState = history[history.length - 1]
    setItems(lastState.items)
    setWalls(lastState.walls)
    setComments(lastState.comments)
    setHistory(prev => prev.slice(0, -1))
    setSelectedItem(null)
  }

  // Snap to grid
  const snapToGrid = (value) => {
    return Math.round(value / gridSize) * gridSize
  }

  // Draw canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
    }
    
    // Draw walls
    walls.forEach(wall => {
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(wall.startX, wall.startY)
      ctx.lineTo(wall.endX, wall.endY)
      ctx.stroke()
    })
    
    // Draw current wall being drawn
    if (currentWall) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 6
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(currentWall.startX, currentWall.startY)
      ctx.lineTo(currentWall.endX, currentWall.endY)
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    // Draw items
    items.forEach(item => {
      const furniture = furnitureItems[item.type]
      const isSelected = selectedItem && selectedItem.id === item.id
      
      ctx.fillStyle = furniture.color + (isSelected ? 'CC' : '80')
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#374151'
      ctx.lineWidth = isSelected ? 3 : 1
      
      // Draw item rectangle
      ctx.fillRect(item.x, item.y, item.width, item.height)
      ctx.strokeRect(item.x, item.y, item.width, item.height)
      
      // Draw item label
      ctx.fillStyle = '#374151'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(
        furniture.name, 
        item.x + item.width / 2, 
        item.y + item.height / 2 + 4
      )
      
      // Draw rotation indicator for doors
      if (item.type === 'door') {
        ctx.strokeStyle = '#92400e'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(item.x + 10, item.y + 10, 8, 0, Math.PI / 2)
        ctx.stroke()
      }
    })
    
    // Draw comments
    comments.forEach(comment => {
      const isSelected = selectedItem && selectedItem.id === comment.id
      
      ctx.fillStyle = isSelected ? '#3b82f6' : '#6b7280'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(comment.text, comment.x, comment.y)
      
      if (isSelected) {
        const metrics = ctx.measureText(comment.text)
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 1
        ctx.strokeRect(comment.x - 2, comment.y - 16, metrics.width + 4, 20)
      }
    })
  }

  // Add furniture item
  const addFurnitureItem = (type) => {
    saveState()
    const furniture = furnitureItems[type]
    const newItem = {
      id: Date.now(),
      type,
      x: snapToGrid(100 + Math.random() * 200),
      y: snapToGrid(100 + Math.random() * 200),
      width: furniture.width,
      height: furniture.height,
      rotation: 0,
      notes: ''
    }
    setItems(prev => [...prev, newItem])
    setSelectedItem(newItem)
  }

  // Mouse events
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = snapToGrid(e.clientX - rect.left)
    const y = snapToGrid(e.clientY - rect.top)
    
    if (currentTool === 'wall') {
      if (!isDrawing) {
        setIsDrawing(true)
        setCurrentWall({ startX: x, startY: y, endX: x, endY: y })
      } else {
        saveState()
        setWalls(prev => [...prev, { ...currentWall, endX: x, endY: y }])
        setIsDrawing(false)
        setCurrentWall(null)
      }
      return
    }
    
    if (currentTool === 'comment') {
      const text = prompt('コメントを入力してください:')
      if (text) {
        saveState()
        const newComment = {
          id: Date.now(),
          x,
          y,
          text,
          type: 'comment'
        }
        setComments(prev => [...prev, newComment])
        setSelectedItem(newComment)
      }
      return
    }
    
    if (currentTool === 'select') {
      // Check for item selection
      const clickedItem = items.find(item => 
        x >= item.x && x <= item.x + item.width &&
        y >= item.y && y <= item.y + item.height
      )
      
      const clickedComment = comments.find(comment => {
        const ctx = canvas.getContext('2d')
        ctx.font = 'bold 14px sans-serif'
        const metrics = ctx.measureText(comment.text)
        return x >= comment.x && x <= comment.x + metrics.width &&
               y >= comment.y - 16 && y <= comment.y + 4
      })
      
      const clicked = clickedItem || clickedComment
      
      if (clicked) {
        setSelectedItem(clicked)
        setDraggedItem({
          item: clicked,
          offsetX: x - clicked.x,
          offsetY: y - clicked.y
        })
      } else {
        setSelectedItem(null)
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = snapToGrid(e.clientX - rect.left)
    const y = snapToGrid(e.clientY - rect.top)
    
    if (currentTool === 'wall' && isDrawing && currentWall) {
      setCurrentWall(prev => ({ ...prev, endX: x, endY: y }))
      return
    }
    
    if (draggedItem) {
      const newX = x - draggedItem.offsetX
      const newY = y - draggedItem.offsetY
      
      if (draggedItem.item.type === 'comment') {
        setComments(prev => prev.map(comment =>
          comment.id === draggedItem.item.id
            ? { ...comment, x: newX, y: newY }
            : comment
        ))
      } else {
        setItems(prev => prev.map(item =>
          item.id === draggedItem.item.id
            ? { ...item, x: newX, y: newY }
            : item
        ))
      }
      
      setSelectedItem(prev => ({ ...prev, x: newX, y: newY }))
    }
  }

  const handleCanvasMouseUp = () => {
    if (draggedItem) {
      saveState()
      setDraggedItem(null)
    }
  }

  // Rotate selected item
  const rotateSelectedItem = () => {
    if (!selectedItem || selectedItem.type === 'comment') return
    
    saveState()
    const rotatedItem = {
      ...selectedItem,
      width: selectedItem.height,
      height: selectedItem.width,
      rotation: (selectedItem.rotation + 90) % 360
    }
    
    setItems(prev => prev.map(item =>
      item.id === selectedItem.id ? rotatedItem : item
    ))
    setSelectedItem(rotatedItem)
  }

  // Delete selected item
  const deleteSelectedItem = () => {
    if (!selectedItem) return
    
    saveState()
    if (selectedItem.type === 'comment') {
      setComments(prev => prev.filter(comment => comment.id !== selectedItem.id))
    } else {
      setItems(prev => prev.filter(item => item.id !== selectedItem.id))
    }
    setSelectedItem(null)
  }

  // Update selected item
  const updateSelectedItem = (field, value) => {
    if (!selectedItem) return
    
    const updatedItem = { ...selectedItem, [field]: value }
    
    if (selectedItem.type === 'comment') {
      setComments(prev => prev.map(comment =>
        comment.id === selectedItem.id ? updatedItem : comment
      ))
    } else {
      setItems(prev => prev.map(item =>
        item.id === selectedItem.id ? updatedItem : item
      ))
    }
    setSelectedItem(updatedItem)
  }

  // Load template
  const loadTemplate = (templateType) => {
    saveState()
    
    if (templateType === 'house') {
      // Simple house template
      const houseItems = [
        { id: 1, type: 'door', x: 200, y: 100, width: 20, height: 60, rotation: 0 },
        { id: 2, type: 'window', x: 300, y: 80, width: 60, height: 20, rotation: 0 },
        { id: 3, type: 'bed', x: 120, y: 200, width: 80, height: 160, rotation: 0 },
        { id: 4, type: 'table', x: 300, y: 250, width: 80, height: 80, rotation: 0 },
        { id: 5, type: 'sofa', x: 400, y: 200, width: 120, height: 60, rotation: 0 }
      ]
      
      const houseWalls = [
        { startX: 100, startY: 100, endX: 500, endY: 100 },
        { startX: 500, startY: 100, endX: 500, endY: 400 },
        { startX: 500, startY: 400, endX: 100, endY: 400 },
        { startX: 100, startY: 400, endX: 100, endY: 100 }
      ]
      
      setItems(houseItems)
      setWalls(houseWalls)
    } else if (templateType === '3ldk') {
      // 3LDK apartment template
      const apartmentItems = [
        { id: 1, type: 'bed', x: 120, y: 120, width: 80, height: 160, rotation: 0 },
        { id: 2, type: 'bed', x: 320, y: 120, width: 80, height: 160, rotation: 0 },
        { id: 3, type: 'bed', x: 520, y: 120, width: 80, height: 160, rotation: 0 },
        { id: 4, type: 'sofa', x: 200, y: 350, width: 120, height: 60, rotation: 0 },
        { id: 5, type: 'table', x: 350, y: 350, width: 80, height: 80, rotation: 0 },
        { id: 6, type: 'kitchen', x: 500, y: 350, width: 100, height: 60, rotation: 0 }
      ]
      
      const apartmentWalls = [
        { startX: 100, startY: 100, endX: 650, endY: 100 },
        { startX: 650, startY: 100, endX: 650, endY: 450 },
        { startX: 650, startY: 450, endX: 100, endY: 450 },
        { startX: 100, startY: 450, endX: 100, endY: 100 },
        { startX: 250, startY: 100, endX: 250, endY: 300 },
        { startX: 450, startY: 100, endX: 450, endY: 300 }
      ]
      
      setItems(apartmentItems)
      setWalls(apartmentWalls)
    }
    
    setSelectedItem(null)
  }

  // Save as image
  const saveAsImage = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = 'house_layout.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  // Clear all
  const clearAll = () => {
    if (confirm('すべてのデータを削除しますか？')) {
      saveState()
      setItems([])
      setWalls([])
      setComments([])
      setSelectedItem(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      {/* Control Panel */}
      <div className="lg:col-span-1 space-y-4">
        {/* Basic Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              基本操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={undo}
                disabled={history.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                元に戻す
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={deleteSelectedItem}
                disabled={!selectedItem}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                削除
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showGrid"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              <label htmlFor="showGrid" className="text-sm">グリッド表示</label>
            </div>
          </CardContent>
        </Card>

        {/* Drawing Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">描画ツール</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(tools).map(([key, tool]) => {
              const IconComponent = tool.icon
              return (
                <Button
                  key={key}
                  variant={currentTool === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTool(key)}
                  className="w-full justify-start"
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {tool.name}
                </Button>
              )
            })}
          </CardContent>
        </Card>

        {/* Furniture Palette */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">家具・設備</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Furniture */}
            <div>
              <h4 className="font-medium text-sm mb-2">家具</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(furnitureItems)
                  .filter(([_, item]) => item.category === 'furniture')
                  .map(([key, item]) => {
                    const IconComponent = item.icon
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => addFurnitureItem(key)}
                        className="p-2 h-auto flex flex-col items-center gap-1"
                        title={item.name}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="text-xs">{item.name}</span>
                      </Button>
                    )
                  })}
              </div>
            </div>

            {/* Fixtures */}
            <div>
              <h4 className="font-medium text-sm mb-2">設備</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(furnitureItems)
                  .filter(([_, item]) => item.category === 'fixture')
                  .map(([key, item]) => {
                    const IconComponent = item.icon
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => addFurnitureItem(key)}
                        className="p-2 h-auto flex flex-col items-center gap-1"
                        title={item.name}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="text-xs">{item.name}</span>
                      </Button>
                    )
                  })}
              </div>
            </div>

            {/* Safety */}
            <div>
              <h4 className="font-medium text-sm mb-2">安全・バリアフリー</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(furnitureItems)
                  .filter(([_, item]) => item.category === 'safety')
                  .map(([key, item]) => {
                    const IconComponent = item.icon
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => addFurnitureItem(key)}
                        className="p-2 h-auto flex flex-col items-center gap-1"
                        title={item.name}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="text-xs">{item.name}</span>
                      </Button>
                    )
                  })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Item Details */}
        {selectedItem && selectedItem.type !== 'comment' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">アイテム編集</CardTitle>
              <Badge variant="secondary">
                {furnitureItems[selectedItem.type]?.name}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={rotateSelectedItem} className="w-full">
                <Move className="h-4 w-4 mr-2" />
                90度回転
              </Button>
              <div>
                <Label htmlFor="item-notes">メモ</Label>
                <Textarea
                  id="item-notes"
                  value={selectedItem.notes || ''}
                  onChange={(e) => updateSelectedItem('notes', e.target.value)}
                  placeholder="アイテムのメモを入力"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comment Details */}
        {selectedItem && selectedItem.type === 'comment' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">コメント編集</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="comment-text">テキスト</Label>
                <Input
                  id="comment-text"
                  value={selectedItem.text}
                  onChange={(e) => updateSelectedItem('text', e.target.value)}
                  placeholder="コメントを入力"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">テンプレート</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => loadTemplate('house')}
              className="w-full"
            >
              一軒家
            </Button>
            <Button 
              variant="outline" 
              onClick={() => loadTemplate('3ldk')}
              className="w-full"
            >
              3LDK
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">保存・操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={saveAsImage} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              画像保存
            </Button>
            <Button variant="destructive" onClick={clearAll} className="w-full">
              <X className="h-4 w-4 mr-2" />
              全消去
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Canvas Area */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          <CardContent className="p-0">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className="w-full border rounded"
              style={{ 
                minHeight: '600px',
                cursor: tools[currentTool]?.cursor || 'default'
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default HouseLayoutTool
