import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  Users, UserPlus, Heart, X, RotateCcw, Trash2, 
  Download, Square, Circle, Home, Baby, MousePointerSquare
} from 'lucide-react'

const GenogramTool = () => {
  const canvasRef = useRef(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [people, setPeople] = useState([])
  const [relationships, setRelationships] = useState([])
  const [households, setHouseholds] = useState([])
  const [selectedPeople, setSelectedPeople] = useState(new Set())
  const [draggedPerson, setDraggedPerson] = useState(null)
  const [history, setHistory] = useState([])
  const [nextId, setNextId] = useState(1)

  // Save state for undo
  const saveState = () => {
    const state = {
      people: [...people],
      relationships: [...relationships],
      households: [...households]
    }
    setHistory(prev => [...prev.slice(-9), state])
  }

  // Undo function
  const undo = () => {
    if (history.length === 0) return
    const lastState = history[history.length - 1]
    setPeople(lastState.people)
    setRelationships(lastState.relationships)
    setHouseholds(lastState.households)
    setHistory(prev => prev.slice(0, -1))
    setSelectedPeople(new Set())
    setSelectedPerson(null)
  }

  // Add person
  const addPerson = (gender) => {
    saveState()
    const newPerson = {
      id: nextId,
      gender,
      name: '',
      age: '',
      notes: '',
      x: 300 + Math.random() * 200,
      y: 200 + Math.random() * 200,
      isDeceased: false,
      isCaregiver: false,
      isKeyPerson: false
    }
    setPeople(prev => [...prev, newPerson])
    setNextId(prev => prev + 1)
  }

  // Add relationship
  const addRelationship = (type) => {
    if (selectedPeople.size < 2) return
    
    saveState()
    const personIds = Array.from(selectedPeople)
    
    if (type === 'marriage' && personIds.length === 2) {
      const newRel = {
        id: Date.now(),
        type: 'marriage',
        person1: personIds[0],
        person2: personIds[1],
        status: 'married'
      }
      setRelationships(prev => [...prev, newRel])
    } else if (type === 'child' && personIds.length >= 3) {
      // Parent-child relationship: 最初の2人が親、残りが子
      const parents = personIds.slice(0, 2)
      const children = personIds.slice(2)
      
      children.forEach(childId => {
        const newRel = {
          id: Date.now() + childId,
          type: 'child',
          parents,
          child: childId
        }
        setRelationships(prev => [...prev, newRel])
      })
    } else if (type === 'siblings' && personIds.length >= 2) {
      // (省略)
    }
    
    setSelectedPeople(new Set())
  }

  // Add household
  const addHousehold = () => {
    if (selectedPeople.size < 2) return
    
    saveState()
    const newHousehold = {
      id: Date.now(),
      members: Array.from(selectedPeople)
    }
    setHouseholds(prev => [...prev, newHousehold])
    setSelectedPeople(new Set())
  }

  // Delete selected
  const deleteSelected = () => {
    if (selectedPeople.size === 0) return
    
    saveState()
    const selectedIds = Array.from(selectedPeople)
    
    setPeople(prev => prev.filter(p => !selectedIds.includes(p.id)))
    setRelationships(prev => prev.filter(r => {
      if (r.type === 'marriage') {
        return !selectedIds.includes(r.person1) && !selectedIds.includes(r.person2)
      } else if (r.type === 'child') {
        return !selectedIds.includes(r.child) && !r.parents.some(p => selectedIds.includes(p))
      }
      return true
    }))
    setHouseholds(prev => prev.filter(h => 
      !h.members.some(m => selectedIds.includes(m))
    ))
    
    setSelectedPeople(new Set())
    setSelectedPerson(null)
  }

  // Canvas drawing (useCallbackで最適化)
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw households (background)
    households.forEach(household => {
      const members = people.filter(p => household.members.includes(p.id))
      if (members.length < 2) return
      
      const minX = Math.min(...members.map(m => m.x)) - 30
      const maxX = Math.max(...members.map(m => m.x)) + 30
      const minY = Math.min(...members.map(m => m.y)) - 30
      const maxY = Math.max(...members.map(m => m.y)) + 30
      
      ctx.strokeStyle = 'hsl(var(--foreground))' // テーマに合わせる
      ctx.setLineDash([]) // 実線
      ctx.lineWidth = 2
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
    })
    
    // Draw relationships
    const drawnChildren = new Set()
    
    relationships.filter(r => r.type === 'marriage').forEach(rel => {
      const person1 = people.find(p => p.id === rel.person1)
      const person2 = people.find(p => p.id === rel.person2)
      if (!person1 || !person2) return
      
      // 婚姻線 (Marriage Line)
      ctx.strokeStyle = 'hsl(var(--foreground))'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(person1.x, person1.y - 20) // 図形の上端から
      ctx.lineTo(person2.x, person2.y - 20) // 図形の上端まで
      ctx.stroke()
      
      // 婚姻線の中点
      const midX = (person1.x + person2.x) / 2
      const midY = person1.y - 20
      
      // 子どもへの線 (Parent-Child Line)
      const children = people.filter(p => 
        relationships.some(r => 
          r.type === 'child' && 
          r.parents.includes(person1.id) && 
          r.parents.includes(person2.id) && 
          r.child === p.id
        )
      ).sort((a, b) => a.x - b.x) // X座標でソートして兄弟順を決定
      
      if (children.length > 0) {
        // 兄弟姉妹線の中点
        const minChildX = children[0].x
        const maxChildX = children[children.length - 1].x
        const childY = Math.max(...children.map(c => c.y)) - 40 // 子どもの図形の上端から40px上
        
        // 婚姻線から兄弟姉妹線へ垂線を引く
        ctx.beginPath()
        ctx.moveTo(midX, midY)
        ctx.lineTo(midX, childY)
        ctx.stroke()
        
        // 兄弟姉妹線 (Sibling Line)
        ctx.beginPath()
        ctx.moveTo(minChildX, childY)
        ctx.lineTo(maxChildX, childY)
        ctx.stroke()
        
        // 兄弟姉妹線から子どもへ垂線を引く
        children.forEach(child => {
          ctx.beginPath()
          ctx.moveTo(child.x, childY)
          ctx.lineTo(child.x, child.y - 20) // 子どもの図形の上端まで
          ctx.stroke()
          drawnChildren.add(child.id)
        })
      }
      
      // 離婚線 (Divorce)
      if (rel.status === 'divorced') {
        ctx.strokeStyle = 'hsl(var(--foreground))'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(midX - 10, midY - 10)
        ctx.lineTo(midX + 10, midY + 10)
        ctx.moveTo(midX - 10, midY + 10)
        ctx.lineTo(midX + 10, midY - 10)
        ctx.stroke()
      }
    })
    
    // Draw people
    people.forEach(person => {
      const isSelected = selectedPeople.has(person.id)
      
      ctx.fillStyle = 'hsl(var(--card))' // テーマに合わせる
      ctx.strokeStyle = isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'
      ctx.lineWidth = isSelected ? 3 : 2
      
      if (person.gender === 'male') {
        // Square for male
        ctx.beginPath()
        ctx.rect(person.x - 20, person.y - 20, 40, 40)
        ctx.fill()
        ctx.stroke()
        
        if (person.isKeyPerson) {
          ctx.strokeStyle = '#dc2626'
          ctx.lineWidth = 4
          ctx.strokeRect(person.x - 22, person.y - 22, 44, 44)
        }
      } else {
        // Circle for female
        ctx.beginPath()
        ctx.arc(person.x, person.y, 20, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        if (person.isKeyPerson) {
          ctx.strokeStyle = '#dc2626'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.arc(person.x, person.y, 22, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }
      
      // Draw deceased X
      if (person.isDeceased) {
        ctx.strokeStyle = 'hsl(var(--foreground))'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(person.x - 15, person.y - 15)
        ctx.lineTo(person.x + 15, person.y + 15)
        ctx.moveTo(person.x - 15, person.y + 15)
        ctx.lineTo(person.x + 15, person.y - 15)
        ctx.stroke()
      }
      
      // Draw caregiver indicator
      if (person.isCaregiver) {
        ctx.fillStyle = '#06b6d4'
        ctx.beginPath()
        ctx.arc(person.x + 15, person.y - 15, 5, 0, 2 * Math.PI)
        ctx.fill()
      }
      
      // Draw name and age
      ctx.fillStyle = 'hsl(var(--foreground))' // テーマに合わせる
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      const displayText = person.name || (person.gender === 'male' ? '男性' : '女性')
      ctx.fillText(displayText, person.x, person.y + 35)
      if (person.age) {
        ctx.fillText(`(${person.age}歳)`, person.x, person.y + 50)
      }
    })
  }, [people, relationships, households, selectedPeople]) // 依存配列

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
      canvas.height = rect.height // コンテナの高さに合わせる
      
      drawCanvas() // リサイズ後に再描画
    }

    const resizeObserver = new ResizeObserver(resizeCanvas)
    resizeObserver.observe(container)
    
    resizeCanvas() // 初回描画
    
    return () => resizeObserver.unobserve(container)
  }, [drawCanvas]) // drawCanvas が変更されたらリサイズロジックも更新


  // Event handlers
  const getPersonAtPoint = (x, y) => {
    // 逆順で検索して、上に描画されている人を優先的に選択
    for (let i = people.length - 1; i >= 0; i--) {
      const person = people[i];
      const dx = x - person.x;
      const dy = y - person.y;
      if (dx * dx + dy * dy <= 20 * 20) { // 半径20px以内
        return person;
      }
    }
    return null;
  }

  const handleMouseDown = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const person = getPersonAtPoint(x, y)
    
    if (person) {
      setDraggedPerson(person)
      // saveState() // MouseUpで保存
    }
  }

  const handleMouseMove = (event) => {
    if (!draggedPerson) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    setPeople(prev => prev.map(p => 
      p.id === draggedPerson.id ? { ...p, x, y } : p
    ))
    // マウスムーブ中は state のみ更新（再描画は useEffect[drawCanvas] が行う）
  }

  const handleMouseUp = (event) => {
    if (draggedPerson) {
      saveState() // ドラッグ完了時に履歴を保存
    }
    setDraggedPerson(null)
  }

  const handleClick = (event) => {
    // ドラッグ中はクリック処理を無効にする
    if (event.detail > 1 || draggedPerson) {
      // (event.detail > 1 はダブルクリックなどを防ぐ)
      // (draggedPerson はドラッグ後の MouseUp と Click の競合を防ぐ)
       return
    }

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const person = getPersonAtPoint(x, y)
    
    if (person) {
      // 複数選択を可能にするロジック
      setSelectedPerson(person) // 最後にクリックした人を詳細表示対象にする
      setSelectedPeople(prev => {
        const newSet = new Set(prev)
        
        if (event.shiftKey) { // Shiftキーを押しながらクリックで複数選択/解除
          if (newSet.has(person.id)) {
            newSet.delete(person.id)
          } else {
            newSet.add(person.id)
          }
        } else { // Shiftキーなしの場合は、その人だけを選択
          newSet.clear()
          newSet.add(person.id)
        }
        
        return newSet
      })
    } else {
      // 人物がクリックされなかった場合、すべての選択を解除
      setSelectedPerson(null)
      setSelectedPeople(new Set())
    }
  }


  // Download as PNG
  const downloadCanvas = () => {
    const canvas = canvasRef.current
    const dataURL = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataURL
    a.download = 'genogram.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Update person details
  const updatePersonDetails = (field, value) => {
    if (!selectedPerson) return
    
    saveState()
    setPeople(prev => prev.map(p => 
      p.id === selectedPerson.id ? { ...p, [field]: value } : p
    ))
    setSelectedPerson(prev => ({ ...prev, [field]: value }))
  }

  // Toggle status
  const toggleStatus = (field) => {
    if (!selectedPerson) return
    
    saveState()
    setPeople(prev => prev.map(p => 
      p.id === selectedPerson.id ? { ...p, [field]: !p[field] } : p
    ))
    setSelectedPerson(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    // ↓↓↓ (修正点 1) 他のツールとレイアウトを統一 (grid, gap-6)
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Control Panel */}
      {/* ↓↓↓ (修正点 2) sticky, top-24 を追加して追従、space-y-6 でカード間の余白を増やす */}
      <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 h-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              ジェノグラム操作
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* ↓↓↓ (修正点 3) ボタンを2列グリッドにし、隙間(gap-2)を確保 */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => addPerson('male')} className="flex-1" variant="outline" size="sm">
                <Square className="w-4 h-4 mr-2" /> 男性を追加
              </Button>
              <Button onClick={() => addPerson('female')} className="flex-1" variant="outline" size="sm">
                <Circle className="w-4 h-4 mr-2" /> 女性を追加
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">
                選択中の人数: <span className="font-bold text-foreground">{selectedPeople.size}</span>
              </Label>
              <Button 
                onClick={() => addRelationship('marriage')} 
                disabled={selectedPeople.size !== 2}
                className="w-full"
                size="sm"
              >
                <Heart className="w-4 h-4 mr-2" /> 婚姻関係 (2人)
              </Button>
              <Button 
                onClick={() => addRelationship('child')} 
                disabled={selectedPeople.size < 3}
                className="w-full"
                size="sm"
              >
                <Baby className="w-4 h-4 mr-2" /> 親子関係 (親2人+子)
              </Button>
              <Button 
                onClick={addHousehold} 
                disabled={selectedPeople.size < 2}
                className="w-full"
                size="sm"
              >
                <Home className="w-4 h-4 mr-2" /> 同居枠 (2人以上)
              </Button>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={undo} className="flex-1" variant="outline" size="sm" disabled={history.length === 0}>
                <RotateCcw className="w-4 h-4 mr-2" /> 元に戻す
              </Button>
              <Button onClick={deleteSelected} className="flex-1" variant="destructive" size="sm" disabled={selectedPeople.size === 0}>
                <Trash2 className="w-4 h-4 mr-2" /> 選択削除
              </Button>
            </div>
            
            <Button onClick={downloadCanvas} className="w-full">
              <Download className="w-4 h-4 mr-2" /> PNGでダウンロード
            </Button>
          </CardContent>
        </Card>

        {/* Person Details */}
        {/* ↓↓↓ (修正点 4) レイアウトシフトを防ぐため、常にCardを表示 */}
        <Card className="transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-lg">人物詳細</CardTitle>
            <Badge 
              variant={selectedPerson ? "secondary" : "outline"}
              style={{ minWidth: '80px', textAlign: 'center' }}
            >
              {selectedPerson ? `ID: ${selectedPerson.id}` : '未選択'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedPerson ? (
              // マーカー未選択時のプレースホルダー
              <div className="text-sm text-muted-foreground text-center py-10 space-y-2">
                <MousePointerSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p>キャンバス上の人物をクリックすると</p>
                <p>詳細を編集できます。</p>
              </div>
            ) : (
              // マーカー選択時の編集欄
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">名前</Label>
                  <Input 
                    id="name" 
                    value={selectedPerson.name} 
                    onChange={(e) => updatePersonDetails('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">年齢</Label>
                  <Input 
                    id="age" 
                    type="number"
                    value={selectedPerson.age} 
                    onChange={(e) => updatePersonDetails('age', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">備考</Label>
                  <Textarea 
                    id="notes" 
                    value={selectedPerson.notes} 
                    onChange={(e) => updatePersonDetails('notes', e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => toggleStatus('isDeceased')} 
                    variant={selectedPerson.isDeceased ? 'destructive' : 'outline'}
                    className="w-full"
                    size="sm"
                  >
                    {selectedPerson.isDeceased ? '死亡済み (解除)' : '死亡済み (設定)'}
                  </Button>
                  <Button 
                    onClick={() => toggleStatus('isCaregiver')} 
                    variant={selectedPerson.isCaregiver ? 'default' : 'outline'}
                    className="w-full"
                    size="sm"
                  >
                    {selectedPerson.isCaregiver ? '主介護者 (解除)' : '主介護者 (設定)'}
                  </Button>
                  <Button 
                    onClick={() => toggleStatus('isKeyPerson')} 
                    variant={selectedPerson.isKeyPerson ? 'default' : 'outline'}
                    className="w-full"
                    size="sm"
                  >
                    {selectedPerson.isKeyPerson ? 'キーパーソン (解除)' : 'キーパーソン (設定)'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Canvas Area */}
      {/* ↓↓↓ (修正点 5) 他のツールとレイアウトを統一 (lg:col-span-3, Card, CardContent) */}
      <div className="lg:col-span-3">
        <Card className="h-full min-h-[732px]">
          <CardContent className="p-4 h-full">
            <div className="w-full h-full border rounded-md overflow-hidden bg-background">
              <canvas 
                ref={canvasRef} 
                className="w-full h-full" // w-full h-full に
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onClick={handleClick}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default GenogramTool
