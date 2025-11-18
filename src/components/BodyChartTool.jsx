import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  User, AlertCircle, Zap, Minus, MessageSquare, 
  Download, RotateCcw, Trash2, X, MousePointerSquare 
} from 'lucide-react'

// 床ずれの好発部位（座標）
const pressureSoreHotspots = [
  // 背面
  { x: 450, y: 140, r: 20, label: '肩甲骨' },
  { x: 450, y: 280, r: 25, label: '仙骨部' },
  { x: 450, y: 190, r: 15, label: '肘' },
  { x: 450, y: 550, r: 20, label: '踵骨部' },
  // 正面（側面）
  { x: 200, y: 450, r: 20, label: '大転子部' },
];

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

// 身体図の描画ロジックをコンポーネントの外（またはuseCallback）に
// （useCallbackにすると依存関係が複雑になるため、ここでは内部関数として定義）
const drawHumanOutline = (ctx, startX) => {
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.fillStyle = 'hsl(var(--card))'; // 背景色をCardの色に合わせる
  
  // 頭部
  ctx.beginPath();
  ctx.arc(startX, 80, 40, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  
  // 胴体
  ctx.beginPath();
  ctx.moveTo(startX - 50, 120);
  ctx.lineTo(startX + 50, 120);
  ctx.lineTo(startX + 50, 320);
  ctx.lineTo(startX - 50, 320);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // 腕
  ctx.beginPath();
  ctx.moveTo(startX - 50, 130);
  ctx.lineTo(startX - 80, 130);
  ctx.lineTo(startX - 80, 280);
  ctx.lineTo(startX - 50, 280);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(startX + 50, 130);
  ctx.lineTo(startX + 80, 130);
  ctx.lineTo(startX + 80, 280);
  ctx.lineTo(startX + 50, 280);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // 脚
  ctx.beginPath();
  ctx.moveTo(startX - 40, 320);
  ctx.lineTo(startX - 10, 320);
  ctx.lineTo(startX - 10, 470);
  ctx.lineTo(startX - 40, 470);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startX + 10, 320);
  ctx.lineTo(startX + 40, 320);
  ctx.lineTo(startX + 40, 470);
  ctx.lineTo(startX + 10, 470);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
};


const BodyChartTool = () => {
  const canvasRef = useRef(null)
  const [selectedMarker, setSelectedMarker] = useState(null)
  const [markers, setMarkers] = useState([])
  const [currentMarkerType, setCurrentMarkerType] = useState('pressure_sore')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [history, setHistory] = useState([])

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
  // useCallback を使い、依存関係を明確化
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // キャンバス幅に基づいて中央配置
    const centerX = canvas.width / 2;
    const frontX = Math.max(150, centerX - 150);
    const backX = Math.min(canvas.width - 150, centerX + 150);
    
    // 身体図のスケールや位置を調整
    // (ここでは簡易的にX座標のみ調整)

    // Draw front view
    drawHumanOutline(ctx, frontX);
    
    // Draw back view
    drawHumanOutline(ctx, backX);
    
    // ラベルの追加
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'hsl(var(--foreground))' // テキスト色をテーマに合わせる
    ctx.fillText('(正面)', frontX, 50)
    ctx.fillText('(背面)', backX, 50)
    
    // 床ずれ好発部位をハイライト
    ctx.fillStyle = '#fefce8'; // 黄色（薄め）
    ctx.strokeStyle = '#facc15'; // 黄色（濃いめ）
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    pressureSoreHotspots.forEach(spot => {
      // 座標を背面図(backX)基準で動的に調整
      const dynamicX = backX + (spot.x - 450); 
      ctx.beginPath();
      ctx.arc(dynamicX, spot.y, spot.r, 0, 2 * Math.PI); 
      ctx.fill();
      ctx.stroke();
    });
    ctx.setLineDash([]);

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
      if (!markerType) return; // 不明なマーカータイプはスキップ

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
          ctx.closePath(); // パスを閉じる
          ctx.fill()
        }
      } else if (marker.x && marker.y) {
        // Draw point marker (以前のロジック、念のため残す)
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
  }, [markers, selectedMarker, currentPath, currentMarkerType]);

  // Canvasの描画は、依存関係が変更されたときにuseEffectで実行
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Canvasのリサイズロジック (マウント時に1回だけ実行)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0) return;
      
      // コンテナの幅に合わせてキャンバスの幅を設定
      canvas.width = rect.width;
      // 高さは固定
      canvas.height = 700;
      
      drawCanvas(); // リサイズ後に再描画
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    
    resizeCanvas(); // 初回描画
    
    return () => resizeObserver.unobserve(container);
    // drawCanvasを依存配列から削除し、マウント時のみ実行
    // drawCanvasはresizeObserverコールバック内で最新のものが呼ばれる
  }, [drawCanvas]); // drawCanvas が変更されたらリサイズロジックも更新


  // Mouse events
  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Check if clicking on existing marker
    const clickedMarker = markers.find(marker => {
      if (marker.path && marker.path.length > 0) {
        // パスの近くをクリックしたか簡易判定
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
    if (!canvas) return;
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
    if (!canvas) return;
    const link = document.createElement('a')
    link.download = 'body_chart.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  // Clear all
  const clearAll = () => {
    // 将来的にカスタムアラートダイアログ（shadcn/ui）に置き換えることを推奨
    if (window.confirm('すべてのマーカーを削除しますか？')) {
      saveState()
      setMarkers([])
      setSelectedMarker(null)
    }
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
                選択削除
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              マーカー数: <span className="font-bold">{markers.length}</span> 個
            </div>
          </CardContent>
        </Card>

        {/* Marker Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">マーカー種類</CardTitle>
          </CardHeader>
          {/* ↓↓↓ (修正点) flex flex-col gap-2 で余白を統一 */}
          <CardContent className="flex flex-col gap-2">
            {Object.entries(markerTypes).map(([key, type]) => {
              const IconComponent = type.icon
              return (
                <Button
                  key={key}
                  variant={currentMarkerType === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentMarkerType(key)}
                  className="w-full justify-start text-sm"
                  style={{
                    backgroundColor: currentMarkerType === key ? type.color : undefined,
                    borderColor: type.color,
                    color: currentMarkerType === key ? 'white' : type.color,
                    opacity: currentMarkerType === key ? 1 : 0.7 // 非選択時を少し薄く
                  }}
                >
                  <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                  {type.name}
                </Button>
              )
            })}
            <div className="text-xs text-muted-foreground pt-2">
              選択した種類でマーカーを描画できます
            </div>
          </CardContent>
        </Card>

        {/* Marker Details */}
        {/* ↓↓↓ (修正点) レイアウトシフトを防ぐため、常にCardを表示 */}
        <Card className="transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg">マーカー詳細</CardTitle>
            {selectedMarker && markerTypes[selectedMarker.type] ? (
                <Badge 
                  variant="secondary"
                  style={{ 
                    backgroundColor: markerTypes[selectedMarker.type].color + '20',
                    color: markerTypes[selectedMarker.type].color
                  }}
                  className="border"
                  // ↓↓↓ (修正点) Badgeの幅がテキストによって変わらないように
                  style={{ minWidth: '80px', textAlign: 'center' }} 
                >
                  {markerTypes[selectedMarker.type].name}
                </Badge>
              ) : (
                <Badge variant="outline" style={{ minWidth: '80px', textAlign: 'center' }}>
                  未選択
                </Badge>
              )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedMarker ? (
              // ↓↓↓ (修正点) マーカー未選択時のプレースホルダー
              <div className="text-sm text-muted-foreground text-center py-10 space-y-2">
                <MousePointerSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p>マーカーを選択するか、</p>
                <p>新規に描画すると</p>
                <p>詳細を編集できます。</p>
              </div>
            ) : (
              // マーカー選択時の編集欄
              <>
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
                      className="w-full p-2 border rounded-md bg-transparent" // (修正点) 背景を透過
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
                    className="w-full p-2 border rounded-md bg-transparent" // (修正点) 背景を透過
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">使い方</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>マーカー種類を選択</li>
              <li>身体図上でドラッグして描画</li>
              <li>描画したマーカーをクリックして編集</li>
              <li>床ずれの好発部位は薄黄色で表示</li>
            </ul>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">保存・操作</CardTitle>
          </CardHeader>
          {/* ↓↓↓ (修正点) flex flex-col gap-2 で余白を統一 */}
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
        {/* ↓↓↓ (修正点) キャンバスの高さを固定(700px) + 余白(32px) = 732px */}
        <Card className="h-full min-h-[732px]">
          {/* ↓↓↓ (修正点) p-4 でキャンバスの周囲に余白, h-full */}
          <CardContent className="p-4 h-full flex justify-center items-center">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onContextMenu={(e) => e.preventDefault()} // 右クリックメニューを無効化
              className="border rounded-md cursor-crosshair bg-background"
              // (修正点) widthとheightはJS(useEffect)によって設定される
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BodyChartTool
