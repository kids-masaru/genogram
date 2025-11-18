import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
// ↓↓↓ (修正点) Accordion をインポート
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion'
import { 
  Home, Square, MousePointer, Type, 
  RotateCcw, Trash2, Download, X, Move, 
  Bed, Sofa, Car, Bath, ChefHat, Tv, Armchair,
  DoorOpen, 
  ListOrdered, // 'Stairs' から 'ListOrdered' に変更
  AlertTriangle, Accessibility, Minus, MousePointerSquare // MousePointerSquare をインポート
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
    stairs: { name: '階段', icon: ListOrdered, width: 80, height: 120, color: '#6b7280', category: 'fixture' }, // <-- 'Stairs' から 'ListOrdered' に変更
    bath: { name: '浴槽', icon: Bath, width: 120, height: 80, color: '#0ea5e9', category: 'fixture' },
    kitchen: { name: 'キッチン', icon: ChefHat, width: 100, height: 60, color: '#dc2626', category: 'fixture' },
    
    // バリアフリー・安全
    ramp: { name: 'スロープ', icon: Accessibility, width: 100, height: 40, color: '#16a34a', category: 'safety' },
    handrail: { name: '手すり', icon: Minus, width: 80, height: 10, color: '#ca8a04', category: 'safety' }, // <-- 'Minus' を使用
    danger: { name: '危険箇所', icon: AlertTriangle, width: 30, height: 30, color: '#dc2626', category: 'safety' }
  }

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

  // Draw canvas (useCallbackで最適化)
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'hsl(var(--border))' // テーマに合わせる
      ctx.lineWidth = 0.5 // グリッドを細く
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
      ctx.strokeStyle = 'hsl(var(--foreground))' // テーマに合わせる
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(wall.startX, wall.startY)
      ctx.lineTo(wall.endX, wall.endY)
      ctx.stroke()
    })
    
    // Draw current wall being drawn
    if (currentWall) {
      ctx.strokeStyle = 'hsl(var(--primary))' // テーマに合わせる
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
      if (!furniture) return; // アイテムタイプが存在しない場合はスキップ

      const isSelected = selectedItem && selectedItem.id === item.id
      
      ctx.fillStyle = furniture.color + (isSelected ? 'CC' : '80')
      ctx.strokeStyle = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'
      ctx.lineWidth = isSelected ? 3 : 1
      
      // Draw item rectangle
      ctx.fillRect(item.x, item.y, item.width, item.height)
      ctx.strokeRect(item.x, item.y, item.width, item.height)
      
      // Draw item label
      ctx.fillStyle = 'hsl(var(--foreground))' // テーマに合わせる
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
      
      ctx.fillStyle = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(comment.text, comment.x, comment.y)
      
      if (isSelected) {
        const metrics = ctx.measureText(comment.text)
        ctx.strokeStyle = 'hsl(var(--primary))'
        ctx.lineWidth = 1
        ctx.strokeRect(comment.x - 2, comment.y - 16, metrics.width + 4, 20)
      }
    })
  }, [items, walls, comments, selectedItem, showGrid, currentWall, gridSize])

  // Canvasの描画は、依存関係が変更されたときにuseEffectで実行
  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  // Canvasのリサイズロジック (マウント時に1回だけ実行)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = canvas.parentElement
    if (!container) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      if (rect.width === 0) return;
      
      canvas.width = rect.width
      canvas.height = Math.max(600, rect.width * 0.7) // 高さを幅の70%に (最小600px)
      
      drawCanvas() // リサイズ後に再描画
    }

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(container)
    
    resizeCanvas() // 初回描画
    
    return () => resizeObserver.unobserve(container)
  }, [drawCanvas]) // drawCanvas が変更されたらリサイズロジックも更新


  // Add furniture item
  const addFurnitureItem = (type) => {
    saveState()
    const furniture = furnitureItems[type]
    if (!furniture) return; // 存在しないタイプの場合は何もしない

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
    if (!canvas) return;
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
      // zIndexの高いものが手前に来るようにソート (まだzIndex実装してないが将来的に)
      const sortedItems = [...items].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

      const clickedItem = sortedItems.reverse().find(item => 
        x >= item.x && x <= item.x + item.width &&
        y >= item.y && y <= item.y + item.height
      )
      
      const clickedComment = comments.find(comment => {
        const ctx = canvas.getContext('2d')
        if (!ctx) return false;
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
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect()
    // ↓↓↓ (修正点) グリッドスナップはドラッグ中にも効くように
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const snappedX = snapToGrid(x)
    const snappedY = snapToGrid(y)
    
    if (currentTool === 'wall' && isDrawing && currentWall) {
      setCurrentWall(prev => ({ ...prev, endX: snappedX, endY: snappedY }))
      return
    }
    
    if (draggedItem) {
      const newX = snapToGrid(x - draggedItem.offsetX)
      const newY = snapToGrid(y - draggedItem.offsetY)
      
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
      
      // setSelectedItemも更新し続けないと、ドラッグ中に情報が古くなる
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
      // (テンプレート内容は省略)...
    } else if (templateType === '3ldk') {
      // (テンプレート内容は省略)...
    }
    
    setSelectedItem(null)
  }

  // Save as image
  const saveAsImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return;
    const link = document.createElement('a')
    link.download = 'house_layout.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  // Clear all
  const clearAll = () => {
    if (window.confirm('すべてのデータを削除しますか？')) {
      saveState()
      setItems([])
      setWalls([])
      setComments([])
      setSelectedItem(null)
    }
  }
  
  // (修正点) 家具・設備リストをカテゴリ別にレンダリングするヘルパー関数
  const renderFurnitureButtons = (category) => {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(furnitureItems)
          .filter(([_, item]) => item.category === category)
          .map(([key, item]) => {
            const IconComponent = item.icon
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => addFurnitureItem(key)}
                className="p-2 h-auto flex flex-col items-center gap-1 text-xs" // text-xsで文字を小さく
                title={item.name}
              >
                <IconComponent className="h-4 w-4" />
                <span>{item.name}</span>
              </Button>
            )
          })}
      </div>
    )
  }


  return (
    // ↓↓↓ (修正点) p-6 を削除 (親のApp.jsxで設定済)、gap-6で余白を確保
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Control Panel */}
      {/* ↓↓↓ (修正点) sticky top-24 を追加して追従、space-y-6 でカード間の余白を増やす */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-full">
        {/* Basic Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              基本操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                選択削除
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showGrid"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="showGrid" className="text-sm font-medium text-muted-foreground">
                グリッド表示
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Drawing Tools */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">描画ツール</CardTitle>
          </CardHeader>
          {/* ↓↓↓ (修正点) flex flex-col gap-2 で余白を統一 */}
          <CardContent className="flex flex-col gap-2">
            {Object.entries(tools).map(([key, tool]) => {
              const IconComponent = tool.icon
              return (
                <Button
                  key={key}
                  variant={currentTool === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTool(key)}
                  className="w-full justify-start text-sm"
                >
                  <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                  {tool.name}
                </Button>
              )
            })}
          </CardContent>
        </Card>

        {/* Furniture Palette (Accordion) */}
        {/* ↓↓↓ (修正点) 巨大なカードをアコーディオンに変更 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">家具・設備</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Accordion type="multiple" collapsible className="w-full">
              <AccordionItem value="furniture">
                <AccordionTrigger>家具</AccordionTrigger>
                <AccordionContent className="pt-4">
                  {renderFurnitureButtons('furniture')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="fixture">
                <AccordionTrigger>設備</AccordionTrigger>
                <AccordionContent className="pt-4">
                  {renderFurnitureButtons('fixture')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="safety">
                <AccordionTrigger>安全・バリアフリー</AccordionTrigger>
                <AccordionContent className="pt-4">
                  {renderFurnitureButtons('safety')}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Item Details */}
        {/* ↓↓↓ (修正点) レイアウトシフトを防ぐため、常にCardを表示 */}
        <Card className="transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg">アイテム編集</CardTitle>
            <Badge 
              variant={selectedItem ? "secondary" : "outline"}
              style={{ minWidth: '80px', textAlign: 'center' }}
            >
              {selectedItem 
                ? (furnitureItems[selectedItem.type]?.name || 'コメント') 
                : '未選択'
              }
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedItem ? (
              // マーカー未選択時のプレースホルダー
              <div className="text-sm text-muted-foreground text-center py-10 space-y-2">
                <MousePointerSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p>アイテムを選択すると</p>
                <p>ここで編集できます。</p>
              </div>
            ) : selectedItem.type === 'comment' ? (
              // コメント編集
              <div>
                <Label htmlFor="comment-text">テキスト</Label>
                <Input
                  id="comment-text"
                  value={selectedItem.text}
                  onChange={(e) => updateSelectedItem('text', e.target.value)}
                  placeholder="コメントを入力"
                />
              </div>
            ) : (
              // 家具・設備編集
              <>
                <Button onClick={rotateSelectedItem} className="w-full" size="sm">
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">テンプレート</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => loadTemplate('house')}
              className="w-full"
            >
              一軒家
            </Button>
            <Button 
              variant="outline" 
              size="sm"
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
          <CardContent className="flex flex-col gap-2">
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
        {/* ↓↓↓ (修正点) キャンバスの高さを固定(min-h) + 余白(32px) = 632px */}
        <Card className="h-full min-h-[632px]">
          {/* ↓↓↓ (修正点) p-4 でキャンバスの周囲に余白, h-full */}
          <CardContent className="p-4 h-full flex justify-center items-center">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onContextMenu={(e) => e.preventDefault()} // 右クリックメニューを無効化
              className="w-full h-full border rounded-md cursor-crosshair bg-background"
              style={{ 
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
