import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  User, AlertCircle, Zap, Minus, MessageSquare, 
  Download, RotateCcw, Trash2, X 
} from 'lucide-react'

const BodyChartTool = () => {
  const canvasRef = useRef(null)
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [markers, setMarkers] = useState([])
  const [currentMarkerType, setCurrentMarkerType] = useState('pressure_sore')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [history, setHistory] = useState([])

  // Marker types with colors and descriptions
  const markerTypes = {
    pressure_sore: {
      name: '床ずれ',
      color: '#dc2626',
      icon: AlertCircle,
      stages: ['ステージI', 'ステージII', 'ステージIII', 'ステージIV', 'DTI疑い']
    },
    paralysis: {
      name: 'マヒ',
      color: '#7c3aed',
      icon: Zap,
      description: '運動機能の麻痺'
    },
    amputation: {
      name: '欠損',
      color: '#059669',
      icon: Minus,
      description: '身体部位の欠損'
    },
    dysfunction: {
      name: '機能低下',
      color: '#d97706',
      icon: AlertCircle,
      description: '機能の低下・障害'
    },
    comment: {
      name: 'コメント',
      color: '#6b7280',
      icon: MessageSquare,
      description: '自由記述'
    }
  }

  // Body outline coordinates (simplified human figure)
  const bodyOutline = {
    head: { x: 300, y: 80, width: 80, height: 100 },
    torso: { x: 250, y: 180, width: 180, height: 250 },
    leftArm: { x: 180, y: 200, width: 60, height: 180 },
    rightArm: { x: 440, y: 200, width: 60, height: 180 },
    leftLeg: { x: 270, y: 430, width: 60, height: 200 },
    rightLeg: { x: 350, y: 430, width: 60, height: 200 }
  }

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = Math.max(700, rect.width * 0.8)
      drawCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [markers, selectedMarker])

  // Save state for undo
  const saveState = () => {
    setHistory(prev => [...prev.slice(-9), [...markers]])
  }

  // Undo function
  const undo = () => {
    if (history.length === 0) return
    const lastState = history[history.length - 1]
    setMarkers(lastState)
    setHistory(prev => prev.slice(0, -1))
    setSelectedMarker(null)
  }

  // Draw canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw body outline
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.fillStyle = '#f3f4f6'
    
    // Head (circle)
    ctx.beginPath()
    ctx.arc(bodyOutline.head.x + bodyOutline.head.width/2, 
             bodyOutline.head.y + bodyOutline.head.height/2, 
             bodyOutline.head.width/2, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()
    
    // Torso (rounded rectangle)
    ctx.beginPath()
    ctx.roundRect(bodyOutline.torso.x, bodyOutline.torso.y, 
                  bodyOutline.torso.width, bodyOutline.torso.height, 20)
    ctx.fill()
    ctx.stroke()
    
    // Arms (rounded rectangles)
    ctx.beginPath()
    ctx.roundRect(bodyOutline.leftArm.x, bodyOutline.leftArm.y, 
                  bodyOutline.leftArm.width, bodyOutline.leftArm.height, 15)
    ctx.fill()
    ctx.stroke()
    
    ctx.beginPath()
    ctx.roundRect(bodyOutline.rightArm.x, bodyOutline.rightArm.y, 
                  bodyOutline.rightArm.width, bodyOutline.rightArm.height, 15)
    ctx.fill()
    ctx.stroke()
    
    // Legs (rounded rectangles)
    ctx.beginPath()
    ctx.roundRect(bodyOutline.leftLeg.x, bodyOutline.leftLeg.y, 
                  bodyOutline.leftLeg.width, bodyOutline.leftLeg.height, 15)
    ctx.fill()
    ctx.stroke()
    
    ctx.beginPath()
    ctx.roundRect(bodyOutline.rightLeg.x, bodyOutline.rightLeg.y, 
                  bodyOutline.rightLeg.width, bodyOutline.rightLeg.height, 15)
    ctx.fill()
    ctx.stroke()
    
    // Draw anatomical landmarks
    ctx.fillStyle = '#9ca3af'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    
    // Body part labels
    const labels = [
      { text: '頭部', x: 340, y: 130 },
      { text: '胸部', x: 340, y: 250 },
      { text: '腹部', x: 340, y: 350 },
      { text: '左腕', x: 210, y: 290 },
      { text: '右腕', x: 470, y: 290 },
      { text: '左脚', x: 300, y: 530 },
      { text: '右脚', x: 380, y: 530 }
    ]
    
    labels.forEach(label => {
      ctx.fillText(label.text, label.x, label.y)
    })
    
    // Draw pressure points
    const pressurePoints = [
      { x: 340, y: 160, label: '後頭部' },
      { x: 280, y: 220, label: '肩甲骨' },
      { x: 400, y: 220, label: '肩甲骨' },
      { x: 340, y: 320, label: '仙骨部' },
      { x: 280, y: 380, label: '大転子' },
      { x: 400, y: 380, label: '大転子' },
      { x: 300, y: 580, label: '踵骨' },
      { x: 380, y: 580, label: '踵骨' }
    ]
    
    ctx.fillStyle = '#fbbf24'
    pressurePoints.forEach(point => {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })
    
    // Draw current drawing path
    if (currentPath.length > 1) {
      const markerType = markerTypes[currentMarkerType]
      ctx.strokeStyle = markerType.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(currentPath[0].x, currentPath[0].y)
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y)
      }
      ctx.stroke()
    }
    
    // Draw markers
    markers.forEach(marker => {
      const markerType = markerTypes[marker.type]
      const isSelected = selectedMarker && selectedMarker.id === marker.id
      
      ctx.strokeStyle = isSelected ? '#3b82f6' : markerType.color
      ctx.fillStyle = markerType.color + '40' // Semi-transparent
      ctx.lineWidth = isSelected ? 4 : 3
      
      if (marker.path && marker.path.length > 1) {
        // Draw path
        ctx.beginPath()
        ctx.moveTo(marker.path[0].x, marker.path[0].y)
        for (let i = 1; i < marker.path.length; i++) {
          ctx.lineTo(marker.path[i].x, marker.path[i].y)
        }
        ctx.stroke()
        
        // Fill area if it's a closed shape
        if (marker.path.length > 3) {
          ctx.fill()
        }
      } else if (marker.x && marker.y) {
        // Draw point marker
        ctx.beginPath()
        ctx.arc(marker.x, marker.y, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
      }
      
      // Draw marker label
      if (marker.text) {
        const centerX = marker.path ? 
          marker.path.reduce((sum, p) => sum + p.x, 0) / marker.path.length :
          marker.x
        const centerY = marker.path ? 
          marker.path.reduce((sum, p) => sum + p.y, 0) / marker.path.length :
          marker.y
        
        ctx.fillStyle = '#374151'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(marker.text, centerX, centerY - 15)
      }
    })
  }

  // Mouse events
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if clicking on existing marker
    const clickedMarker = markers.find(marker => {
      if (marker.path && marker.path.length > 0) {
        return marker.path.some(point => {
          const dx = x - point.x
          const dy = y - point.y
          return Math.sqrt(dx * dx + dy * dy) < 15
        })
      } else if (marker.x && marker.y) {
        const dx = x - marker.x
        const dy = y - marker.y
        return Math.sqrt(dx * dx + dy * dy) < 15
      }
      return false
    })
    
    if (clickedMarker) {
      setSelectedMarker(clickedMarker)
      return
    }
    
    // Start drawing new marker
    saveState()
    setIsDrawing(true)
    setCurrentPath([{ x, y }])
    setSelectedMarker(null)
  }

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setCurrentPath(prev => [...prev, { x, y }])
  }

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return
    
    setIsDrawing(false)
    
    if (currentPath.length > 1) {
      const newMarker = {
        id: Date.now(),
        type: currentMarkerType,
        path: [...currentPath],
        text: '',
        stage: markerTypes[currentMarkerType].stages ? markerTypes[currentMarkerType].stages[0] : '',
        severity: 'mild',
        notes: ''
      }
      setMarkers(prev => [...prev, newMarker])
      setSelectedMarker(newMarker)
    }
    
    setCurrentPath([])
  }

  // Update selected marker
  const updateSelectedMarker = (field, value) => {
    if (!selectedMarker) return
    
    const updatedMarker = { ...selectedMarker, [field]: value }
    setMarkers(prev => prev.map(marker =>
      marker.id === selectedMarker.id ? updatedMarker : marker
    ))
    setSelectedMarker(updatedMarker)
  }

  // Delete selected marker
  const deleteSelectedMarker = () => {
    if (!selectedMarker) return
    
    saveState()
    setMarkers(prev => prev.filter(marker => marker.id !== selectedMarker.id))
    setSelectedMarker(null)
  }

  // Save as image
  const saveAsImage = () => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = 'body_chart.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  // Clear all
  const clearAll = () => {
    if (confirm('すべてのマーカーを削除しますか？')) {
      saveState()
      setMarkers([])
      setSelectedMarker(null)
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
              <User className="h-5 w-5" />
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
                onClick={deleteSelectedMarker}
                disabled={!selectedMarker}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                削除
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              マーカー数: {markers.length}個
            </div>
          </CardContent>
        </Card>

        {/* Marker Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">マーカー種類</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(markerTypes).map(([key, type]) => {
              const IconComponent = type.icon
              return (
                <Button
                  key={key}
                  variant={currentMarkerType === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentMarkerType(key)}
                  className="w-full justify-start"
                  style={{
                    backgroundColor: currentMarkerType === key ? type.color : undefined,
                    borderColor: type.color
                  }}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  {type.name}
                </Button>
              )
            })}
            <div className="text-xs text-gray-500 mt-2">
              選択した種類でマーカーを描画できます
            </div>
          </CardContent>
        </Card>

        {/* Marker Details */}
        {selectedMarker && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">マーカー詳細</CardTitle>
              <Badge 
                variant="secondary"
                style={{ backgroundColor: markerTypes[selectedMarker.type].color + '20' }}
              >
                {markerTypes[selectedMarker.type].name}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="marker-text">説明</Label>
                <Input
                  id="marker-text"
                  value={selectedMarker.text}
                  onChange={(e) => updateSelectedMarker('text', e.target.value)}
                  placeholder="マーカーの説明を入力"
                />
              </div>
              
              {selectedMarker.type === 'pressure_sore' && (
                <div>
                  <Label htmlFor="stage">床ずれステージ</Label>
                  <select
                    id="stage"
                    value={selectedMarker.stage}
                    onChange={(e) => updateSelectedMarker('stage', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    {markerTypes.pressure_sore.stages.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <Label htmlFor="severity">重症度</Label>
                <select
                  id="severity"
                  value={selectedMarker.severity}
                  onChange={(e) => updateSelectedMarker('severity', e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="mild">軽度</option>
                  <option value="moderate">中等度</option>
                  <option value="severe">重度</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="notes">詳細メモ</Label>
                <Textarea
                  id="notes"
                  value={selectedMarker.notes}
                  onChange={(e) => updateSelectedMarker('notes', e.target.value)}
                  placeholder="詳細な情報を入力"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">使い方</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 space-y-2">
              <p>• マーカー種類を選択</p>
              <p>• 身体図上でドラッグして描画</p>
              <p>• マーカーをクリックして編集</p>
              <p>• 床ずれの好発部位は黄色で表示</p>
            </div>
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
              className="w-full border rounded cursor-crosshair"
              style={{ minHeight: '700px' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BodyChartTool
