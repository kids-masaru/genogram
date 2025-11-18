import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  Users, UserPlus, Heart, X, RotateCcw, Trash2, 
  Download, Square, Circle, Home, Baby 
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

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = Math.max(600, rect.width * 0.6)
      drawCanvas()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [people, relationships, households, selectedPeople])

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
      // 兄弟姉妹関係は、親子関係で自動的に描画されるため、ここでは処理しない
      // 必要であれば、特別な関係線（例：親密な関係）として追加可能
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

  // Canvas drawing
  const drawCanvas = () => {
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
      
      ctx.strokeStyle = '#000000' // 同居は実線で囲む (手書きサンプルに合わせる)
      ctx.setLineDash([]) // 実線
      ctx.lineWidth = 2
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY)
    })
    
    // Draw relationships (Marriage/Partnership, Parent-Child, Siblings)
    const drawnChildren = new Set()
    
    relationships.filter(r => r.type === 'marriage').forEach(rel => {
      const person1 = people.find(p => p.id === rel.person1)
      const person2 = people.find(p => p.id === rel.person2)
      if (!person1 || !person2) return
      
      // 婚姻線 (Marriage Line)
      ctx.strokeStyle = '#000000' // 黒線
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
      
      // 離婚線 (Divorce) - ユーザーの手書きサンプルにはないが、標準的な記号として残す
      if (rel.status === 'divorced') {
        ctx.strokeStyle = '#000000'
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
      
      ctx.fillStyle = person.isDeceased ? '#374151' : '#ffffff'
      ctx.strokeStyle = isSelected ? '#3b82f6' : '#6b7280'
      ctx.lineWidth = isSelected ? 3 : 2
      
      if (person.gender === 'male') {
        // Square for male
        // 手書き風の図形
        ctx.beginPath()
        ctx.moveTo(person.x - 20, person.y - 20)
        ctx.lineTo(person.x + 20, person.y - 20)
        ctx.lineTo(person.x + 20, person.y + 20)
        ctx.lineTo(person.x - 20, person.y + 20)
        ctx.closePath()
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
        // 手書き風の図形
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
        ctx.strokeStyle = '#000000' // 死亡は黒線
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
      ctx.fillStyle = '#374151'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      const displayText = person.name || (person.gender === 'male' ? '男性' : '女性')
      ctx.fillText(displayText, person.x, person.y + 35)
      if (person.age) {
        ctx.fillText(`(${person.age}歳)`, person.x, person.y + 50)
      }
    })
    
    // Draw selected person info
    if (selectedPerson) {
      // ... (省略)
    }
  }

  // Event handlers
  const getPersonAtPoint = (x, y) => {
    return people.find(person => {
      const dx = x - person.x
      const dy = y - person.y
      return dx * dx + dy * dy <= 20 * 20 // 半径20px以内
    })
  }

  const handleMouseDown = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const person = getPersonAtPoint(x, y)
    
    if (person) {
      setDraggedPerson(person)
      saveState()
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
    drawCanvas()
  }

  const handleMouseUp = () => {
    setDraggedPerson(null)
  }

  const handleClick = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    
    const person = getPersonAtPoint(x, y)
    
    if (person) {
      // 複数選択を可能にするロジック
      setSelectedPerson(person)
      setSelectedPeople(prev => {
        const newSet = new Set(prev)
        
        if (newSet.has(person.id)) {
          newSet.delete(person.id)
        } else {
          newSet.add(person.id)
        }
        
        // 選択が一つもない場合は、現在の人物を選択状態にする
        if (newSet.size === 0) {
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

  // ... (以下、省略) ...

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

  // ... (以下、省略) ...

  return (
    <div className="flex h-full">
      <div className="w-1/4 p-4 border-r space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ジェノグラム操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex space-x-2">
              <Button onClick={() => addPerson('male')} className="flex-1" variant="outline">
                <Square className="w-4 h-4 mr-2" /> 男性を追加
              </Button>
              <Button onClick={() => addPerson('female')} className="flex-1" variant="outline">
                <Circle className="w-4 h-4 mr-2" /> 女性を追加
              </Button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>選択中の人数: {selectedPeople.size}</Label>
              <Button 
                onClick={() => addRelationship('marriage')} 
                disabled={selectedPeople.size !== 2}
                className="w-full"
              >
                <Heart className="w-4 h-4 mr-2" /> 婚姻関係を追加
              </Button>
              <Button 
                onClick={() => addRelationship('child')} 
                disabled={selectedPeople.size < 3}
                className="w-full"
              >
                <Baby className="w-4 h-4 mr-2" /> 親子関係を追加 (親2人+子1人以上)
              </Button>
              <Button 
                onClick={addHousehold} 
                disabled={selectedPeople.size < 2}
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" /> 同居枠を追加
              </Button>
            </div>
            <Separator />
            <div className="flex space-x-2">
              <Button onClick={undo} className="flex-1" variant="outline">
                <RotateCcw className="w-4 h-4 mr-2" /> 元に戻す
              </Button>
              <Button onClick={deleteSelected} className="flex-1" variant="destructive" disabled={selectedPeople.size === 0}>
                <Trash2 className="w-4 h-4 mr-2" /> 削除
              </Button>
            </div>
            <Button onClick={downloadCanvas} className="w-full">
              <Download className="w-4 h-4 mr-2" /> PNGでダウンロード
            </Button>
          </CardContent>
        </Card>

        {selectedPerson && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">人物詳細 ({selectedPerson.id})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">名前</Label>
                <Input 
                  id="name" 
                  value={selectedPerson.name} 
                  onChange={(e) => updatePersonDetails('name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="age">年齢</Label>
                <Input 
                  id="age" 
                  type="number"
                  value={selectedPerson.age} 
                  onChange={(e) => updatePersonDetails('age', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">備考</Label>
                <Textarea 
                  id="notes" 
                  value={selectedPerson.notes} 
                  onChange={(e) => updatePersonDetails('notes', e.target.value)}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Button 
                  onClick={() => toggleStatus('isDeceased')} 
                  variant={selectedPerson.isDeceased ? 'default' : 'outline'}
                  className="w-full"
                >
                  {selectedPerson.isDeceased ? '死亡済み (解除)' : '死亡済み (設定)'}
                </Button>
                <Button 
                  onClick={() => toggleStatus('isCaregiver')} 
                  variant={selectedPerson.isCaregiver ? 'default' : 'outline'}
                  className="w-full"
                >
                  {selectedPerson.isCaregiver ? '主介護者 (解除)' : '主介護者 (設定)'}
                </Button>
                <Button 
                  onClick={() => toggleStatus('isKeyPerson')} 
                  variant={selectedPerson.isKeyPerson ? 'default' : 'outline'}
                  className="w-full"
                >
                  {selectedPerson.isKeyPerson ? 'キーパーソン (解除)' : 'キーパーソン (設定)'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="w-3/4 p-4">
        <div className="border rounded-lg shadow-lg overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
          />
        </div>
      </div>
    </div>
  )
}

export default GenogramTool
